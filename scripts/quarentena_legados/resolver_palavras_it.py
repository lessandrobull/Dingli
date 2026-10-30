# -*- coding: utf-8 -*-
import os
import shutil
import asyncio
import subprocess
import edge_tts

PASTA_IT = os.path.join("audios_dingli", "palavras", "it")
PASTA_QUARENTENA = os.path.join("audios_dingli", "quarentena_orfaos", "it")
FFMPEG = os.path.abspath("ffmpeg.exe")
VOZ = "it-IT-IsabellaNeural"

os.makedirs(PASTA_QUARENTENA, exist_ok=True)

# 1. Carregar lista de faltantes e órfãs geradas na auditoria
faltantes = {}
with open("palavras_it_faltantes.txt", "r", encoding="utf-8") as f:
    for l in f:
        partes = l.strip().split("\t")
        if len(partes) == 2:
            faltantes[partes[0]] = partes[1]

with open("palavras_it_orfas.txt", "r", encoding="utf-8") as f:
    orfas = [l.strip() for l in f if l.strip()]

print("=" * 65)
print(f"1. RELAÇÃO COMPLETA DAS {len(faltantes)} PALAVRAS FALTANTES")
print("=" * 65)
for slug, falar in sorted(faltantes.items()):
    print(f"  slug: {slug:<30} | falar: '{falar}'")

print("\n" + "=" * 65)
print("2. ISOLAMENTO DAS 1.591 ÓRFÃS PARA QUARENTENA")
print("=" * 65)
protegidos = {"5550192"}
movidos = 0
for slug in orfas:
    if slug in protegidos:
        continue
    arq = f"{slug}.mp3"
    origem = os.path.join(PASTA_IT, arq)
    destino = os.path.join(PASTA_QUARENTENA, arq)
    if os.path.exists(origem):
        shutil.move(origem, destino)
        movidos += 1

print(f"✔ Arquivos movidos com segurança para quarentena_orfaos/it: {movidos}")

print("\n" + "=" * 65)
print(f"3. SÍNTESE COM ISABELLANEURAL + FFMPEG 300ms/100ms")
print("=" * 65)
async def sintetizar():
    for slug, texto in sorted(faltantes.items()):
        raw_mp3 = os.path.join(PASTA_IT, f"{slug}_raw.mp3")
        final_mp3 = os.path.join(PASTA_IT, f"{slug}.mp3")
        
        # Síntese neural Edge-TTS
        com = edge_tts.Communicate(texto, VOZ)
        await com.save(raw_mp3)
        
        # Injeção de 300ms adelay e 100ms apad via FFmpeg
        cmd = [
            FFMPEG, "-y", "-i", raw_mp3,
            "-af", "adelay=300|300,apad=pad_dur=0.1",
            "-b:a", "128k", final_mp3
        ]
        res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        if os.path.exists(raw_mp3):
            os.remove(raw_mp3)
            
        if res.returncode == 0 and os.path.exists(final_mp3) and os.path.getsize(final_mp3) > 0:
            print(f"  ✔ Gerado com silêncio: {slug}.mp3 (input: '{texto}')")
        else:
            print(f"  ✖ Falha ao processar: {slug}.mp3")

asyncio.run(sintetizar())

total_final = len([f for f in os.listdir(PASTA_IT) if f.endswith(".mp3")])
print("\n" + "=" * 65)
print(f"CONFERÊNCIA FINAL LOCAL: {total_final} / 2148 arquivos")
print("=" * 65)
if total_final == 2148:
    print("✔ Paridade local absoluta: exatamente 2.148 palavras oficiais prontas!")
else:
    print(f"⚠ Atenção: total diverge em {total_final - 2148} arquivos.")
