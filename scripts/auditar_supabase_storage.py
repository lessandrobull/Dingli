# -*- coding: utf-8 -*-
import json, urllib.request

SUPABASE_URL = "https://lxdmfaxxxfyzbpzvniyi.supabase.co"
KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4ZG1mYXh4eGZ5emJwenZuaXlpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTI1NDE1MSwiZXhwIjoyMTA0ODMwMTUxfQ.ENxy63EZgvUIc8YKuaikrSnt2-Eja-4JLQ3PvOrb13U"

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
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        return []

# 1. Identificar buckets existentes
req_b = urllib.request.Request(f"{SUPABASE_URL}/storage/v1/bucket", headers={
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}"
})

print("=" * 60)
print("INVENT√ÅRIO OFICIAL DO SUPABASE STORAGE")
print("=" * 60)

with urllib.request.urlopen(req_b) as resp:
    buckets = json.loads(resp.read().decode("utf-8"))

for b in buckets:
    b_id = b["id"]
    print(f"\n[Bucket: {b_id}]")
    
    # Listar raiz do bucket
    itens_raiz = listar_pasta(b_id, "")
    pastas = [item["name"] for item in itens_raiz if item.get("id") is None]
    arquivos_raiz = [item["name"] for item in itens_raiz if item.get("id") is not None]
    
    if arquivos_raiz:
        print(f"  Raiz: {len(arquivos_raiz)} arquivos soltos")
    
    for pasta in pastas:
        itens_sub = listar_pasta(b_id, f"{pasta}/")
        subpastas = [i["name"] for i in itens_sub if i.get("id") is None]
        arquivos = [i["name"] for i in itens_sub if i.get("id") is not None]
        
        if arquivos:
            print(f"  Ì≥Å {pasta:<25} : {len(arquivos)} arquivos")
        
        for sub in subpastas:
            itens_sub2 = listar_pasta(b_id, f"{pasta}/{sub}/")
            arqs_sub2 = [i["name"] for i in itens_sub2 if i.get("id") is not None]
            print(f"  üìÅ {pasta}/{sub:<22} : {len(arqs_sub2)} arquivos")
