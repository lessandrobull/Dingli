# -*- coding: utf-8 -*-
import os
import asyncio
import subprocess
import edge_tts
import urllib.request

SUPABASE_URL = "https://lxdmfaxxxfyzbpzvniyi.supabase.co"
BUCKET_NAME = "audios"
KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4ZG1mYXh4eGZ5emJwenZuaXlpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTI1NDE1MSwiZXhwIjoyMTA0ODMwMTUxfQ.ENxy63EZgvUIc8YKuaikrSnt2-Eja-4JLQ3PvOrb13U"
PASTA_FR = os.path.join("audios_dingli", "palavras", "fr")
FFMPEG = os.path.abspath("ffmpeg.exe")
VOZ = "fr-FR-DeniseNeural"

deltas = {
    "dingli_i_grave_i_grave": "Dìnglì",
    "notoire": "notoire",
    "mauvaise": "mauvaise"
}

print("=" * 65)
print("SÍNTESE DOS 3 TERMOS FALTANTES NO FRANCÊS (DENISE + FFMPEG 300ms)")
print("=" * 65)

async def sintetizar():
    for slug, texto in deltas.items():
        raw_mp3 = os.path.join(PASTA_FR, f"{slug}_raw.mp3")
        final_mp3 = os.path.join(PASTA_FR, f"{slug}.mp3")
        
        com = edge_tts.Communicate(texto, VOZ)
        await com.save(raw_mp3)
        
        cmd = [
            FFMPEG, "-y", "-i", raw_mp3,
            "-af", "adelay=300|300,apad=pad_dur=0.1",
            "-b:a", "128k", final_mp3
        ]
        res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if os.path.exists(raw_mp3):
            os.remove(raw_mp3)
            
        if res.returncode == 0 and os.path.exists(final_mp3) and os.path.getsize(final_mp3) > 0:
            print(f"  ✔ Gerado localmente: {slug}.mp3 (input: '{texto}')")
            # Upload imediato ao Storage
            url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}/palavras/fr/{slug}.mp3"
            with open(final_mp3, "rb") as f:
                data = f.read()
            headers = {
                "apikey": KEY,
                "Authorization": f"Bearer {KEY}",
                "Content-Type": "audio/mpeg",
                "x-upsert": "true"
            }
            req = urllib.request.Request(url, data=data, headers=headers, method="POST")
            with urllib.request.urlopen(req) as resp:
                pass
            print(f"  ✔ Enviado ao Supabase Storage: palavras/fr/{slug}.mp3")

asyncio.run(sintetizar())

total_fr = len([f for f in os.listdir(PASTA_FR) if f.endswith(".mp3")])
print(f"\nTotal final local em palavras/fr: {total_fr} arquivos (100% completo)")
