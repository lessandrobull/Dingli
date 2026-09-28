# -*- coding: utf-8 -*-
import json, urllib.request, csv, os, re, unicodedata

SUPABASE_URL = "https://lxdmfaxxxfyzbpzvniyi.supabase.co"
KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4ZG1mYXh4eGZ5emJwenZuaXlpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTI1NDE1MSwiZXhwIjoyMTA0ODMwMTUxfQ.ENxy63EZgvUIc8YKuaikrSnt2-Eja-4JLQ3PvOrb13U"
CSV_FILE = "supabase_sentences.csv"

def sanitizar(p):
    sem_p = re.sub(r'[.,!?;:¿¡"“”`{}()[\]\-—…，。！？；：、«»/\\~*]', '', (p or '').strip().lower()).replace("'", "_").replace('’', '_')
    if not sem_p: return ''
    nfd = unicodedata.normalize('NFD', sem_p)
    mapa = {
        '\u0300': 'grave', '\u0301': 'acute', '\u0302': 'circ', '\u0303': 'tilde',
        '\u0308': 'uml', '\u0327': 'ced', '\u0304': 'macron', '\u030c': 'caron'
    }
    base, marcas, ult = [], [], ''
    for c in nfd:
        if c in mapa: marcas.append(f'{ult}_{mapa[c]}')
        elif not ('\u0300' <= c <= '\u036f'): base.append(c); ult = c
    s = re.sub(r'[^a-zA-Z0-9_-]', '', ''.join(base))
    return f'{s}_{"_".join(marcas)}' if marcas else s

print("=" * 65)
print("1. INVENTARIO DO SUPABASE STORAGE (BUCKET OFICIAL)")
print("=" * 65)

def listar_pasta(bucket, prefixo=""):
    url = f"{SUPABASE_URL}/storage/v1/object/list/{bucket}"
    payload = json.dumps({
        "prefix": prefixo,
        "limit": 10000,
        "sortBy": {"column": "name", "order": "asc"}
    }).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={
        "apikey": KEY,
        "Authorization": f"Bearer {KEY}",
        "Content-Type": "application/json"
    }, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        return []

req_b = urllib.request.Request(f"{SUPABASE_URL}/storage/v1/bucket", headers={
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}"
})

try:
    with urllib.request.urlopen(req_b, timeout=30) as resp:
        buckets = json.loads(resp.read().decode("utf-8"))
    for b in buckets:
        b_id = b["id"]
        print(f"\n[Bucket: {b_id}]")
        itens_raiz = listar_pasta(b_id, "")
        pastas = [item["name"] for item in itens_raiz if item.get("id") is None]
        arqs_raiz = [item["name"] for item in itens_raiz if item.get("id") is not None]
        if arqs_raiz:
            print(f"  Raiz: {len(arqs_raiz)} arquivos")
        for pasta in pastas:
            itens_sub = listar_pasta(b_id, f"{pasta}/")
            subpastas = [i["name"] for i in itens_sub if i.get("id") is None]
            arqs = [i["name"] for i in itens_sub if i.get("id") is not None]
            if arqs:
                print(f"  PASTA: {pasta:<25} : {len(arqs)} arquivos")
            for sub in subpastas:
                itens_sub2 = listar_pasta(b_id, f"{pasta}/{sub}/")
                arqs2 = [i["name"] for i in itens_sub2 if i.get("id") is not None]
                print(f"  PASTA: {pasta}/{sub:<22} : {len(arqs2)} arquivos")
except Exception as e:
    print("Erro ao auditar Supabase:", e)

print("\n" + "=" * 65)
print("2. QUAIS PALAVRAS EXATAS ESTAO FALTANDO NO DISCO LOCAL")
print("=" * 65)

mapa_colunas = {'en': 'en', 'pt': 'pt', 'es': 'es', 'fr': 'fr', 'it': 'it', 'ge': 'ge'}

with open(CSV_FILE, mode='r', encoding='utf-8-sig') as f:
    linhas = list(csv.DictReader(f))

for idm, col in mapa_colunas.items():
    pasta_disco = os.path.join('audios_dingli', 'palavras', idm)
    no_disco = set([f[:-4] for f in os.listdir(pasta_disco) if f.endswith('.mp3')]) if os.path.exists(pasta_disco) else set()
    
    esperados_mapa = {}
    for r in linhas:
        val = (r.get(col) or '').strip()
        if val:
            for t in val.split():
                s = sanitizar(t)
                if s and s not in no_disco:
                    esperados_mapa[s] = t
    
    if esperados_mapa:
        print(f"[{idm.upper()}] Faltando {len(esperados_mapa)} palavras: {list(esperados_mapa.items())[:10]}")
    else:
        print(f"[{idm.upper()}] 100% completo! Nenhuma palavra faltando.")
