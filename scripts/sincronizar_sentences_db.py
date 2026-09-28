# -*- coding: utf-8 -*-
import os, sys, csv, glob, json, urllib.request

env = {}
caminho_env = os.path.abspath(".env.local")
if not os.path.exists(caminho_env):
    raise FileNotFoundError("Arquivo .env.local não encontrado na raiz.")

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

CSV_FILE = "supabase_sentences.csv"
backups = sorted(glob.glob("backups/sentences_backup_*.csv"))
if not backups:
    raise FileNotFoundError("Nenhum backup encontrado em backups/. Execute o Passo 6 antes.")

ultimo_backup = backups[-1]
print("=" * 65)
print(" DÌNGLÌ - SINCRONIZAÇÃO DA TABELA SENTENCES (SUPABASE DB)")
print(f" Backup de referência: {ultimo_backup}")
print(f" Arquivo CSV local:     {CSV_FILE}")
print("=" * 65)

db_data = {int(r["id"]): r for r in csv.DictReader(open(ultimo_backup, encoding="utf-8-sig", errors="ignore"))}
csv_data = {int(r["id"]): r for r in csv.DictReader(open(CSV_FILE, encoding="utf-8-sig", errors="ignore"))}

colunas = ["ge", "en", "es", "fr", "it", "pt", "zh", "pi"]
atualizacoes = {}

for fid, r_csv in sorted(csv_data.items()):
    r_db = db_data.get(fid, {})
    delta = {}
    for col in colunas:
        val_csv = (r_csv.get(col) or "").strip()
        val_db = (r_db.get(col) or "").strip()
        if val_csv and val_csv != val_db:
            delta[col] = val_csv
    if delta:
        atualizacoes[fid] = delta

if not atualizacoes:
    print("✔ Nenhuma diferença detectada. Banco de dados já está 100% em sincronia!")
    sys.exit(0)

print(f"Total de sentenças com alteração detectada: {len(atualizacoes)}")

headers = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

sucesso = 0
erros = 0
total = len(atualizacoes)

for fid, delta in atualizacoes.items():
    url = f"{SUPABASE_URL}/rest/v1/sentences?id=eq.{fid}"
    data_bytes = json.dumps(delta).encode("utf-8")
    req = urllib.request.Request(url, data=data_bytes, headers=headers, method="PATCH")
    try:
        with urllib.request.urlopen(req) as resp:
            if resp.status in (200, 204):
                sucesso += 1
            else:
                erros += 1
                print(f"\n[ERRO HTTP {resp.status}] ID {fid}")
    except Exception as e:
        erros += 1
        print(f"\n[FALHA] ID {fid}: {e}")

    pct = (sucesso / total) * 100 if total > 0 else 100
    print(f"Atualizando Supabase: {sucesso}/{total} ({pct:.1f}%) | Falhas: {erros}", end="\r", flush=True)

print(f"\n\n✔ SINCRONIZAÇÃO CONCLUÍDA! Sucessos: {sucesso} | Erros: {erros}")
