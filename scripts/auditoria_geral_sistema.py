# -*- coding: utf-8 -*-
import os
import json
import urllib.request
import urllib.parse
import csv

SUPABASE_URL = "https://lxdmfaxxxfyzbpzvniyi.supabase.co"
KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4ZG1mYXh4eGZ5emJwenZuaXlpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTI1NDE1MSwiZXhwIjoyMTA0ODMwMTUxfQ.ENxy63EZgvUIc8YKuaikrSnt2-Eja-4JLQ3PvOrb13U"
BUCKET = "audios"
CSV_FILE = "supabase_sentences.csv"
PASTA_AUDIOS = "audios_dingli"

print("=" * 70)
print("1. INVENTÁRIO DO CSV LOCAL (supabase_sentences.csv)")
print("=" * 70)
if os.path.exists(CSV_FILE):
    with open(CSV_FILE, 'r', encoding='utf-8-sig', errors='ignore') as f:
        reader = csv.DictReader(f)
        linhas_csv = list(reader)
        print(f"Total de frases no CSV: {len(linhas_csv)}")
        colunas = reader.fieldnames or []
        print(f"Colunas presentes: {colunas}")
else:
    linhas_csv = []
    print(f"Arquivo {CSV_FILE} não encontrado.")

print("\n" + "=" * 70)
print("2. INVENTÁRIO LOCAL DE ÁUDIOS (audios_dingli)")
print("=" * 70)
idiomas = ["en", "es", "fr", "it", "pt", "ge", "zh"]

print("--- ÁUDIOS DE FRASES COMPLETAS ---")
for lg in idiomas:
    pasta = os.path.join(PASTA_AUDIOS, lg)
    qtd = len([f for f in os.listdir(pasta) if f.endswith('.mp3')]) if os.path.exists(pasta) else 0
    print(f"  audios_dingli/{lg:<4} : {qtd:5d} arquivos .mp3")

print("\n--- ÁUDIOS DE PALAVRAS ISOLADAS ---")
for lg in idiomas:
    pasta = os.path.join(PASTA_AUDIOS, "palavras", lg)
    if os.path.exists(pasta):
        arqs = [f for f in os.listdir(pasta) if f.endswith('.mp3')]
        qtd = len(arqs)
        amostra = [f for f in arqs if any(k in f for k in ['_acute', '_grave', '_circ', '_tilde', 'caffe', 'c_e'])][:3]
        if not amostra:
            amostra = arqs[:3]
        print(f"  palavras/{lg:<4} : {qtd:5d} arquivos | Amostra: {amostra}")
    else:
        print(f"  palavras/{lg:<4} : Pasta não encontrada")

print("\n--- PASTAS DE QUARENTENA / RESÍDUOS ---")
pasta_q = os.path.join(PASTA_AUDIOS, "quarentena_orfaos")
if os.path.exists(pasta_q):
    for sub in os.listdir(pasta_q):
        sub_p = os.path.join(pasta_q, sub)
        if os.path.isdir(sub_p):
            qtd = len([f for f in os.listdir(sub_p) if f.endswith('.mp3')])
            print(f"  quarentena_orfaos/{sub:<12} : {qtd} arquivos")
else:
    print("  Nenhuma pasta de quarentena ativa em audios_dingli/quarentena_orfaos/")

print("\n" + "=" * 70)
print("3. BANCO DE DADOS SUPABASE (TABELA sentences)")
print("=" * 70)
try:
    # 1. Total de registros
    req_c = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/sentences?select=id",
        headers={"apikey": KEY, "Authorization": f"Bearer {KEY}", "Prefer": "count=exact", "Range": "0-0"}
    )
    with urllib.request.urlopen(req_c) as resp:
        crange = resp.headers.get("Content-Range")
        print(f"Total de registros remotos (Content-Range): {crange}")

    # 2. Amostra de Frases Críticas
    for f_id in [1, 561, 988, 1200]:
        req_f = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/sentences?id=eq.{f_id}&select=id,en,es,fr,it,pt,ge,zh,pi",
            headers={"apikey": KEY, "Authorization": f"Bearer {KEY}"}
        )
        with urllib.request.urlopen(req_f) as resp:
            d = json.loads(resp.read().decode('utf-8'))
            if d:
                item = d[0]
                print(f"\n[ID {f_id}]")
                print(f"  en: {item.get('en')}")
                print(f"  es: {item.get('es')}")
                print(f"  fr: {item.get('fr')}")
                print(f"  it: {item.get('it')}")
                print(f"  pt: {item.get('pt')}")
                print(f"  ge: {item.get('ge')}")
                print(f"  zh: {item.get('zh')}")
                print(f"  pi: {item.get('pi')}")
except Exception as e:
    print(f"Erro ao consultar tabela sentences: {e}")

print("\n" + "=" * 70)
print("4. SUPABASE STORAGE (BUCKET audios - CONTAGEM REAL PAGINADA)")
print("=" * 70)
def contar_storage(prefixo):
    total = 0
    limit = 1000
    offset = 0
    url = f"{SUPABASE_URL}/storage/v1/object/list/{BUCKET}"
    headers = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}
    while True:
        payload = json.dumps({
            "prefix": prefixo,
            "limit": limit,
            "offset": offset,
            "sortBy": {"column": "name", "order": "asc"}
        }).encode("utf-8")
        req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                itens = json.loads(resp.read().decode("utf-8"))
                if not itens:
                    break
                arqs = [i for i in itens if i.get("name") and not i["name"].endswith("/")]
                total += len(arqs)
                if len(itens) < limit:
                    break
                offset += limit
        except Exception:
            break
    return total

print("--- FRASES INTEIRAS (REMOTO) ---")
for lg in idiomas:
    cnt = contar_storage(f"{lg}/")
    print(f"  audios/{lg:<6} : {cnt:5d} arquivos")

print("\n--- PALAVRAS ISOLADAS (REMOTO) ---")
for lg in idiomas:
    cnt = contar_storage(f"palavras/{lg}/")
    print(f"  audios/palavras/{lg:<4} : {cnt:5d} arquivos")

print("\n" + "=" * 70)
print("5. FRONTEND: FUNÇÃO ATUAL sanitizarPalavraAudio (audioCacheService.js)")
print("=" * 70)
js_file = os.path.join("src", "services", "audioCacheService.js")
if os.path.exists(js_file):
    with open(js_file, 'r', encoding='utf-8') as f:
        linhas = f.readlines()
        imprimir = False
        cont = 0
        for l in linhas:
            if "function sanitizarPalavraAudio" in l:
                imprimir = True
            if imprimir:
                print("  " + l.rstrip())
                cont += 1
                if l.strip() == "}" and cont > 5:
                    break
