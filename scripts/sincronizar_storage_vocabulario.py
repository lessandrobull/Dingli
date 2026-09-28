# -*- coding: utf-8 -*-
import os, sys, json, urllib.request, urllib.parse, urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

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

BUCKET = "audios"
PASTA_PALAVRAS = os.path.join("audios_dingli", "palavras")
IDIOMAS_DISPONIVEIS = ["en", "es", "fr", "ge", "it", "pt"]

alvo = sys.argv[1].lower() if len(sys.argv) > 1 else "todos"
if alvo != "todos" and alvo not in IDIOMAS_DISPONIVEIS:
    print(f"[ERRO] Idioma '{alvo}' inválido. Válidos: {IDIOMAS_DISPONIVEIS} ou 'todos'")
    sys.exit(1)

idiomas_alvo = IDIOMAS_DISPONIVEIS if alvo == "todos" else [alvo]

print("=" * 65)
print(" DÌNGLÌ - SINCRONIZAÇÃO E PARIDADE DE STORAGE (PASSO 12)")
print(f" Idiomas selecionados: {', '.join(i.upper() for i in idiomas_alvo)}")
print("=" * 65)

def listar_remoto(prefixo):
    arquivos = []
    limit = 1000
    offset = 0
    url = f"{SUPABASE_URL}/storage/v1/object/list/{BUCKET}"
    headers = {
        "apikey": KEY,
        "Authorization": f"Bearer {KEY}",
        "Content-Type": "application/json"
    }
    while True:
        body = json.dumps({
            "prefix": prefixo,
            "limit": limit,
            "offset": offset,
            "sortBy": {"column": "name", "order": "asc"}
        }).encode("utf-8")
        req = urllib.request.Request(url, data=body, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
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
        except Exception as e:
            print(f"Erro ao listar {prefixo}: {e}")
            break
    return set(arquivos)

def upload_arquivo(item):
    lang, arq, caminho_local = item
    nome_escapado = urllib.parse.quote(arq)
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/palavras/{lang}/{nome_escapado}"

    with open(caminho_local, "rb") as f:
        conteudo = f.read()

    headers = {
        "apikey": KEY,
        "Authorization": f"Bearer {KEY}",
        "Content-Type": "audio/mpeg",
        "x-upsert": "true"
    }

    req = urllib.request.Request(url, data=conteudo, headers=headers, method="POST")
    for _ in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                if resp.status in (200, 201):
                    return True, lang, arq, None
        except urllib.error.HTTPError as e:
            if e.code in (200, 201):
                return True, lang, arq, None
            return False, lang, arq, f"HTTP {e.code}"
        except Exception:
            pass
    return False, lang, arq, "Falha de conexão"

print("\n[ETAPA 1] AUDITORIA DE FALTANTES E UPLOAD:")
fila_upload = []
for lang in idiomas_alvo:
    dir_local = os.path.join(PASTA_PALAVRAS, lang)
    if not os.path.exists(dir_local):
        continue
    locais = set(f for f in os.listdir(dir_local) if f.endswith(".mp3"))
    remotos = listar_remoto(f"palavras/{lang}")
    faltantes = locais - remotos
    print(f"  [{lang.upper()}] No Disco: {len(locais):<5} | No Storage: {len(remotos):<5} | Faltando: {len(faltantes)}")
    for f in sorted(faltantes):
        fila_upload.append((lang, f, os.path.join(dir_local, f)))

if fila_upload:
    print(f"\nEnviando {len(fila_upload)} arquivos para o Supabase Storage...")
    concluidos = 0
    erros = 0
    total = len(fila_upload)
    with ThreadPoolExecutor(max_workers=6) as executor:
        futuros = [executor.submit(upload_arquivo, item) for item in fila_upload]
        for futuro in as_completed(futuros):
            sucesso, lang, arq, msg = futuro.result()
            if sucesso:
                concluidos += 1
            else:
                erros += 1
                print(f"\n[ERRO] {lang}/{arq}: {msg}")
            pct = (concluidos / total) * 100
            print(f"Upload: {concluidos}/{total} ({pct:.1f}%) | Falhas: {erros}", end="\r", flush=True)
    print(f"\n✔ Upload concluído! Sucessos: {concluidos} | Erros: {erros}")
else:
    print("✔ Nenhum arquivo pendente de envio.")

print("\n[ETAPA 2] PURGA DE ÓRFÃOS REMOTOS:")
url_delete = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}"
headers_del = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json"
}

total_deletados_geral = 0
for lang in idiomas_alvo:
    dir_local = os.path.join(PASTA_PALAVRAS, lang)
    if not os.path.exists(dir_local):
        continue
    locais = set(f for f in os.listdir(dir_local) if f.endswith(".mp3"))
    remotos = listar_remoto(f"palavras/{lang}")
    orfaos = remotos - locais
    orfaos = [o for o in orfaos if not o.startswith("5550192")]

    if not orfaos:
        print(f"  [{lang.upper()}] Zero órfãos remotos. Paridade OK.")
        continue

    print(f"  [{lang.upper()}] Purgando {len(orfaos)} arquivos órfãos remotos...")
    lote_size = 100
    deletados = 0
    for i in range(0, len(orfaos), lote_size):
        lote = [f"palavras/{lang}/{nome}" for nome in orfaos[i:i + lote_size]]
        payload = json.dumps({"prefixes": lote}).encode("utf-8")
        req = urllib.request.Request(url_delete, data=payload, headers=headers_del, method="DELETE")
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                deletados += len(lote)
        except Exception as e:
            print(f"\n[FALHA DELEÇÃO {lang} lote {i}]: {e}")
        pct = (deletados / len(orfaos)) * 100
        print(f"Limpando {lang.upper()}: {deletados}/{len(orfaos)} ({pct:.1f}%)", end="\r", flush=True)

    print(f"\n    ✔ {deletados} órfãos removidos em {lang.upper()}.")
    total_deletados_geral += deletados

print(f"\n✔ Total de órfãos expurgados: {total_deletados_geral}")

print("\n[ETAPA 3] AUDITORIA DE PARIDADE FINAL:")
todas_paridades_ok = True
for lang in idiomas_alvo:
    dir_local = os.path.join(PASTA_PALAVRAS, lang)
    if not os.path.exists(dir_local):
        continue
    locais = set(f for f in os.listdir(dir_local) if f.endswith(".mp3"))
    remotos = listar_remoto(f"palavras/{lang}")
    faltantes = locais - remotos
    excedentes = remotos - locais
    status = "✔ 100% PARIDADE" if (len(faltantes) == 0 and len(excedentes) == 0) else "✖ DIVERGÊNCIA"
    if status != "✔ 100% PARIDADE":
        todas_paridades_ok = False
    print(f"  [{lang.upper()}] Disco: {len(locais):<5} | Storage: {len(remotos):<5} | Faltando: {len(faltantes):<3} | Excedente: {len(excedentes):<3} -> {status}")

if todas_paridades_ok:
    print("\n🎉 PARIDADE TOTAL DE 100% ATESTADA!")
