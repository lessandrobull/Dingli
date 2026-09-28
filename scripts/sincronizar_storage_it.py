# -*- coding: utf-8 -*-
import os
import json
import urllib.request

SUPABASE_URL = "https://lxdmfaxxxfyzbpzvniyi.supabase.co"
BUCKET_NAME = "audios"
KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4ZG1mYXh4eGZ5emJwenZuaXlpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTI1NDE1MSwiZXhwIjoyMTA0ODMwMTUxfQ.ENxy63EZgvUIc8YKuaikrSnt2-Eja-4JLQ3PvOrb13U"
PASTA_IT = os.path.join("audios_dingli", "palavras", "it")

# 1. Carregar as 18 palavras novas
novos = []
with open("palavras_it_faltantes.txt", "r", encoding="utf-8") as f:
    for l in f:
        partes = l.strip().split("\t")
        if partes:
            novos.append(f"{partes[0]}.mp3")

print("=" * 65)
print(f"1. UPLOAD DAS {len(novos)} PALAVRAS NOVAS DO ITALIANO")
print("=" * 65)
for arq in novos:
    caminho = os.path.join(PASTA_IT, arq)
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}/palavras/it/{arq}"
    with open(caminho, "rb") as f:
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
    print(f"  ✔ Upload concluído: palavras/it/{arq}")

# 2. Expurgo dos órfãos no Storage
print("\n" + "=" * 65)
print("2. EXPURGO DE PALAVRAS ÓRFÃS NO STORAGE (palavras/it)")
print("=" * 65)
with open("palavras_it_orfas.txt", "r", encoding="utf-8") as f:
    orfas = [f"palavras/it/{l.strip()}.mp3" for l in f if l.strip() and l.strip() != "5550192"]

total_orfas = len(orfas)
url_delete = f"{SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}"
headers_del = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json"
}

lote_size = 100
deletados = 0
for i in range(0, total_orfas, lote_size):
    lote = orfas[i:i + lote_size]
    payload = json.dumps({"prefixes": lote}).encode("utf-8")
    req = urllib.request.Request(url_delete, data=payload, headers=headers_del, method="DELETE")
    with urllib.request.urlopen(req) as resp:
        pass
    deletados += len(lote)
    pct = (deletados / total_orfas) * 100
    print(f"Expurgo remoto: {deletados}/{total_orfas} ({pct:.1f}%)", end="\r", flush=True)

print(f"\n✔ {deletados} arquivos órfãos expurgados do bucket audios/palavras/it com sucesso!")

# 3. Auditoria remota paginada final
def listar_remoto(prefixo):
    arquivos = []
    limit = 1000
    offset = 0
    url = f"{SUPABASE_URL}/storage/v1/object/list/{BUCKET_NAME}"
    headers_list = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}
    while True:
        body = json.dumps({"prefix": prefixo, "limit": limit, "offset": offset, "sortBy": {"column": "name", "order": "asc"}}).encode("utf-8")
        req = urllib.request.Request(url, data=body, headers=headers_list, method="POST")
        with urllib.request.urlopen(req) as resp:
            itens = json.loads(resp.read().decode("utf-8"))
            if not itens:
                break
            for it in itens:
                nome = it.get("name")
                if nome and not nome.endswith("/"):
                    arquivos.append(nome)
            if len(itens) < limit:
                break
            offset += limit
    return arquivos

remotos_it = listar_remoto("palavras/it")
print("\n" + "=" * 65)
print(f"AUDITORIA FINAL REMOTA: {len(remotos_it)} / 2148 palavras no Supabase")
print("=" * 65)
if len(remotos_it) == 2148:
    print("🎉 100% DE PARIDADE ATINGIDA NO STORAGE (ITALIANO)!")
else:
    print(f"Restam {len(remotos_it) - 2148} arquivos discrepantes.")
