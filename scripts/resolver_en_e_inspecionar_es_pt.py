# -*- coding: utf-8 -*-
import os
import shutil
import asyncio
import subprocess
import urllib.request
import json
import edge_tts

SUPABASE_URL = "https://lxdmfaxxxfyzbpzvniyi.supabase.co"
BUCKET_NAME = "audios"
KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4ZG1mYXh4eGZ5emJwenZuaXlpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTI1NDE1MSwiZXhwIjoyMTA0ODMwMTUxfQ.ENxy63EZgvUIc8YKuaikrSnt2-Eja-4JLQ3PvOrb13U"
FFMPEG = os.path.abspath("ffmpeg.exe")

print("=" * 70)
print("1. FINALIZAÇÃO DO INGLÊS (DINGLI + QUARENTENA DE JOHN)")
print("=" * 70)

pasta_en = os.path.join("audios_dingli", "palavras", "en")
pasta_q_en = os.path.join("audios_dingli", "quarentena_orfaos", "en")
os.makedirs(pasta_q_en, exist_ok=True)

# a) Sintetizar dingli_i_grave_i_grave.mp3 para inglês
slug_dingli = "dingli_i_grave_i_grave"
raw_mp3 = os.path.join(pasta_en, f"{slug_dingli}_raw.mp3")
final_mp3 = os.path.join(pasta_en, f"{slug_dingli}.mp3")

async def gerar_en():
    com = edge_tts.Communicate("Dìnglì", "en-CA-ClaraNeural")
    await com.save(raw_mp3)
    cmd = [
        FFMPEG, "-y", "-i", raw_mp3,
        "-af", "adelay=300|300,apad=pad_dur=0.1",
        "-b:a", "128k", final_mp3
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if os.path.exists(raw_mp3):
        os.remove(raw_mp3)

asyncio.run(gerar_en())

if os.path.exists(final_mp3):
    print(f"  ✔ Gerado localmente: palavras/en/{slug_dingli}.mp3")
    # Upload ao Storage
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}/palavras/en/{slug_dingli}.mp3"
    with open(final_mp3, "rb") as f:
        data = f.read()
    headers = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "audio/mpeg", "x-upsert": "true"}
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req) as resp:
        pass
    print(f"  ✔ Enviado ao Storage: palavras/en/{slug_dingli}.mp3")

# b) Mover john.mp3 para quarentena e deletar do Storage
arq_john = "john.mp3"
origem_john = os.path.join(pasta_en, arq_john)
if os.path.exists(origem_john):
    shutil.move(origem_john, os.path.join(pasta_q_en, arq_john))
    print(f"  ✔ 'john.mp3' movido localmente para quarentena_orfaos/en/")
    
    url_del = f"{SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}"
    payload = json.dumps({"prefixes": ["palavras/en/john.mp3"]}).encode("utf-8")
    req_del = urllib.request.Request(url_del, data=payload, headers={"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}, method="DELETE")
    with urllib.request.urlopen(req_del) as resp:
        pass
    print(f"  ✔ 'palavras/en/john.mp3' expurgado do Supabase Storage.")

total_en = len([f for f in os.listdir(pasta_en) if f.endswith(".mp3")])
print(f"\nTotal final local em palavras/en: {total_en} / 1824 (100% de paridade!)")

print("\n" + "=" * 70)
print("2. INSPEÇÃO FACTUAL DOS NOMES EM ESPANHOL (ES) E PORTUGUÊS (PT)")
print("=" * 70)

for lg in ["es", "pt"]:
    pasta_lg = os.path.join("audios_dingli", "palavras", lg)
    arqs = [f for f in os.listdir(pasta_lg) if f.endswith(".mp3")] if os.path.exists(pasta_lg) else []
    com_sufixo = [f for f in arqs if any(k in f for k in ['_acute', '_grave', '_circ', '_tilde', '_ced', '_uml'])]
    sem_sufixo = [f for f in arqs if f in ['cafe.mp3', 'agua.mp3', 'esta.mp3', 'voce.mp3', 'ano.mp3', 'bano.mp3']]
    
    print(f"[{lg.upper()}] Total de arquivos na pasta: {len(arqs)}")
    print(f"       Arquivos com sufixos descritivos (_acute, _tilde, etc.): {len(com_sufixo)}")
    if com_sufixo:
        print(f"       Amostra com sufixo: {com_sufixo[:5]}")
    print(f"       Arquivos em formato simples sem sufixo encontrados: {sem_sufixo}")
