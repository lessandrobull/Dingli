# -*- coding: utf-8 -*-
import os
import shutil
import asyncio
import subprocess
import urllib.request
import json
import edge_tts
import csv
import unicodedata
import re

SUPABASE_URL = "https://lxdmfaxxxfyzbpzvniyi.supabase.co"
BUCKET_NAME = "audios"
KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4ZG1mYXh4eGZ5emJwenZuaXlpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTI1NDE1MSwiZXhwIjoyMTA0ODMwMTUxfQ.ENxy63EZgvUIc8YKuaikrSnt2-Eja-4JLQ3PvOrb13U"
CSV_FILE = "supabase_sentences.csv"
PASTA_PALAVRAS = os.path.join("audios_dingli", "palavras")
PASTA_QUARENTENA = os.path.join("audios_dingli", "quarentena_orfaos")
FFMPEG = os.path.abspath("ffmpeg.exe")

VOZES = {
    "es": "es-MX-DaliaNeural",
    "pt": "pt-BR-FranciscaNeural"
}

def sanitizar_palavra_audio_frontend(palavra):
    p = (palavra or "").strip().lower().replace('ß', 'ss')
    sem_pontuacao = re.sub(r'[.,!?;:¿¡"“”`{}()[\]\-—…，。！？；：、«»/\\~*]', '', p)
    sem_pontuacao = re.sub(r"['’]", "_", sem_pontuacao)
    if not sem_pontuacao:
        return ""
    nfd = unicodedata.normalize("NFD", sem_pontuacao)
    mapa_diacriticos = {
        "\u0300": "grave", "\u0301": "acute", "\u0302": "circ",
        "\u0303": "tilde", "\u0308": "uml", "\u0327": "ced",
        "\u0304": "macron", "\u030c": "caron"
    }
    base_chars, marcas, ultimo_char_base = [], [], ""
    for char in nfd:
        if char in mapa_diacriticos:
            marcas.append(f"{ultimo_char_base}_{mapa_diacriticos[char]}")
        else:
            if not ("\u0300" <= char <= "\u036f"):
                base_chars.append(char)
                ultimo_char_base = char
    slug_base = re.sub(r"[^a-zA-Z0-9_-]", "", "".join(base_chars))
    return f"{slug_base}_{'_'.join(marcas)}" if marcas else slug_base

with open(CSV_FILE, "r", encoding="utf-8-sig", errors="ignore") as f:
    linhas = list(csv.DictReader(f))

faltantes_sintese = {
    "es": {
        "aficion_o_acute": "afición",
        "dingli_i_grave_i_grave": "Dìnglì",
        "hacia_i_acute": "hacía",
        "magnifico_i_acute": "magnífico",
        "medicacion_o_acute": "medicación",
        "muchisimo_i_acute": "muchísimo",
        "origenes_i_acute": "orígenes",
        "panoramica_a_acute": "panorámica",
        "periodica_o_acute": "periódica",
        "quedo_o_acute": "quedó",
        "reprogramaramos_a_acute": "reprogramáramos",
        "sabia_i_acute": "sabía",
        "senior_e_acute": "sénior"
    },
    "pt": {
        "dingli_i_grave_i_grave": "Dìnglì",
        "macarrao_a_tilde": "macarrão",
        "subsidio_i_acute": "subsídio"
    }
}

print("=" * 70)
print("1. RESGATE DA QUARENTENA E ISOLAMENTO DE PLANOS (ES & PT)")
print("=" * 70)

for lg in ["es", "pt"]:
    pasta_oficial = os.path.join(PASTA_PALAVRAS, lg)
    pasta_q = os.path.join(PASTA_QUARENTENA, lg)
    
    # Vocabulário oficial esperado
    vocab_oficial = set()
    for row in linhas:
        txt = row.get(lg, "")
        for w in txt.split():
            s = sanitizar_palavra_audio_frontend(w)
            if s: vocab_oficial.add(s)
            
    # Resgatar da quarentena
    resgatados = 0
    if os.path.exists(pasta_q):
        for f in os.listdir(pasta_q):
            slug = os.path.splitext(f)[0]
            if slug in vocab_oficial:
                origem = os.path.join(pasta_q, f)
                destino = os.path.join(pasta_oficial, f)
                shutil.move(origem, destino)
                resgatados += 1
    print(f"[{lg.upper()}] Arquivos resgatados da quarentena: {resgatados}")
    
    # Mover os arquivos planos/órfãos da pasta oficial para a quarentena
    isolados = 0
    for f in list(os.listdir(pasta_oficial)):
        if not f.endswith(".mp3"): continue
        slug = os.path.splitext(f)[0]
        if slug not in vocab_oficial and slug != "5550192":
            origem = os.path.join(pasta_oficial, f)
            destino = os.path.join(pasta_q, f)
            shutil.move(origem, destino)
            isolados += 1
    print(f"[{lg.upper()}] Arquivos planos/órfãos isolados na quarentena: {isolados}")

print("\n" + "=" * 70)
print("2. SÍNTESE DOS TERMOS FALTANTES (FFMPEG 300ms/100ms)")
print("=" * 70)

async def sintetizar_termos():
    for lg, termos in faltantes_sintese.items():
        voz = VOZES[lg]
        pasta_lg = os.path.join(PASTA_PALAVRAS, lg)
        for slug, texto in termos.items():
            raw_mp3 = os.path.join(pasta_lg, f"{slug}_raw.mp3")
            final_mp3 = os.path.join(pasta_lg, f"{slug}.mp3")
            
            com = edge_tts.Communicate(texto, voz)
            await com.save(raw_mp3)
            
            cmd = [
                FFMPEG, "-y", "-i", raw_mp3,
                "-af", "adelay=300|300,apad=pad_dur=0.1",
                "-b:a", "128k", final_mp3
            ]
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            if os.path.exists(raw_mp3):
                os.remove(raw_mp3)
            if os.path.exists(final_mp3) and os.path.getsize(final_mp3) > 0:
                print(f"  ✔ [{lg.upper()}] Gerado com silêncio: {slug}.mp3 (input: '{texto}')")

asyncio.run(sintetizar_termos())

for lg, esperado in [("es", 2084), ("pt", 2055)]:
    tot = len([f for f in os.listdir(os.path.join(PASTA_PALAVRAS, lg)) if f.endswith(".mp3")])
    print(f"[{lg.upper()}] Total final no disco: {tot} / {esperado}")
    assert tot == esperado, f"Discrepância local detectada em {lg}!"

print("\n" + "=" * 70)
print("3. UPLOAD DAS PALAVRAS RESGATADAS/NOVAS AO SUPABASE STORAGE")
print("=" * 70)

def listar_remoto(prefixo):
    arquivos = []
    limit = 1000
    offset = 0
    url = f"{SUPABASE_URL}/storage/v1/object/list/{BUCKET_NAME}"
    headers = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}
    while True:
        body = json.dumps({"prefix": prefixo, "limit": limit, "offset": offset, "sortBy": {"column": "name", "order": "asc"}}).encode("utf-8")
        req = urllib.request.Request(url, data=body, headers=headers, method="POST")
        with urllib.request.urlopen(req) as resp:
            itens = json.loads(resp.read().decode("utf-8"))
            if not itens: break
            for it in itens:
                nome = it.get("name")
                if nome and not nome.endswith("/"):
                    arquivos.append(nome)
            if len(itens) < limit: break
            offset += limit
    return arquivos

for lg in ["es", "pt"]:
    pasta_lg = os.path.join(PASTA_PALAVRAS, lg)
    arquivos_locais = set(f for f in os.listdir(pasta_lg) if f.endswith(".mp3"))
    remotos = set(listar_remoto(f"palavras/{lg}"))
    
    # Arquivos que precisam subir
    para_subir = arquivos_locais - remotos
    print(f"[{lg.upper()}] Arquivos a enviar para o Storage: {len(para_subir)}")
    
    enviados = 0
    for arq in para_subir:
        caminho = os.path.join(pasta_lg, arq)
        url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}/palavras/{lg}/{arq}"
        with open(caminho, "rb") as f:
            data = f.read()
        headers = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "audio/mpeg", "x-upsert": "true"}
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        with urllib.request.urlopen(req) as resp:
            pass
        enviados += 1
        if enviados % 50 == 0 or enviados == len(para_subir):
            print(f"  Progresso upload [{lg.upper()}]: {enviados}/{len(para_subir)}", end="\r", flush=True)
    if para_subir:
        print(f"\n✔ [{lg.upper()}] Todos os {enviados} arquivos enviados com sucesso!")

print("\n" + "=" * 70)
print("4. EXPURGO DE ARQUIVOS PLANOS/ÓRFÃOS DO SUPABASE STORAGE")
print("=" * 70)

for lg in ["es", "pt"]:
    pasta_lg = os.path.join(PASTA_PALAVRAS, lg)
    oficiais_locais = set(f for f in os.listdir(pasta_lg) if f.endswith(".mp3"))
    remotos = listar_remoto(f"palavras/{lg}")
    excedentes = [f for f in remotos if f not in oficiais_locais]
    
    print(f"[{lg.upper()}] Total remoto: {len(remotos)} | Excedentes a expurgar: {len(excedentes)}")
    
    url_del = f"{SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}"
    headers_del = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}
    lote_size = 100
    deletados = 0
    for i in range(0, len(excedentes), lote_size):
        lote = [f"palavras/{lg}/{nome}" for nome in excedentes[i:i + lote_size]]
        payload = json.dumps({"prefixes": lote}).encode("utf-8")
        req = urllib.request.Request(url_del, data=payload, headers=headers_del, method="DELETE")
        with urllib.request.urlopen(req) as resp:
            pass
        deletados += len(lote)
        print(f"  Expurgando [{lg.upper()}]: {deletados}/{len(excedentes)}", end="\r", flush=True)
    if excedentes:
        print(f"\n✔ [{lg.upper()}] {deletados} arquivos planos removidos do Storage!")

print("\n" + "=" * 70)
print("5. AUDITORIA FINAL DE PARIDADE REMOTA (ES & PT)")
print("=" * 70)

for lg, meta in [("es", 2084), ("pt", 2055)]:
    finais = listar_remoto(f"palavras/{lg}")
    print(f"[{lg.upper()}] Supabase Storage: {len(finais)} / {meta} palavras")
    if len(finais) == meta:
        print(f"🎉 100% DE PARIDADE ATINGIDA NO STORAGE ({lg.upper()})!")
    else:
        print(f"⚠ Divergência: {len(finais) - meta}")
