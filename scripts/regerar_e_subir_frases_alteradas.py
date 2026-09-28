# -*- coding: utf-8 -*-
import os
import csv
import asyncio
import urllib.request
import edge_tts

SUPABASE_URL = "https://lxdmfaxxxfyzbpzvniyi.supabase.co"
KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4ZG1mYXh4eGZ5emJwenZuaXlpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTI1NDE1MSwiZXhwIjoyMTA0ODMwMTUxfQ.ENxy63EZgvUIc8YKuaikrSnt2-Eja-4JLQ3PvOrb13U"
BUCKET = "audios"
CSV_FILE = "supabase_sentences.csv"

VOZES_MAP = {
    "it": {
        "v1": "it-IT-GiuseppeMultilingualNeural",
        "v2": "it-IT-DiegoNeural",
        "v3": "it-IT-IsabellaNeural",
        "v4": "it-IT-ElsaNeural"
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
    "en": {
        "v1": "en-US-AndrewNeural",
        "v2": "en-US-GuyNeural",
        "v3": "en-US-EricNeural",
        "v4": "en-US-JennyNeural",
        "v5": "en-GB-LibbyNeural",
        "v6": "en-CA-ClaraNeural"
    },
    "pt": {
        "v1": "pt-BR-AntonioNeural",
        "v2": "pt-BR-ThalitaMultilingualNeural",
        "v3": "ko-KR-HyunsuMultilingualNeural",
        "v4": "en-US-AvaMultilingualNeural"
    },
    "ge": {
        "v1": "de-AT-JonasNeural",
        "v2": "de-DE-FlorianMultilingualNeural",
        "v3": "de-DE-SeraphinaMultilingualNeural",
        "v4": "de-DE-KatjaNeural"
    },
    "zh": {
        "v1": "zh-CN-XiaoxiaoNeural",
        "v2": "zh-CN-YunxiNeural",
        "v3": "zh-CN-YunjianNeural",
        "v4": "zh-CN-XiaoyiNeural"
    }
}

# 1. Carregar frases do CSV
dados_csv = {}
with open(CSV_FILE, "r", encoding="utf-8-sig", errors="ignore") as f:
    for row in csv.DictReader(f):
        f_id = row.get("id") or row.get("ID")
        if f_id and f_id.isdigit():
            dados_csv[int(f_id)] = row

# 2. Carregar IDs alterados do italiano
ids_it = []
with open("ids_it_alterados_oficiais.txt", "r", encoding="utf-8") as f:
    for l in f:
        partes = l.strip().split("\t")
        if partes and partes[0].isdigit():
            ids_it.append(int(partes[0]))

# 3. Montar fila de audios a sintetizar e subir
fila_trabalho = []

# a) Italiano: 107 frases x 4 vozes
for f_id in ids_it:
    texto = dados_csv[f_id].get("it", "").strip()
    if texto:
        for v_num, voz in VOZES_MAP["it"].items():
            fila_trabalho.append(("it", f_id, v_num, voz, texto))

# b) Frase 988: es (6 vozes) e fr (4 vozes)
for v_num, voz in VOZES_MAP["es"].items():
    fila_trabalho.append(("es", 988, v_num, voz, dados_csv[988].get("es", "").strip()))

for v_num, voz in VOZES_MAP["fr"].items():
    fila_trabalho.append(("fr", 988, v_num, voz, dados_csv[988].get("fr", "").strip()))

# c) Frase 1: en, es, pt, fr, ge, zh (o it ja esta incluso em ids_it)
for lg in ["en", "es", "pt", "fr", "ge", "zh"]:
    for v_num, voz in VOZES_MAP[lg].items():
        fila_trabalho.append((lg, 1, v_num, voz, dados_csv[1].get(lg, "").strip()))

print("=" * 65)
print(f"TOTAL DE AUDIOS DE FRASES A PROCESSAR: {len(fila_trabalho)}")
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
        # Sintese com Edge-TTS
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

        # Upload ao Supabase Storage
        loop = asyncio.get_event_loop()
        sucesso_upload = await loop.run_in_executor(None, upload_supabase, caminho_local, lang, nome_arquivo)

        if sucesso_upload:
            progresso["concluidos"] += 1
        else:
            progresso["erros"] += 1
            print(f"\n[ERRO UPLOAD] {lang}/{nome_arquivo}")

        total = len(fila_trabalho)
        pct = (progresso["concluidos"] / total) * 100
        print(f"Processando audios de frases: {progresso['concluidos']}/{total} ({pct:.1f}%) | Falhas: {progresso['erros']}", end="\r", flush=True)

async def main():
    tarefas = [processar_item(lg, fid, vn, vz, tx) for lg, fid, vn, vz, tx in fila_trabalho]
    await asyncio.gather(*tarefas)
    print(f"\nConcluido! Total finalizados: {progresso['concluidos']} | Erros: {progresso['erros']}")

if __name__ == "__main__":
    asyncio.run(main())
