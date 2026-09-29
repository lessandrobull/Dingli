# -*- coding: utf-8 -*-
import os, sys, csv, json, datetime, urllib.request

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

caminho_env = os.path.abspath(".env.local")
if not os.path.exists(caminho_env):
    raise FileNotFoundError("Arquivo .env.local não encontrado na raiz.")

env = {}
with open(caminho_env, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()

SUPABASE_URL = env.get("SUPABASE_URL")
KEY = env.get("SUPABASE_SERVICE_ROLE_KEY")
if not SUPABASE_URL or not KEY:
    raise ValueError("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes no .env.local.")

os.makedirs("backups", exist_ok=True)
timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
caminho_backup = os.path.join("backups", f"sentences_backup_{timestamp}.csv")

print("=" * 65)
print(" DÌNGLÌ - PASSO 4: BACKUP SUPABASE DB + ATUALIZAÇÃO LOCAL")
print("=" * 65)

# A. Extrair backup completo de sentences (1.200 frases) via paginação REST API
headers = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Accept": "application/json"
}

dados_banco = []
offset = 0
limite = 1000

while True:
    url_lote = f"{SUPABASE_URL}/rest/v1/sentences?select=*&order=id.asc&limit={limite}&offset={offset}"
    req = urllib.request.Request(url_lote, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as resp:
        lote = json.loads(resp.read().decode("utf-8"))
    if not lote:
        break
    dados_banco.extend(lote)
    if len(lote) < limite:
        break
    offset += limite

assert len(dados_banco) == 1200, f"Erro: Supabase retornou {len(dados_banco)} frases (esperado: 1200)!"

colunas_db = ["id", "ge", "en", "es", "fr", "it", "pt", "zh", "pi"]
with open(caminho_backup, "w", encoding="utf-8-sig", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=colunas_db)
    writer.writeheader()
    for row in dados_banco:
        writer.writerow({c: row.get(c, "") for c in colunas_db})

print(f"✔ 1. Backup gerado com sucesso: {caminho_backup} (1.200 frases paginadas)")

# B. Se houver arquivo JSON com revisões aprovadas, aplicar no supabase_sentences.csv
arquivo_patch = sys.argv[1] if len(sys.argv) > 1 else None
if arquivo_patch and os.path.exists(arquivo_patch):
    with open(arquivo_patch, "r", encoding="utf-8") as f:
        alteracoes = json.load(f)

    linhas_csv = []
    fieldnames_originais = []
    with open("supabase_sentences.csv", "r", encoding="utf-8-sig", errors="ignore") as f:
        reader = csv.DictReader(f)
        fieldnames_originais = reader.fieldnames
        for r in reader:
            fid = str(r.get("id"))
            if fid in alteracoes:
                for col, val in alteracoes[fid].items():
                    r[col] = val
            linhas_csv.append(r)

    assert len(linhas_csv) == 1200, f"Erro: Esperado 1200 frases, encontrado {len(linhas_csv)}!"

    with open("supabase_sentences.csv", "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames_originais)
        writer.writeheader()
        writer.writerows(linhas_csv)

    print(f"✔ 2. CSV local atualizado com {len(alteracoes)} sentenças modificadas!")
    print(f"     Todas as {len(fieldnames_originais)} colunas curriculares foram preservadas.")
else:
    print("✔ 2. Backup registrado. Nenhum arquivo de alterações pendente de injeção imediata.")
