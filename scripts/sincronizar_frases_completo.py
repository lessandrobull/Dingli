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

# Vozes oficiais de frases por idioma
VOZES_FRASES = {
    "en": [
        ("v1", "en-US-AndrewNeural"), ("v2", "en-US-GuyNeural"),
        ("v3", "en-US-EricNeural"), ("v4", "en-US-JennyNeural"),
        ("v5", "en-US-LibbyNeural"), ("v6", "en-CA-ClaraNeural")
    ],
    "es": [
        ("v1", "es-MX-TomasNeural"), ("v2", "es-MX-JorgeNeural"),
        ("v3", "es-MX-DaliaNeural"), ("v4", "es-ES-AlvaroNeural"),
        ("v5", "es-ES-ElviraNeural"), ("v6", "es-US-AlonsoNeural")
    ],
    "fr": [
        ("v1", "fr-FR-DeniseNeural"), ("v2", "fr-FR-HenriNeural"),
        ("v3", "fr-FR-VivienneMultilingualNeural"), ("v4", "fr-FR-RemyMultilingualNeural")
    ],
    "it": [
        ("v1", "it-IT-GiuseppeNeural"), ("v2", "it-IT-DiegoNeural"),
        ("v3", "it-IT-IsabellaNeural"), ("v4", "it-IT-ElsaNeural")
    ],
    "pt": [
        ("v1", "pt-BR-AntonioNeural"), ("v2", "pt-BR-ThalitaMultilingualNeural"),
        ("v3", "pt-BR-FranciscaNeural"), ("v4", "pt-BR-BrendaNeural")
    ],
    "ge": [
        ("v1", "de-DE-JonasNeural"), ("v2", "de-DE-FlorianMultilingualNeural"),
        ("v3", "de-DE-SeraphinaMultilingualNeural"), ("v4", "de-DE-KatjaNeural")
    ],
    "zh": [
        ("v1", "zh-CN-XiaoxiaoNeural"), ("v2", "zh-CN-YunxiNeural"),
        ("v3", "zh-CN-YunjianNeural"), ("v4", "zh-CN-XiaoyiNeural")
    ]
}

idioma_alvo = sys.argv[1].lower() if len(sys.argv) > 1 else None
if not idioma_alvo or idioma_alvo not in VOZES_FRASES:
    print(f"[ERRO] Especifique um idioma válido: {list(VOZES_FRASES.keys())}")
    sys.exit(1)

backups = sorted(glob.glob("backups/sentences_backup_*.csv"))
if not backups:
    raise FileNotFoundError("Nenhum backup localizado em backups/. Execute o Passo 4 antes.")

ultimo_backup = backups[-1]
CSV_FILE = "supabase_sentences.csv"

print("=" * 65)
print(f" DÌNGLÌ - PASSO 6: PIPELINE UNIFICADO DE FRASES ({idioma_alvo.upper()})")
print(f" Referência Backup: {ultimo_backup}")
print("=" * 65)

db_data = {int(r["id"]): r for r in csv.DictReader(open(ultimo_backup, encoding="utf-8-sig", errors="ignore"))}
csv_data = {int(r["id"]): r for r in csv.DictReader(open(CSV_FILE, encoding="utf-8-sig", errors="ignore"))}

alteracoes = {}
for fid, r_csv in sorted(csv_data.items()):
    val_csv = (r_csv.get(idioma_alvo) or "").strip()
    val_db = (db_data.get(fid, {}).get(idioma_alvo) or "").strip()
    if val_csv and val_csv != val_db:
        alteracoes[fid] = val_csv

if not alteracoes:
    print(f"✔ Nenhuma alteração detectada para [{idioma_alvo.upper()}]. Frases já estão em paridade!")
    sys.exit(0)

print(f"Total de frases a sincronizar: {len(alteracoes)}")

# 1. Quarentena de áudios antigos locais
pasta_frases = os.path.join("audios_dingli", idioma_alvo)
pasta_quar = os.path.join("audios_dingli", "quarentena_frases", idioma_alvo)
os.makedirs(pasta_quar, exist_ok=True)
os.makedirs(pasta_frases, exist_ok=True)

movidos = 0
for fid in alteracoes.keys():
    for tag_voz, _ in VOZES_FRASES[idioma_alvo]:
        arq = f"{fid}_{tag_voz}.mp3"
        caminho_antigo = os.path.join(pasta_frases, arq)
        if os.path.exists(caminho_antigo):
            shutil.move(caminho_antigo, os.path.join(pasta_quar, arq))
            movidos += 1
print(f"✔ 1. Quarentena local: {movidos} áudios anteriores isolados com segurança.")

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
    for fid, texto in alteracoes.items():
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
total_uploads = len(alteracoes) * len(VOZES_FRASES[idioma_alvo])
with ThreadPoolExecutor(max_workers=6) as executor:
    futuros = [executor.submit(upload_audio, fid, tag) for fid in alteracoes.keys() for tag, _ in VOZES_FRASES[idioma_alvo]]
    for fut in as_completed(futuros):
        if fut.result():
            uploads_ok += 1

print(f"✔ 3. Storage Upload: {uploads_ok}/{total_uploads} áudios enviados com x-upsert!")

# 4. Atualização da tabela sentences no Supabase DB
headers_patch = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

db_ok = 0
for fid, texto in alteracoes.items():
    url = f"{SUPABASE_URL}/rest/v1/sentences?id=eq.{fid}"
    body = json.dumps({idioma_alvo: texto}).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=headers_patch, method="PATCH")
    with urllib.request.urlopen(req) as resp:
        if resp.status in (200, 204):
            db_ok += 1

print(f"✔ 4. Supabase DB atualizado: {db_ok}/{len(alteracoes)} sentenças sincronizadas!")
print("\n🎉 PASSO 6 FINALIZADO COM SUCESSO ABSOLUTO!")
