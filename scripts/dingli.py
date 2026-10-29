# -*- coding: utf-8 -*-
import os
import sys
import re
import csv
import glob
import json
import shutil
import asyncio
import datetime
import subprocess
import unicodedata
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    import boto3
    from botocore.config import Config
except ImportError:
    print("[ERRO] Biblioteca boto3 não encontrada. Instale com: pip install boto3")
    sys.exit(1)

try:
    import edge_tts
except ImportError:
    print("[ERRO] Biblioteca edge-tts não encontrada. Instale com: pip install edge-tts")
    sys.exit(1)

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# ------------------------------------------------------------------------------
# CONFIGURAÇÃO DE AMBIENTE (.env.local)
# ------------------------------------------------------------------------------
caminho_env = os.path.abspath(".env.local")
if not os.path.exists(caminho_env):
    raise FileNotFoundError("Arquivo .env.local não encontrado na raiz.")

env = {}
with open(caminho_env, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            # Remove espaços e aspas simples ou duplas ao redor do valor
            env[k.strip()] = v.strip().strip("'\"")

SUPABASE_URL = (env.get("SUPABASE_URL") or env.get("VITE_SUPABASE_URL") or "").rstrip("/")
SUPABASE_KEY = env.get("SUPABASE_SECRET_KEY")

R2_ENDPOINT = (
    env.get("R2_ENDPOINT_S3") or 
    env.get("R2_ENDPOINT_URL") or 
    env.get("CLOUDFLARE_R2_ENDPOINT") or 
    env.get("R2_ENDPOINT")
)
R2_KEY_ID = env.get("R2_ACCESS_KEY_ID") or env.get("CLOUDFLARE_R2_ACCESS_KEY_ID") or env.get("AWS_ACCESS_KEY_ID")
R2_SECRET = env.get("R2_SECRET_ACCESS_KEY") or env.get("CLOUDFLARE_R2_SECRET_ACCESS_KEY") or env.get("AWS_SECRET_ACCESS_KEY")
R2_BUCKET = env.get("R2_BUCKET") or env.get("R2_BUCKET_NAME") or "dingli-audios"

FFMPEG_EXE = os.path.abspath("ffmpeg.exe")
CSV_SENTENCES = "supabase_sentences.csv"

# ------------------------------------------------------------------------------
# TABELAS DE VOZES OFICIAIS (SEÇÃO 6.1 DO DINGLI_MASTER.md)
# ------------------------------------------------------------------------------
VOZES_FRASES = {
    "en": [
        ("v1", "en-US-SteffanNeural"), ("v2", "en-IE-ConnorNeural"),
        ("v3", "en-CA-LiamNeural"), ("v4", "en-US-JennyNeural"),
        ("v5", "en-GB-LibbyNeural"), ("v6", "en-CA-ClaraNeural")
    ],
    "es": [
        ("v1", "es-AR-TomasNeural"), ("v2", "es-MX-JorgeNeural"),
        ("v3", "es-MX-DaliaNeural"), ("v4", "es-ES-AlvaroNeural"),
        ("v5", "es-ES-ElviraNeural"), ("v6", "es-US-AlonsoNeural")
    ],
    "fr": [
        ("v1", "fr-FR-DeniseNeural"), ("v2", "fr-FR-HenriNeural"),
        ("v3", "fr-FR-VivienneMultilingualNeural"), ("v4", "fr-FR-RemyMultilingualNeural")
    ],
    "it": [
        ("v1", "it-IT-GiuseppeMultilingualNeural"), ("v2", "it-IT-DiegoNeural"),
        ("v3", "it-IT-IsabellaNeural"), ("v4", "it-IT-ElsaNeural")
    ],
    "pt": [
        ("v1", "pt-BR-AntonioNeural"), ("v2", "pt-BR-ThalitaMultilingualNeural"),
        ("v3", "ko-KR-HyunsuMultilingualNeural"), ("v4", "en-US-AvaMultilingualNeural")
    ],
    "ge": [
        ("v1", "de-AT-JonasNeural"), ("v2", "de-DE-FlorianMultilingualNeural"),
        ("v3", "de-DE-SeraphinaMultilingualNeural"), ("v4", "de-DE-KatjaNeural")
    ],
    "zh": [
        ("v1", "zh-CN-XiaoxiaoNeural"), ("v2", "zh-CN-YunxiNeural"),
        ("v3", "zh-CN-YunjianNeural"), ("v4", "zh-CN-XiaoyiNeural")
    ]
}

VOZES_VOCABULARIO = {
    "en": "en-CA-ClaraNeural",
    "es": "es-MX-DaliaNeural",
    "fr": "fr-FR-DeniseNeural",
    "ge": "de-DE-KatjaNeural",
    "it": "it-IT-IsabellaNeural",
    "pt": "pt-BR-FranciscaNeural",
    "zh": "zh-CN-XiaoxiaoNeural"
}

# ------------------------------------------------------------------------------
# FUNÇÕES UTILITÁRIAS
# ------------------------------------------------------------------------------
def get_r2_client():
    if not R2_ENDPOINT or not R2_KEY_ID or not R2_SECRET:
        raise ValueError("Credenciais R2 incompletas no .env.local (R2_ENDPOINT_URL, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY).")
    return boto3.client(
        "s3",
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=R2_KEY_ID,
        aws_secret_access_key=R2_SECRET,
        region_name="auto",
        config=Config(signature_version="s3v4")
    )

def sanitizar_palavra_audio(palavra):
    p = (palavra or "").strip().lower().replace("ß", "ss")
    sem_pontuacao = re.sub(r'[.,!?;:¿¡"“”`{}()[\]\-—…，。！？；：、«»/\\~*]', '', p)
    sem_pontuacao = re.sub(r"['’]", "_", sem_pontuacao)
    if not sem_pontuacao:
        return ""

    nfd = unicodedata.normalize("NFD", sem_pontuacao)
    mapa_diacriticos = {
        "\u0300": "grave", "\u0301": "acute", "\u0302": "circ", "\u0303": "tilde",
        "\u0308": "uml", "\u0327": "ced", "\u0304": "macron", "\u030c": "caron"
    }

    base_chars, marcas = [], []
    ultimo_char_base = ""
    for char in nfd:
        if char in mapa_diacriticos:
            marcas.append(f"{ultimo_char_base}_{mapa_diacriticos[char]}")
        else:
            if not ("\u0300" <= char <= "\u036f"):
                base_chars.append(char)
                ultimo_char_base = char

    slug_base = re.sub(r"[^a-zA-Z0-9_-]", "", "".join(base_chars))
    if marcas:
        return f"{slug_base}_{'_'.join(marcas)}"
    return slug_base

def obter_ultimo_backup():
    backups = sorted(glob.glob("backups/sentences_backup_*.csv") + glob.glob("backups/sentences_v*.csv"))
    if not backups:
        raise FileNotFoundError("Nenhum backup localizado em backups/. Execute 'python scripts/dingli.py backup' primeiro.")
    return backups[-1]

def obter_versao_atual_supabase(idioma):
    url_v = f"{SUPABASE_URL}/rest/v1/curso_revisoes?idioma=eq.{idioma}&select=versao&order=versao.desc&limit=1"
    req_v = urllib.request.Request(url_v, headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"})
    try:
        with urllib.request.urlopen(req_v, timeout=15) as resp:
            dados = json.loads(resp.read().decode("utf-8"))
            return dados[0]["versao"] if dados else 0
    except Exception as e:
        print(f"⚠ Aviso ao consultar versão no Supabase: {e}")
        return 0

# ------------------------------------------------------------------------------
# FLUXO F1 (TEXTO ALTERADO)
# ------------------------------------------------------------------------------
def cmd_backup():
    print("=" * 70)
    print(" DÌNGLÌ - FLUXO F1: BACKUP DE SEGURANÇA (SUPABASE DB)")
    print("=" * 70)
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("SUPABASE_URL ou SUPABASE_SECRET_KEY ausentes no .env.local.")

    os.makedirs("backups", exist_ok=True)
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    caminho_backup = os.path.join("backups", f"sentences_backup_{timestamp}.csv")

    headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Accept": "application/json"}
    dados_banco = []
    offset = 0
    limite = 1000

    print("Baixando 1.200 sentenças completas da tabela sentences...")
    while True:
        url_lote = f"{SUPABASE_URL}/rest/v1/sentences?select=*&order=id.asc&limit={limite}&offset={offset}"
        req = urllib.request.Request(url_lote, headers=headers)
        with urllib.request.urlopen(req, timeout=30) as resp:
            lote = json.loads(resp.read().decode("utf-8"))
        if not lote:
            break
        dados_banco.extend(lote)
        if len(lote) < limite:
            break
        offset += limite

    assert len(dados_banco) == 1200, f"Erro: Supabase retornou {len(dados_banco)} frases (esperado: 1200)!"

    colunas_db = ["id", "ge", "en", "es", "fr", "it", "pt", "zh", "pi"]
    with open(caminho_backup, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=colunas_db)
        writer.writeheader()
        for row in dados_banco:
            writer.writerow({c: row.get(c, "") for c in colunas_db})

    print(f"\n✔ 1. Backup gerado com sucesso: {caminho_backup} (1.200 frases paginadas)")
    print("-" * 70)
    print("[PRÓXIMO PASSO]")
    print("Cole a confirmação no chat para a IA. Analise a tabela comparativa")
    print("e, após aprovação das alterações, execute:")
    print("  python scripts/dingli.py patch <arquivo_patch.json>")
    print("-" * 70)

def cmd_patch(patch_file):
    print("=" * 70)
    print(" DÌNGLÌ - FLUXO F1: APLICAÇÃO DE PATCH LOCAL")
    print(f" Arquivo de patch: {patch_file}")
    print("=" * 70)

    if not os.path.exists(patch_file):
        raise FileNotFoundError(f"Arquivo de patch não encontrado: {patch_file}")

    with open(patch_file, "r", encoding="utf-8") as f:
        alteracoes = json.load(f)

    linhas_csv = []
    fieldnames_originais = []
    with open(CSV_SENTENCES, "r", encoding="utf-8-sig", errors="ignore") as f:
        reader = csv.DictReader(f)
        fieldnames_originais = reader.fieldnames
        for r in reader:
            fid = str(r.get("id"))
            if fid in alteracoes:
                for col, val in alteracoes[fid].items():
                    r[col] = val
            linhas_csv.append(r)

    assert len(linhas_csv) == 1200, f"Erro: Esperado 1200 frases no CSV, encontrado {len(linhas_csv)}!"

    with open(CSV_SENTENCES, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames_originais)
        writer.writeheader()
        writer.writerows(linhas_csv)

    print(f"\n✔ Patch aplicado com sucesso: {len(alteracoes)} sentenças modificadas no CSV local!")
    print("-" * 70)
    print("[PRÓXIMO PASSO]")
    print("Execute a síntese e upload das frases alteradas para o Cloudflare R2:")
    print("  python scripts/dingli.py frases-f1 <idioma>")
    print("-" * 70)

def cmd_frases_f1(idioma):
    idioma = idioma.lower()
    if idioma not in VOZES_FRASES:
        print(f"[ERRO] Idioma inválido: {list(VOZES_FRASES.keys())}")
        sys.exit(1)

    ultimo_backup = obter_ultimo_backup()
    print("=" * 70)
    print(f" DÌNGLÌ - FLUXO F1: SÍNTESE E UPLOAD DE FRASES ALTERADAS ({idioma.upper()})")
    print(f" Backup de referência: {ultimo_backup}")
    print("=" * 70)

    db_data = {int(r["id"]): r for r in csv.DictReader(open(ultimo_backup, encoding="utf-8-sig", errors="ignore")) if r.get("id", "").isdigit()}
    csv_data = {int(r["id"]): r for r in csv.DictReader(open(CSV_SENTENCES, encoding="utf-8-sig", errors="ignore")) if r.get("id", "").isdigit()}

    alteracoes = {}
    for fid, r_csv in sorted(csv_data.items()):
        r_db = db_data.get(fid, {})
        txt_csv = (r_csv.get(idioma) or "").strip()
        txt_db = (r_db.get(idioma) or "").strip()
        if txt_csv and txt_csv != txt_db:
            alteracoes[fid] = txt_csv

    if not alteracoes:
        print(f"✔ Nenhuma alteração textual detectada para [{idioma.upper()}]. Frases 100% sincronizadas!")
        return

    print(f"Frases com alteração de texto: {len(alteracoes)} IDs ({len(alteracoes) * len(VOZES_FRASES[idioma])} áudios)")

    pasta_frases = os.path.join("audios_dingli", idioma)
    pasta_quar = os.path.join("audios_dingli", "quarentena_frases", idioma)
    os.makedirs(pasta_frases, exist_ok=True)
    os.makedirs(pasta_quar, exist_ok=True)

    # 1. Quarentena local
    movidos = 0
    for fid in alteracoes.keys():
        for tag_voz, _ in VOZES_FRASES[idioma]:
            arq = f"{fid}_{tag_voz}.mp3"
            origem = os.path.join(pasta_frases, arq)
            if os.path.exists(origem):
                shutil.move(origem, os.path.join(pasta_quar, arq))
                movidos += 1
    print(f"✔ Quarentena local: {movidos} áudios antigos movidos para {pasta_quar}")

    # 2. Síntese Edge-TTS
    print("Sintetizando novos áudios de frases...")
    semaforo = asyncio.Semaphore(4)
    progresso = {"ok": 0, "erros": 0}

    async def sintetizar(fid, texto, tag_voz, voz):
        final_mp3 = os.path.join(pasta_frases, f"{fid}_{tag_voz}.mp3")
        async with semaforo:
            sucesso = False
            for _ in range(3):
                try:
                    com = edge_tts.Communicate(texto, voz)
                    await com.save(final_mp3)
                    if os.path.exists(final_mp3) and os.path.getsize(final_mp3) > 0:
                        sucesso = True
                        break
                except Exception:
                    await asyncio.sleep(1)
            if sucesso:
                progresso["ok"] += 1
            else:
                progresso["erros"] += 1

    async def rodar_sintese():
        tarefas = []
        for fid, texto in alteracoes.items():
            for tag_voz, voz in VOZES_FRASES[idioma]:
                tarefas.append(sintetizar(fid, texto, tag_voz, voz))
        await asyncio.gather(*tarefas)

    asyncio.run(rodar_sintese())
    print(f"✔ Síntese concluída: {progresso['ok']} arquivos gerados | Falhas: {progresso['erros']}")
    if progresso["erros"] > 0:
        print("[FALHA] Erro na síntese de áudio. Abortando upload.")
        sys.exit(1)

    # 3. Upload Cloudflare R2
    print(f"Enviando áudios para Cloudflare R2 (Bucket: {R2_BUCKET})...")
    s3 = get_r2_client()

    def upload_r2(fid, tag_voz):
        arq = f"{fid}_{tag_voz}.mp3"
        caminho_local = os.path.join(pasta_frases, arq)
        chave_s3 = f"{idioma}/{arq}"
        for _ in range(3):
            try:
                s3.upload_file(caminho_local, R2_BUCKET, chave_s3, ExtraArgs={"ContentType": "audio/mpeg"})
                return True
            except Exception:
                pass
        return False

    uploads_ok = 0
    total_audios = len(alteracoes) * len(VOZES_FRASES[idioma])
    with ThreadPoolExecutor(max_workers=8) as executor:
        futuros = [executor.submit(upload_r2, fid, tag) for fid in alteracoes.keys() for tag, _ in VOZES_FRASES[idioma]]
        for fut in as_completed(futuros):
            if fut.result():
                uploads_ok += 1

    print(f"✔ Cloudflare R2 Upload: {uploads_ok}/{total_audios} áudios enviados com sucesso!")
    if uploads_ok != total_audios:
        print("[FALHA] Nem todos os áudios foram confirmados no R2.")
        sys.exit(1)

    print("-" * 70)
    print("[PRÓXIMO PASSO]")
    print("Execute a síntese de palavras e purga de vocabulário no Cloudflare R2:")
    print(f"  python scripts/dingli.py palavras-f1 {idioma}")
    print("-" * 70)

def cmd_palavras_f1(idioma):
    idioma = idioma.lower()
    if idioma not in VOZES_VOCABULARIO:
        print(f"[ERRO] Idioma inválido: {list(VOZES_VOCABULARIO.keys())}")
        sys.exit(1)

    if not os.path.exists(FFMPEG_EXE):
        raise FileNotFoundError(f"ffmpeg.exe não localizado em: {FFMPEG_EXE}")

    print("=" * 70)
    print(f" DÌNGLÌ - FLUXO F1: SÍNTESE, UPLOAD E PURGA DE PALAVRAS ISOLADAS ({idioma.upper()})")
    print("=" * 70)

    coluna_fonte = "pi" if idioma == "zh" else idioma
    mapa_esperado = {}

    with open(CSV_SENTENCES, "r", encoding="utf-8-sig", errors="ignore") as f:
        for row in csv.DictReader(f):
            fid = row.get("id") or row.get("ID")
            if not (fid and fid.isdigit() and 1 <= int(fid) <= 1200):
                continue
            texto = row.get(coluna_fonte, "")
            if texto:
                for token in texto.split():
                    slug = sanitizar_palavra_audio(token)
                    if slug and slug not in mapa_esperado:
                        fala = re.sub(r'[.,!?;:¿¡"“”`{}()[\]\-—…，。！？；：、«»/\\~*]', '', token.strip())
                        if idioma == "pt" and fala.lower() == "e":
                            fala = "ê"
                        mapa_esperado[slug] = fala

    dir_lang = os.path.join("audios_dingli", "palavras", idioma)
    dir_quar = os.path.join("audios_dingli", "quarentena_palavras", idioma)
    os.makedirs(dir_lang, exist_ok=True)
    os.makedirs(dir_quar, exist_ok=True)

    arquivos_locais = set(f for f in os.listdir(dir_lang) if f.endswith(".mp3"))
    esperados_set = set(f"{s}.mp3" for s in mapa_esperado.keys())
    orfaos_locais = list(arquivos_locais - esperados_set)
    faltantes_locais = [s for s in mapa_esperado.keys() if f"{s}.mp3" not in arquivos_locais]

    print(f"Diagnóstico local: Esperados: {len(esperados_set)} | No disco: {len(arquivos_locais)} | Órfãos: {len(orfaos_locais)} | Faltantes: {len(faltantes_locais)}")

    if orfaos_locais:
        for arq in orfaos_locais:
            shutil.move(os.path.join(dir_lang, arq), os.path.join(dir_quar, arq))
        print(f"✔ Quarentena local: {len(orfaos_locais)} palavras antigas isoladas em {dir_quar}")

    if faltantes_locais:
        print(f"Sintetizando {len(faltantes_locais)} novas palavras com Edge-TTS + FFmpeg...")
        voz = VOZES_VOCABULARIO[idioma]
        semaforo = asyncio.Semaphore(4)
        progresso = {"ok": 0, "erros": 0}

        async def gerar_termo(slug, texto_fala):
            temp_mp3 = os.path.join(dir_lang, f"temp_{slug}.mp3")
            final_mp3 = os.path.join(dir_lang, f"{slug}.mp3")
            async with semaforo:
                sucesso = False
                for _ in range(3):
                    try:
                        com = edge_tts.Communicate(texto_fala, voz)
                        await com.save(temp_mp3)
                        if os.path.exists(temp_mp3) and os.path.getsize(temp_mp3) > 0:
                            sucesso = True
                            break
                    except Exception:
                        await asyncio.sleep(1)

                if sucesso:
                    cmd = [
                        FFMPEG_EXE, "-y", "-i", temp_mp3,
                        "-af", "adelay=300|300,apad=pad_dur=0.1",
                        "-b:a", "128k", final_mp3
                    ]
                    res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    if res.returncode == 0 and os.path.exists(final_mp3):
                        progresso["ok"] += 1
                    else:
                        progresso["erros"] += 1
                    if os.path.exists(temp_mp3):
                        os.remove(temp_mp3)
                else:
                    progresso["erros"] += 1

        async def rodar_todas():
            tarefas = [gerar_termo(s, mapa_esperado[s]) for s in faltantes_locais]
            await asyncio.gather(*tarefas)

        asyncio.run(rodar_todas())
        print(f"✔ Síntese de palavras concluída: {progresso['ok']} geradas | Falhas: {progresso['erros']}")

    print("Auditando paridade de palavras no Cloudflare R2...")
    s3 = get_r2_client()
    prefixo_r2 = f"palavras/{idioma}/"

    remotos = set()
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=R2_BUCKET, Prefix=prefixo_r2):
        for obj in page.get("Contents", []):
            chave = obj["Key"]
            if chave.endswith(".mp3"):
                nome_arq = chave.split("/")[-1]
                remotos.add(nome_arq)

    esperados_nomes = set(f"{s}.mp3" for s in mapa_esperado.keys())
    faltantes_remotos = list(esperados_nomes - remotos)
    orfaos_remotos = list(remotos - esperados_nomes)

    print(f"Paridade R2: Esperadas: {len(esperados_nomes)} | No R2: {len(remotos)} | Faltando no R2: {len(faltantes_remotos)} | Órfãs no R2: {len(orfaos_remotos)}")

    if faltantes_remotos:
        print(f"Enviando {len(faltantes_remotos)} áudios de palavras para o R2...")
        def upload_termo(nome_arq):
            caminho_local = os.path.join(dir_lang, nome_arq)
            chave = f"{prefixo_r2}{nome_arq}"
            try:
                s3.upload_file(caminho_local, R2_BUCKET, chave, ExtraArgs={"ContentType": "audio/mpeg"})
                return True
            except Exception:
                return False

        enviados = 0
        with ThreadPoolExecutor(max_workers=8) as executor:
            futuros = [executor.submit(upload_termo, n) for n in faltantes_remotos]
            for fut in as_completed(futuros):
                if fut.result():
                    enviados += 1
        print(f"✔ Upload R2: {enviados}/{len(faltantes_remotos)} palavras enviadas!")

    if orfaos_remotos:
        print(f"Deletando {len(orfaos_remotos)} palavras órfãs no Cloudflare R2...")
        for i in range(0, len(orfaos_remotos), 1000):
            lote = [{"Key": f"{prefixo_r2}{arq}"} for arq in orfaos_remotos[i:i+1000]]
            s3.delete_objects(Bucket=R2_BUCKET, Delete={"Objects": lote})
        print(f"✔ Purga R2: {len(orfaos_remotos)} arquivos órfãos excluídos!")

    print("\n🎉 Palavras isoladas 100% sincronizadas no Cloudflare R2!")
    print("-" * 70)
    print("[PRÓXIMO PASSO]")
    print("Atualize a tabela sentences e registre a versão de texto no Supabase:")
    print(f"  python scripts/dingli.py commit-f1 {idioma}")
    print("-" * 70)

def cmd_commit_f1(idioma):
    idioma = idioma.lower()
    ultimo_backup = obter_ultimo_backup()

    print("=" * 70)
    print(f" DÌNGLÌ - FLUXO F1: COMMIT NO BANCO E CARIMBO DE VERSÃO DE TEXTO ({idioma.upper()})")
    print(f" Backup de referência: {ultimo_backup}")
    print("=" * 70)

    db_data = {int(r["id"]): r for r in csv.DictReader(open(ultimo_backup, encoding="utf-8-sig", errors="ignore")) if r.get("id", "").isdigit()}
    csv_data = {int(r["id"]): r for r in csv.DictReader(open(CSV_SENTENCES, encoding="utf-8-sig", errors="ignore")) if r.get("id", "").isdigit()}

    alteracoes_db = {}
    for fid, r_csv in sorted(csv_data.items()):
        r_db = db_data.get(fid, {})
        txt_csv = (r_csv.get(idioma) or "").strip()
        txt_db = (r_db.get(idioma) or "").strip()
        if idioma == "zh":
            pi_csv = (r_csv.get("pi") or "").strip()
            pi_db = (r_db.get("pi") or "").strip()
            if txt_csv != txt_db or pi_csv != pi_db:
                alteracoes_db[fid] = {"zh": txt_csv, "pi": pi_csv}
        else:
            if txt_csv != txt_db:
                alteracoes_db[fid] = {idioma: txt_csv}

    if not alteracoes_db:
        print("✔ Nenhuma alteração pendente de gravação no banco de dados.")
        return

    print(f"Atualizando {len(alteracoes_db)} registros na tabela sentences via PATCH...")
    headers_patch = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

    db_sucessos = 0
    for fid, payload in alteracoes_db.items():
        url_patch = f"{SUPABASE_URL}/rest/v1/sentences?id=eq.{fid}"
        req_patch = urllib.request.Request(url_patch, data=json.dumps(payload).encode("utf-8"), headers=headers_patch, method="PATCH")
        for _ in range(3):
            try:
                with urllib.request.urlopen(req_patch, timeout=15) as resp:
                    if resp.status in (200, 204):
                        db_sucessos += 1
                        break
            except Exception:
                pass

    if db_sucessos != len(alteracoes_db):
        print(f"[ERRO] Falha ao atualizar sentences: {db_sucessos}/{len(alteracoes_db)} frases sincronizadas.")
        sys.exit(1)

    print(f"✔ Supabase DB atualizado: {db_sucessos}/{len(alteracoes_db)} frases sincronizadas com sucesso!")

    versao_anterior = obter_versao_atual_supabase(idioma)
    nova_versao = versao_anterior + 1
    ids_alterados = sorted(list(alteracoes_db.keys()))

    payload_rev = {
        "versao": nova_versao,
        "idioma": idioma,
        "ids_alterados": ids_alterados,
        "descricao": "",
        "tipo": "texto"
    }

    headers_post = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

    req_post = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/curso_revisoes", data=json.dumps(payload_rev).encode("utf-8"), headers=headers_post, method="POST")
    with urllib.request.urlopen(req_post, timeout=15) as resp_post:
        if resp_post.status not in (200, 201):
            print(f"[ERRO] Falha ao registrar versão: HTTP {resp_post.status}")
            sys.exit(1)

    print(f"✔ Versão {nova_versao} (tipo: texto) registrada no Supabase para [{idioma.upper()}]!")
    print(f"  - Total de IDs afetados: {len(ids_alterados)}")
    print("-" * 70)
    print("🎉 FLUXO F1 FINALIZADO COM SUCESSO ABSOLUTO!")
    print("O aluno receberá o aviso de conteúdo aprimorado ao entrar no Deck/Game.")
    print("Essas frases reiniciarão no início do ciclo com Rank 0.")
    print("-" * 70)

# ------------------------------------------------------------------------------
# FLUXO F2 (APENAS ÁUDIO / NOVAS VOZES)
# ------------------------------------------------------------------------------
def cmd_frases_f2(idioma, inicio, fim, vozes_custom=None):
    idioma = idioma.lower()
    if idioma not in VOZES_FRASES:
        print(f"[ERRO] Idioma inválido: {list(VOZES_FRASES.keys())}")
        sys.exit(1)

    inicio = int(inicio)
    fim = int(fim)
    if inicio < 1 or fim > 1200 or inicio > fim:
        print("[ERRO] Faixa de IDs inválida. Deve estar entre 1 e 1200.")
        sys.exit(1)

    todas_vozes = VOZES_FRASES[idioma]
    if vozes_custom:
        tags_selecionadas = [v.strip().lower() for v in vozes_custom.split(",")]
        vozes_alvo = [v for v in todas_vozes if v[0] in tags_selecionadas]
    else:
        vozes_alvo = todas_vozes

    if not vozes_alvo:
        print(f"[ERRO] Nenhuma voz válida selecionada. Opções: {[v[0] for v in todas_vozes]}")
        sys.exit(1)

    print("=" * 70)
    print(f" DÌNGLÌ - FLUXO F2: SÍNTESE E UPLOAD DE FRASES COMPLETAS ({idioma.upper()})")
    print(f" Faixa: ID {inicio} a {fim} ({fim - inicio + 1} frases)")
    print(f" Vozes: {', '.join(v[0] for v in vozes_alvo)}")
    print("=" * 70)

    frases_map = {}
    with open(CSV_SENTENCES, "r", encoding="utf-8-sig", errors="ignore") as f:
        for r in csv.DictReader(f):
            fid = r.get("id")
            if fid and fid.isdigit():
                fid_int = int(fid)
                if inicio <= fid_int <= fim:
                    txt = (r.get(idioma) or "").strip()
                    if txt:
                        frases_map[fid_int] = txt

    pasta_frases = os.path.join("audios_dingli", idioma)
    os.makedirs(pasta_frases, exist_ok=True)

    print("Iniciando síntese Edge-TTS...")
    semaforo = asyncio.Semaphore(4)
    progresso = {"ok": 0, "erros": 0}

    async def sintetizar(fid, texto, tag_voz, voz):
        final_mp3 = os.path.join(pasta_frases, f"{fid}_{tag_voz}.mp3")
        async with semaforo:
            sucesso = False
            for _ in range(3):
                try:
                    com = edge_tts.Communicate(texto, voz)
                    await com.save(final_mp3)
                    if os.path.exists(final_mp3) and os.path.getsize(final_mp3) > 0:
                        sucesso = True
                        break
                except Exception:
                    await asyncio.sleep(1)
            if sucesso:
                progresso["ok"] += 1
            else:
                progresso["erros"] += 1

    async def rodar():
        tarefas = []
        for fid, texto in frases_map.items():
            for tag_voz, voz in vozes_alvo:
                tarefas.append(sintetizar(fid, texto, tag_voz, voz))
        await asyncio.gather(*tarefas)

    asyncio.run(rodar())
    print(f"✔ Síntese concluída: {progresso['ok']} arquivos gerados | Falhas: {progresso['erros']}")
    if progresso["erros"] > 0:
        print("[FALHA] Interrupção na síntese. Abortando upload.")
        sys.exit(1)

    print("Enviando frases completas para o Cloudflare R2...")
    s3 = get_r2_client()

    def upload_r2(fid, tag_voz):
        arq = f"{fid}_{tag_voz}.mp3"
        local = os.path.join(pasta_frases, arq)
        chave = f"{idioma}/{arq}"
        for _ in range(3):
            try:
                s3.upload_file(local, R2_BUCKET, chave, ExtraArgs={"ContentType": "audio/mpeg"})
                return True
            except Exception:
                pass
        return False

    total = len(frases_map) * len(vozes_alvo)
    uploads_ok = 0
    with ThreadPoolExecutor(max_workers=8) as executor:
        futuros = [executor.submit(upload_r2, fid, tag) for fid in frases_map.keys() for tag, _ in vozes_alvo]
        for fut in as_completed(futuros):
            if fut.result():
                uploads_ok += 1

    print(f"✔ Upload Cloudflare R2: {uploads_ok}/{total} áudios enviados com sucesso!")
    if uploads_ok != total:
        print("[FALHA] Nem todos os arquivos foram confirmados no R2.")
        sys.exit(1)

    print("-" * 70)
    print("[PRÓXIMO PASSO]")
    print("Registre a versão de áudio no Supabase (sem impacto no progresso dos alunos):")
    print(f"  python scripts/dingli.py commit-f2 {idioma} {inicio} {fim}")
    print("-" * 70)

def cmd_commit_f2(idioma, inicio, fim):
    idioma = idioma.lower()
    inicio = int(inicio)
    fim = int(fim)
    ids_alterados = list(range(inicio, fim + 1))

    print("=" * 70)
    print(f" DÌNGLÌ - FLUXO F2: CARIMBO DE VERSÃO DE ÁUDIO ({idioma.upper()})")
    print(f" IDs: {inicio} a {fim} ({len(ids_alterados)} frases)")
    print("=" * 70)

    versao_anterior = obter_versao_atual_supabase(idioma)
    nova_versao = versao_anterior + 1

    payload_rev = {
        "versao": nova_versao,
        "idioma": idioma,
        "ids_alterados": ids_alterados,
        "descricao": "",
        "tipo": "audio"
    }

    headers_post = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

    req_post = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/curso_revisoes", data=json.dumps(payload_rev).encode("utf-8"), headers=headers_post, method="POST")
    with urllib.request.urlopen(req_post, timeout=15) as resp:
        if resp.status not in (200, 201):
            print(f"[ERRO] Resposta inesperada ao registrar versão: HTTP {resp.status}")
            sys.exit(1)

    print(f"✔ Versão {nova_versao} (tipo: audio) registrada com sucesso no Supabase para [{idioma.upper()}]!")
    print("-" * 70)
    print("🎉 FLUXO F2 FINALIZADO COM SUCESSO ABSOLUTO!")
    print("O aluno receberá o aviso de novas pronúncias ao entrar no Deck/Game.")
    print("O progresso e os Ranks no Dìngloop continuarão rigorosamente intocados!")
    print("-" * 70)

# ------------------------------------------------------------------------------
# ROTEAMENTO DE LINHA DE COMANDO
# ------------------------------------------------------------------------------
def main():
    if len(sys.argv) < 2:
        print("Uso: python scripts/dingli.py <comando> [argumentos...]")
        print("\nComandos disponíveis:")
        print("  backup                                     - [F1] Extrai backup da tabela sentences do Supabase")
        print("  patch <arquivo.json>                       - [F1] Aplica correções no CSV local")
        print("  frases-f1 <idioma>                         - [F1] Sintetiza e envia frases alteradas ao Cloudflare R2")
        print("  palavras-f1 <idioma>                       - [F1] Sintetiza, envia ao R2 e purga órfãos de palavras isoladas")
        print("  commit-f1 <idioma>                         - [F1] Grava no Supabase DB e carimba versão (tipo texto, reset de rank)")
        print("  frases-f2 <idioma> <inicio> <fim> [--vozes]- [F2] Sintetiza e envia áudios de frases completas ao R2")
        print("  commit-f2 <idioma> <inicio> <fim>          - [F2] Carimba versão no Supabase (tipo audio, sem reset de rank)")
        sys.exit(1)

    cmd = sys.argv[1].lower()

    if cmd == "backup":
        cmd_backup()
    elif cmd == "patch":
        if len(sys.argv) < 3:
            print("[ERRO] Informe o arquivo JSON do patch: python scripts/dingli.py patch <patch.json>")
            sys.exit(1)
        cmd_patch(sys.argv[2])
    elif cmd == "frases-f1":
        if len(sys.argv) < 3:
            print("[ERRO] Informe o idioma: python scripts/dingli.py frases-f1 <idioma>")
            sys.exit(1)
        cmd_frases_f1(sys.argv[2])
    elif cmd == "palavras-f1":
        if len(sys.argv) < 3:
            print("[ERRO] Informe o idioma: python scripts/dingli.py palavras-f1 <idioma>")
            sys.exit(1)
        cmd_palavras_f1(sys.argv[2])
    elif cmd == "commit-f1":
        if len(sys.argv) < 3:
            print("[ERRO] Informe o idioma: python scripts/dingli.py commit-f1 <idioma>")
            sys.exit(1)
        cmd_commit_f1(sys.argv[2])
    elif cmd == "frases-f2":
        if len(sys.argv) < 5:
            print("[ERRO] Uso: python scripts/dingli.py frases-f2 <idioma> <inicio> <fim> [--vozes v1,v2...]")
            sys.exit(1)
        vozes_arg = None
        if "--vozes" in sys.argv:
            idx = sys.argv.index("--vozes")
            if idx + 1 < len(sys.argv):
                vozes_arg = sys.argv[idx + 1]
        cmd_frases_f2(sys.argv[2], sys.argv[3], sys.argv[4], vozes_arg)
    elif cmd == "commit-f2":
        if len(sys.argv) < 5:
            print("[ERRO] Uso: python scripts/dingli.py commit-f2 <idioma> <inicio> <fim>")
            sys.exit(1)
        cmd_commit_f2(sys.argv[2], sys.argv[3], sys.argv[4])
    else:
        print(f"[ERRO] Comando '{cmd}' desconhecido. Execute 'python scripts/dingli.py' para ver a lista.")
        sys.exit(1)

if __name__ == "__main__":
    main()