# -*- coding: utf-8 -*-
import os, csv, glob, asyncio, urllib.request
import edge_tts

# 1. Carregar credenciais do .env.local
env = {}
with open('.env.local', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip()

SUPABASE_URL = env['SUPABASE_URL']
KEY = env['SUPABASE_SERVICE_ROLE_KEY']
BUCKET = "audios"
CSV_FILE = "supabase_sentences.csv"

# 2. Vozes oficiais por idioma
VOZES_MAP = {
    "en": {
        "v1": "en-US-AndrewNeural",
        "v2": "en-US-GuyNeural",
        "v3": "en-US-EricNeural",
        "v4": "en-US-JennyNeural",
        "v5": "en-GB-LibbyNeural",
        "v6": "en-CA-ClaraNeural"
    },
    "es": {
        "v1": "es-AR-TomasNeural",
        "v2": "es-MX-JorgeNeural",
        "v3": "es-PE-AlexNeural",
        "v4": "es-CO-SalomeNeural",
        "v5": "es-CL-CatalinaNeural",
        "v6": "es-MX-DaliaNeural"
    },
    "fr": {
        "v1": "fr-FR-DeniseNeural",
        "v2": "fr-FR-HenriNeural",
        "v3": "fr-BE-CharlineNeural",
        "v4": "fr-CA-ThierryNeural"
    },
    "ge": {
        "v1": "de-AT-JonasNeural",
        "v2": "de-DE-FlorianMultilingualNeural",
        "v3": "de-DE-SeraphinaMultilingualNeural",
        "v4": "de-DE-KatjaNeural"
    },
    "it": {
        "v1": "it-IT-GiuseppeMultilingualNeural",
        "v2": "it-IT-DiegoNeural",
        "v3": "it-IT-IsabellaNeural",
        "v4": "it-IT-ElsaNeural"
    },
    "pt": {
        "v1": "pt-BR-AntonioNeural",
        "v2": "pt-BR-ThalitaMultilingualNeural",
        "v3": "ko-KR-HyunsuMultilingualNeural",
        "v4": "en-US-AvaMultilingualNeural"
    },
    "zh": {
        "v1": "zh-CN-XiaoxiaoNeural",
        "v2": "zh-CN-YunxiNeural",
        "v3": "zh-CN-YunjianNeural",
        "v4": "zh-CN-XiaoyiNeural"
    }
}

# 3. Identificar o backup mais recente e mapear diferenças
backups = sorted(glob.glob('backups/sentences_backup_*.csv'))
if not backups:
    raise FileNotFoundError("Nenhum backup encontrado na pasta backups/")
ultimo_backup = backups[-1]
print(f"Comparando com backup de referência: {ultimo_backup}")

db_data = {int(r['id']): r for r in csv.DictReader(open(ultimo_backup, encoding='utf-8-sig', errors='ignore'))}
csv_data = {int(r['id']): r for r in csv.DictReader(open(CSV_FILE, encoding='utf-8-sig', errors='ignore'))}

fila_trabalho = []
langs_monitorados = ["ge", "en", "es", "fr", "it", "pt", "zh"]
contagem_por_idioma = {l: 0 for l in langs_monitorados}

for fid, r_csv in sorted(csv_data.items()):
    r_db = db_data.get(fid, {})
    for l in langs_monitorados:
        val_csv = (r_csv.get(l) or "").strip()
        val_db = (r_db.get(l) or "").strip()
        if val_csv and val_csv != val_db:
            contagem_por_idioma[l] += 1
            for v_num, voz in VOZES_MAP[l].items():
                fila_trabalho.append((l, fid, v_num, voz, val_csv))

print("\nFrases com texto alterado detectadas:")
for l, c in contagem_por_idioma.items():
    if c > 0:
        print(f"  - {l.upper()}: {c} frases ({c * len(VOZES_MAP[l])} áudios)")

print("=" * 65)
print(f"TOTAL DE ÁUDIOS A SINTETIZAR E SUBIR: {len(fila_trabalho)}")
print("=" * 65)

def upload_supabase(caminho_local, lang, nome_arquivo):
    with open(caminho_local, "rb") as f:
        conteudo = f.read()
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{lang}/{nome_arquivo}"
    headers = {
        "apikey": KEY,
        "Authorization": f"Bearer {KEY}",
        "Content-Type": "audio/mpeg",
        "x-upsert": "true"
    }
    req = urllib.request.Request(url, data=conteudo, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status in (200, 201)
    except Exception as e:
        return False

semaforo = asyncio.Semaphore(5)
progresso = {"concluidos": 0, "erros": 0}

async def processar_item(lang, f_id, v_num, voz, texto):
    nome_arquivo = f"{f_id}_{v_num}.mp3"
    pasta_destino = os.path.join("audios_dingli", lang)
    os.makedirs(pasta_destino, exist_ok=True)
    caminho_local = os.path.join(pasta_destino, nome_arquivo)

    async with semaforo:
        # Síntese com Edge-TTS (até 3 tentativas)
        tentativas = 0
        sucesso_tts = False
        while tentativas < 3 and not sucesso_tts:
            try:
                communicate = edge_tts.Communicate(texto, voz)
                await communicate.save(caminho_local)
                if os.path.exists(caminho_local) and os.path.getsize(caminho_local) > 0:
                    sucesso_tts = True
            except Exception:
                tentativas += 1
                await asyncio.sleep(1)

        if not sucesso_tts:
            progresso["erros"] += 1
            print(f"\n[ERRO TTS] {lang}/{nome_arquivo} com voz {voz}")
            return

        # Upload para o Supabase Storage
        loop = asyncio.get_event_loop()
        sucesso_upload = await loop.run_in_executor(None, upload_supabase, caminho_local, lang, nome_arquivo)

        if sucesso_upload:
            progresso["concluidos"] += 1
        else:
            progresso["erros"] += 1
            print(f"\n[ERRO UPLOAD] {lang}/{nome_arquivo}")

        total = len(fila_trabalho)
        pct = (progresso["concluidos"] / total) * 100
        print(f"Progresso: {progresso['concluidos']}/{total} ({pct:.1f}%) | Falhas: {progresso['erros']}", end="\r", flush=True)

async def main():
    if not fila_trabalho:
        print("Nenhum áudio precisa ser gerado.")
        return
    tarefas = [processar_item(lg, fid, vn, vz, tx) for lg, fid, vn, vz, tx in fila_trabalho]
    await asyncio.gather(*tarefas)
    print(f"\n\n✔ PASSO 7 FINALIZADO! Concluídos: {progresso['concluidos']} | Erros: {progresso['erros']}")

if __name__ == "__main__":
    asyncio.run(main())
