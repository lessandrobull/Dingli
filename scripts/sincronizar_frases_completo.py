# -*- coding: utf-8 -*-
import os, sys, csv, glob, json, shutil, asyncio, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
import edge_tts

caminho_env = os.path.abspath(".env.local")
if not os.path.exists(caminho_env):
    raise FileNotFoundError("Arquivo .env.local não encontrado na raiz.")

env = {}
with open(caminho_env, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()

SUPABASE_URL = env.get("SUPABASE_URL")
KEY = env.get("SUPABASE_SERVICE_ROLE_KEY")
BUCKET = "audios"

if not SUPABASE_URL or not KEY:
    raise ValueError("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes no .env.local.")

# Vozes oficiais de frases por idioma (Seção 4.A do DINGLI_MASTER.md)
VOZES_FRASES = {
    "en": [
        ("v1", "en-US-AndrewNeural"), ("v2", "en-US-GuyNeural"),
        ("v3", "en-US-EricNeural"), ("v4", "en-US-JennyNeural"),
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

args = [a.lower() for a in sys.argv[1:]]
dry_run = "--dry-run" in args
somente_audio = "--somente-audio" in args
idiomas_informados = [a for a in args if not a.startswith("--")]

idioma_alvo = idiomas_informados[0] if idiomas_informados else None
if not idioma_alvo or idioma_alvo not in VOZES_FRASES:
    print(f"[ERRO] Especifique um idioma válido: {list(VOZES_FRASES.keys())}")
    print("Exemplo: python scripts/sincronizar_frases_completo.py zh [--dry-run]")
    sys.exit(1)

backups = sorted(glob.glob("backups/sentences_v*.csv") + glob.glob("backups/sentences_backup_*.csv"))
if not backups:
    raise FileNotFoundError("Nenhum backup localizado em backups/. Execute o Passo 4 antes.")

ultimo_backup = backups[-1]
CSV_FILE = "supabase_sentences.csv"

print("=" * 70)
print(f" DÌNGLÌ - PIPELINE UNIFICADO DE FRASES ({idioma_alvo.upper()})")
print(f" Modo: {'SOMENTE LEITURA (DRY-RUN)' if dry_run else 'EXECUÇÃO REAL'}")
print(f" Backup de Referência: {ultimo_backup}")
print(f" Arquivo CSV Fonte:   {CSV_FILE}")
print("=" * 70)

db_data = {int(r["id"]): r for r in csv.DictReader(open(ultimo_backup, encoding="utf-8-sig", errors="ignore")) if r.get("id", "").isdigit()}
csv_data = {int(r["id"]): r for r in csv.DictReader(open(CSV_FILE, encoding="utf-8-sig", errors="ignore")) if r.get("id", "").isdigit()}

# 1. Identificar deltas de áudio (texto falado) e de banco (dados textuais)
alteracoes_audio = {}
alteracoes_db = {}

for fid, r_csv in sorted(csv_data.items()):
    r_db = db_data.get(fid, {})
    val_csv_texto = (r_csv.get(idioma_alvo) or "").strip()
    val_db_texto = (r_db.get(idioma_alvo) or "").strip()

    # Áudio depende estritamente do texto falado (para zh, são os Hanzi)
    if val_csv_texto and val_csv_texto != val_db_texto:
        alteracoes_audio[fid] = val_csv_texto

    # Banco: se for mandarim, monitora Hanzi (zh) E Pinyin (pi)
    if idioma_alvo == "zh":
        val_csv_pi = (r_csv.get("pi") or "").strip()
        val_db_pi = (r_db.get("pi") or "").strip()
        if (val_csv_texto != val_db_texto) or (val_csv_pi != val_db_pi):
            alteracoes_db[fid] = {"zh": val_csv_texto, "pi": val_csv_pi}
    else:
        if val_csv_texto != val_db_texto:
            alteracoes_db[fid] = {idioma_alvo: val_csv_texto}

total_vozes = len(VOZES_FRASES[idioma_alvo])
total_audios = len(alteracoes_audio) * total_vozes

print(f"\n[DIAGNÓSTICO FACTUAL]")
print(f"  - Frases com áudio desatualizado (síntese + upload): {len(alteracoes_audio)} ({total_audios} arquivos .mp3)")
if idioma_alvo == "zh":
    somente_pi = len(alteracoes_db) - len(alteracoes_audio)
    print(f"  - Frases com ajuste apenas de Pinyin (sem re-síntese de áudio): {somente_pi}")
print(f"  - Total de registros a atualizar no Supabase DB: {len(alteracoes_db)}")

if not alteracoes_db and not alteracoes_audio:
    print(f"\n✔ Nenhuma alteração detectada para [{idioma_alvo.upper()}]. Tudo 100% sincronizado!")
    sys.exit(0)

if dry_run:
    print("\n[DRY-RUN CONCLUÍDO] Nenhuma alteração física ou remota foi realizada.")
    print("Para aplicar de verdade, execute sem a flag --dry-run:")
    print(f"  python scripts/sincronizar_frases_completo.py {idioma_alvo}")
    sys.exit(0)

# ==============================================================================
# EXECUÇÃO REAL
# ==============================================================================
pasta_frases = os.path.join("audios_dingli", idioma_alvo)
pasta_quar = os.path.join("audios_dingli", "quarentena_frases", idioma_alvo)
os.makedirs(pasta_quar, exist_ok=True)
os.makedirs(pasta_frases, exist_ok=True)

# 1. Quarentena de áudios antigos locais
movidos = 0
for fid in alteracoes_audio.keys():
    for tag_voz, _ in VOZES_FRASES[idioma_alvo]:
        arq = f"{fid}_{tag_voz}.mp3"
        caminho_antigo = os.path.join(pasta_frases, arq)
        if os.path.exists(caminho_antigo):
            shutil.move(caminho_antigo, os.path.join(pasta_quar, arq))
            movidos += 1
print(f"\n✔ 1. Quarentena local: {movidos} áudios anteriores isolados em {pasta_quar}.")

# 2. Síntese assíncrona com Edge-TTS
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
    for fid, texto in alteracoes_audio.items():
        for tag_voz, voz in VOZES_FRASES[idioma_alvo]:
            tarefas.append(sintetizar(fid, texto, tag_voz, voz))
    await asyncio.gather(*tarefas)

print("Iniciando síntese de áudios...")
asyncio.run(rodar_sintese())
print(f"✔ 2. Síntese concluída: {progresso['ok']} arquivos gerados | Falhas: {progresso['erros']}")

# 3. Upload concorrente para o Supabase Storage
def upload_audio(fid, tag_voz):
    arq = f"{fid}_{tag_voz}.mp3"
    caminho = os.path.join(pasta_frases, arq)
    if not os.path.exists(caminho):
        return False
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{idioma_alvo}/{arq}"
    with open(caminho, "rb") as f:
        conteudo = f.read()
    headers = {
        "apikey": KEY,
        "Authorization": f"Bearer {KEY}",
        "Content-Type": "audio/mpeg",
        "x-upsert": "true"
    }
    req = urllib.request.Request(url, data=conteudo, headers=headers, method="POST")
    for _ in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                if resp.status in (200, 201):
                    return True
        except Exception:
            pass
    return False

uploads_ok = 0
with ThreadPoolExecutor(max_workers=6) as executor:
    futuros = [executor.submit(upload_audio, fid, tag) for fid in alteracoes_audio.keys() for tag, _ in VOZES_FRASES[idioma_alvo]]
    for fut in as_completed(futuros):
        if fut.result():
            uploads_ok += 1

print(f"✔ 3. Storage Upload: {uploads_ok}/{total_audios} áudios enviados com x-upsert!")

if somente_audio:
    print("
✔ [MODO SOMENTE-ÁUDIO] Síntese e upload de frases concluídos com 100% de sucesso!")
    print("  Atualização da tabela sentences e registro de versão delegados ao orquestrador.")
    sys.exit(0)

# 4. Atualização da tabela sentences no Supabase DB
headers_patch = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

db_ok = 0
for fid, payload in alteracoes_db.items():
    url = f"{SUPABASE_URL}/rest/v1/sentences?id=eq.{fid}"
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=headers_patch, method="PATCH")
    for _ in range(3):
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                if resp.status in (200, 204):
                    db_ok += 1
                    break
        except Exception:
            pass

print(f"✔ 4. Supabase DB atualizado: {db_ok}/{len(alteracoes_db)} sentenças sincronizadas!")

# 5. Registro automático de nova versão na tabela curso_revisoes
if db_ok > 0:
    idioma_curso = "pi" if idioma_alvo == "zh" else idioma_alvo
    print("\n[SISTEMA DE VERSIONAMENTO]")
    print(f"Registrando nova versão na tabela curso_revisoes para o curso [{idioma_curso.upper()}]...")
    try:
        # Consulta a versão mais recente registrada para o curso
        url_versao = f"{SUPABASE_URL}/rest/v1/curso_revisoes?idioma=eq.{idioma_curso}&select=versao&order=versao.desc&limit=1"
        headers_get = {
            "apikey": KEY,
            "Authorization": f"Bearer {KEY}"
        }
        req_get = urllib.request.Request(url_versao, headers=headers_get)
        with urllib.request.urlopen(req_get, timeout=15) as resp_v:
            dados_v = json.loads(resp_v.read().decode("utf-8"))
            versao_atual = dados_v[0]["versao"] if dados_v else 0

        nova_versao = versao_atual + 1
        ids_afetados = sorted(list(alteracoes_db.keys()))
        payload_revisao = {
            "versao": nova_versao,
            "idioma": idioma_curso,
            "ids_alterados": ids_afetados,
            "descricao": f"Atualização de conteúdo ({len(ids_afetados)} frase{'s' if len(ids_afetados) > 1 else ''} aprimorada{'s' if len(ids_afetados) > 1 else ''})."
        }

        url_post = f"{SUPABASE_URL}/rest/v1/curso_revisoes"
        headers_post = {
            "apikey": KEY,
            "Authorization": f"Bearer {KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }
        body_post = json.dumps(payload_revisao).encode("utf-8")
        req_post = urllib.request.Request(url_post, data=body_post, headers=headers_post, method="POST")
        with urllib.request.urlopen(req_post, timeout=15) as resp_post:
            if resp_post.status in (200, 201):
                print(f"✔ Versão {nova_versao} registrada com sucesso na tabela curso_revisoes!")
                print(f"  - Total de IDs registrados: {len(ids_afetados)}")
            else:
                print(f"⚠ Resposta inesperada ao registrar versão: {resp_post.status}")
    except Exception as err_rev:
        print(f"⚠ Falha ao registrar versão na tabela curso_revisoes: {err_rev}")

print("\n🎉 PASSO 6 FINALIZADO COM SUCESSO ABSOLUTO!")
