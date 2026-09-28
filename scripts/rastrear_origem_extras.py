# -*- coding: utf-8 -*-
import json, os, subprocess, urllib.request

SUPABASE_URL = "https://lxdmfaxxxfyzbpzvniyi.supabase.co"
KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4ZG1mYXh4eGZ5emJwenZuaXlpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTI1NDE1MSwiZXhwIjoyMTA0ODMwMTUxfQ.ENxy63EZgvUIc8YKuaikrSnt2-Eja-4JLQ3PvOrb13U"

print("=" * 60)
print("1. CONSULTA AO HISTÓRICO DO GIT")
print("=" * 60)

# Busca nos commits se palavras como 'acclimated' ou 'aborted' já existiram em arquivos rastreados
palavras_teste = ['acclimated', 'aborted', 'academic']
for p in palavras_teste:
    cmd = ['git', 'log', '-S', p, '--oneline']
    res = subprocess.run(cmd, capture_output=True, text=True)
    commits = res.stdout.strip()
    if commits:
        print(f"Palavra '{p}' encontrada nos commits:\n{commits}")
    else:
        print(f"Palavra '{p}' NUNCA existiu em nenhum commit do Git.")

print("\n" + "=" * 60)
print("2. CONSULTA AO BANCO DE DADOS DO SUPABASE")
print("=" * 60)

# A. Descobrir quais tabelas existem no banco
req_tables = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/", headers={
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}"
})
try:
    with urllib.request.urlopen(req_tables) as resp:
        schema = json.loads(resp.read().decode('utf-8'))
        tabelas = list(schema.get('definitions', {}).keys())
        print(f"Tabelas existentes no Supabase: {tabelas}")
except Exception as e:
    print(f"Erro ao consultar schema: {e}")

# B. Total exato de linhas na tabela sentences
req_count = urllib.request.Request(
    f"{SUPABASE_URL}/rest/v1/sentences?select=id",
    headers={"apikey": KEY, "Authorization": f"Bearer {KEY}", "Prefer": "count=exact", "Range": "0-0"}
)
try:
    with urllib.request.urlopen(req_count) as resp:
        print(f"Contagem total de registros em 'sentences': {resp.headers.get('Content-Range')}")
except Exception as e:
    print(f"Erro na contagem de sentences: {e}")

# C. Verificar se existem registros com id > 1200
req_gt = urllib.request.Request(
    f"{SUPABASE_URL}/rest/v1/sentences?id=gt.1200&select=id,en",
    headers={"apikey": KEY, "Authorization": f"Bearer {KEY}"}
)
try:
    with urllib.request.urlopen(req_gt) as resp:
        linhas_extras = json.loads(resp.read().decode('utf-8'))
        print(f"Linhas em 'sentences' com id > 1200: {len(linhas_extras)}")
        if linhas_extras:
            print(f"Exemplo de linha extra: {linhas_extras[:2]}")
except Exception as e:
    print(f"Erro ao buscar id > 1200: {e}")

# D. Buscar diretamente se 'acclimated' ou 'aborted' existem em 'sentences'
for p in ['acclimated', 'aborted']:
    req_word = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/sentences?en=ilike.*{p}*&select=id,en",
        headers={"apikey": KEY, "Authorization": f"Bearer {KEY}"}
    )
    try:
        with urllib.request.urlopen(req_word) as resp:
            achados = json.loads(resp.read().decode('utf-8'))
            print(f"Busca por '{p}' na tabela 'sentences': {len(achados)} ocorrências {achados}")
    except Exception as e:
        print(f"Erro ao buscar '{p}': {e}")
