# -*- coding: utf-8 -*-
import os, sys, re, csv, shutil, asyncio, subprocess, urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
import edge_tts

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sanitizacao import sanitizar_palavra_audio

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

CSV_FILE = "supabase_sentences.csv"
PASTA_PALAVRAS = os.path.join("audios_dingli", "palavras")
PASTA_QUARENTENA = os.path.join("audios_dingli", "quarentena_palavras")
FFMPEG_EXE = os.path.abspath("ffmpeg.exe")

if not os.path.exists(FFMPEG_EXE):
    raise FileNotFoundError(f"ffmpeg.exe não encontrado em: {FFMPEG_EXE}")

VOZES_OFICIAIS = {
    "en": "en-CA-ClaraNeural",
    "es": "es-MX-DaliaNeural",
    "fr": "fr-FR-DeniseNeural",
    "ge": "de-DE-KatjaNeural",
    "it": "it-IT-IsabellaNeural",
    "pt": "pt-BR-FranciscaNeural",
    "zh": "zh-CN-XiaoxiaoNeural"
}

args = [a.lower() for a in sys.argv[1:]]
dry_run = "--dry-run" in args
idiomas_args = [a for a in args if not a.startswith("--")]

alvo = idiomas_args[0] if idiomas_args else "todos"
if alvo != "todos" and alvo not in VOZES_OFICIAIS:
    print(f"[ERRO] Idioma '{alvo}' inválido. Válidos: {list(VOZES_OFICIAIS.keys())} ou 'todos'")
    sys.exit(1)

idiomas_alvo = list(VOZES_OFICIAIS.keys()) if alvo == "todos" else [alvo]

print("=" * 70)
print(" DÌNGLÌ - PIPELINE UNIFICADO DE VOCABULÁRIO (PASSOS 7, 10 E 11)")
print(f" Modo: {'SOMENTE LEITURA (DRY-RUN)' if dry_run else 'EXECUÇÃO REAL'}")
print(f" Idiomas: {', '.join(i.upper() for i in idiomas_alvo)}")
print("=" * 70)

mapa_esperado = {l: {} for l in idiomas_alvo}
with open(CSV_FILE, "r", encoding="utf-8-sig", errors="ignore") as f:
    for row in csv.DictReader(f):
        fid = row.get("id") or row.get("ID")
        if not (fid and fid.isdigit() and 1 <= int(fid) <= 1200):
            continue
        for l in idiomas_alvo:
            coluna_fonte = "pi" if l == "zh" else l
            texto = row.get(coluna_fonte, "")
            if texto:
                for token in texto.split():
                    slug = sanitizar_palavra_audio(token)
                    if slug and slug not in mapa_esperado[l]:
                        texto_fala = re.sub(r'[.,!?;:¿¡"“”`{}()[\]\-—…，。！？；：、«»/\\~*]', '', token.strip())
                        if l == "pt" and texto_fala.lower() == "e":
                            texto_fala = "ê"
                        mapa_esperado[l][slug] = texto_fala

for l in idiomas_alvo:
    dir_lang = os.path.join(PASTA_PALAVRAS, l)
    os.makedirs(dir_lang, exist_ok=True)
    arquivos_locais = set(f for f in os.listdir(dir_lang) if f.endswith(".mp3"))
    esperados = set(f"{slug}.mp3" for slug in mapa_esperado[l].keys())
    
    orfaos = arquivos_locais - esperados
    faltantes = esperados - arquivos_locais
    
    print(f"\n[{l.upper()}] Diagnóstico: Esperados: {len(esperados)} | No disco: {len(arquivos_locais)} | Órfãos: {len(orfaos)} | Faltantes: {len(faltantes)}")

if dry_run:
    print("\n[DRY-RUN CONCLUÍDO] Nenhuma ação física foi executada.")
    sys.exit(0)

# EXECUÇÃO REAL
for l in idiomas_alvo:
    dir_lang = os.path.join(PASTA_PALAVRAS, l)
    dir_quar = os.path.join(PASTA_QUARENTENA, l)
    os.makedirs(dir_quar, exist_ok=True)
    
    arquivos_locais = set(f for f in os.listdir(dir_lang) if f.endswith(".mp3"))
    esperados = set(f"{slug}.mp3" for slug in mapa_esperado[l].keys())
    orfaos = list(arquivos_locais - esperados)
    faltantes = [s for s in mapa_esperado[l].keys() if f"{s}.mp3" not in arquivos_locais]
    
    # 1. Quarentena de órfãos (com trava de segurança > 15)
    if orfaos:
        if len(orfaos) > 15 and l != "zh":
            print(f"  [TRAVA DE SEGURANÇA] {len(orfaos)} órfãos detectados em {l.upper()}. Abortando para evitar perda acidental.")
            sys.exit(1)
        for arq in orfaos:
            shutil.move(os.path.join(dir_lang, arq), os.path.join(dir_quar, arq))
        print(f"  ✔ Quarentena [{l.upper()}]: {len(orfaos)} arquivos isolados em {dir_quar}")

    # 2. Síntese e processamento FFmpeg
    if faltantes:
        print(f"  Iniciando síntese de {len(faltantes)} palavras faltantes para [{l.upper()}]...")
        semaforo = asyncio.Semaphore(4)
        voz = VOZES_OFICIAIS[l]
        progresso = {"ok": 0, "erros": 0}

        async def gerar_palavra(slug, texto_fala):
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
                
                concluidos = progresso["ok"] + progresso["erros"]
                pct = (concluidos / len(faltantes)) * 100
                print(f"  [Síntese + FFmpeg {l.upper()}] {concluidos}/{len(faltantes)} ({pct:.1f}%) | Falhas: {progresso['erros']}", end="\r", flush=True)

        async def rodar_todas():
            tarefas = [gerar_palavra(slug, mapa_esperado[l][slug]) for slug in faltantes]
            await asyncio.gather(*tarefas)

        asyncio.run(rodar_todas())
        print(f"\n  ✔ Síntese [{l.upper()}]: {progresso['ok']} geradas | Falhas: {progresso['erros']}")

    # 3. Upload concorrente para Supabase Storage
    def upload_palavra(slug):
        arq = f"{slug}.mp3"
        caminho = os.path.join(dir_lang, arq)
        if not os.path.exists(caminho):
            return False
        url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/palavras/{l}/{urllib.parse.quote(arq)}"
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

    todos_arquivos = [f[:-4] for f in os.listdir(dir_lang) if f.endswith(".mp3")]
    print(f"  Iniciando upload de {len(todos_arquivos)} palavras para Storage (palavras/{l}/)...")
    uploads_ok = 0
    feitos = 0
    with ThreadPoolExecutor(max_workers=6) as executor:
        futuros = [executor.submit(upload_palavra, s) for s in todos_arquivos]
        for fut in as_completed(futuros):
            feitos += 1
            if fut.result():
                uploads_ok += 1
            pct = (feitos / len(todos_arquivos)) * 100
            print(f"  [Upload Storage {l.upper()}] {feitos}/{len(todos_arquivos)} ({pct:.1f}%) | Enviados: {uploads_ok}", end="\r", flush=True)
    print(f"\n  ✔ Upload [{l.upper()}]: {uploads_ok}/{len(todos_arquivos)} sincronizados!")

print("\n🎉 PIPELINE DE VOCABULÁRIO FINALIZADO COM SUCESSO ABSOLUTO!")
