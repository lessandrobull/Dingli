# -*- coding: utf-8 -*-
import os, sys, csv, json, glob, datetime, subprocess, urllib.request

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# 1. Carregar variáveis de ambiente
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

# 2. Tratar argumentos de linha de comando
args = sys.argv[1:]
args_lower = [a.lower() for a in args]
dry_run = "--dry-run" in args_lower

patch_file = None
if "--patch" in args_lower:
    idx = args_lower.index("--patch")
    if idx + 1 < len(args):
        patch_file = args[idx + 1]
    else:
        print("[ERRO] Informe o arquivo JSON após a flag --patch.")
        sys.exit(1)

TODOS_IDIOMAS = ["pt", "en", "es", "fr", "it", "ge", "zh"]
idiomas_informados = [a.lower() for a in args if not a.startswith("--") and a != patch_file]

if not idiomas_informados or "todos" in idiomas_informados:
    idiomas_alvo = TODOS_IDIOMAS
else:
    idiomas_alvo = [i for i in idiomas_informados if i in TODOS_IDIOMAS]

if not idiomas_alvo:
    print(f"[ERRO] Especifique idiomas válidos {TODOS_IDIOMAS} ou 'todos'.")
    sys.exit(1)

def obter_versao_atual_supabase(idioma):
    url_v = f"{SUPABASE_URL}/rest/v1/curso_revisoes?idioma=eq.{idioma}&select=versao&order=versao.desc&limit=1"
    req_v = urllib.request.Request(url_v, headers={"apikey": KEY, "Authorization": f"Bearer {KEY}"})
    try:
        with urllib.request.urlopen(req_v, timeout=15) as resp:
            dados = json.loads(resp.read().decode("utf-8"))
            return dados[0]["versao"] if dados else 0
    except Exception as e:
        print(f"⚠ Aviso ao consultar versão no Supabase: {e}")
        return 0

def baixar_snapshot_supabase(caminho_destino):
    headers = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Accept": "application/json"}
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
    with open(caminho_destino, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=colunas_db)
        writer.writeheader()
        for row in dados_banco:
            writer.writerow({c: row.get(c, "") for c in colunas_db})

def aplicar_patch_local(arquivo_json):
    with open(arquivo_json, "r", encoding="utf-8") as f:
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

    assert len(linhas_csv) == 1200, f"Erro: Encontradas {len(linhas_csv)} frases (esperado: 1200)!"
    with open("supabase_sentences.csv", "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames_originais)
        writer.writeheader()
        writer.writerows(linhas_csv)
    return len(alteracoes)

# ==============================================================================
# FLUXO 1: COMANDO 1 (PREPARAÇÃO, SNAPSHOT LOCAL & DRY-RUN COMPLETO)
# ==============================================================================
if dry_run:
    print("=" * 75)
    print(" DÌNGLÌ - COMANDO 1: PREPARAÇÃO, SNAPSHOT LOCAL & DRY-RUN COMPLETO")
    print(f" Idiomas selecionados: {', '.join(i.upper() for i in idiomas_alvo)}")
    if patch_file:
        print(f" Arquivo Patch: {patch_file}")
    print("=" * 75)

    os.makedirs("backups", exist_ok=True)
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

    for idioma in idiomas_alvo:
        print(f"\n>>> EXECUTANDO DRY-RUN PARA O CURSO: [{idioma.upper()}] <<<\n")

        # 1. Snapshot remoto prévio
        versao_atual = obter_versao_atual_supabase(idioma)
        caminho_snapshot = os.path.join("backups", f"sentences_v{versao_atual}_{idioma}_{timestamp}.csv")
        print(f"1. Baixando snapshot atual do Supabase (Versão {versao_atual})...")
        baixar_snapshot_supabase(caminho_snapshot)
        print(f"✔ Snapshot gerado: {caminho_snapshot} (1.200 frases)")

        # 2. Aplicação do patch local se fornecido
        if patch_file:
            print(f"2. Aplicando alterações de {patch_file} no supabase_sentences.csv...")
            qtd_patch = aplicar_patch_local(patch_file)
            print(f"✔ CSV local atualizado com {qtd_patch} frases injetadas.")
        else:
            print("2. Nenhum arquivo de patch fornecido. Analisando estado atual do CSV local.")

        # 3. Diagnóstico de Frases (Dry-Run)
        print(f"3. Executando diagnóstico de frases para [{idioma.upper()}]...")
        res_frases = subprocess.run([sys.executable, "scripts/sincronizar_frases_completo.py", idioma, "--dry-run"])
        if res_frases.returncode != 0:
            print(f"❌ Erro no diagnóstico de frases para [{idioma.upper()}].")
            sys.exit(res_frases.returncode)

        # 4. Diagnóstico de Vocabulário (Dry-Run)
        print(f"\n4. Executando diagnóstico léxico de vocabulário para [{idioma.upper()}]...")
        res_vocab = subprocess.run([sys.executable, "scripts/sincronizar_vocabulario.py", idioma, "--dry-run"])
        if res_vocab.returncode != 0:
            print(f"❌ Erro no diagnóstico de vocabulário para [{idioma.upper()}].")
            sys.exit(res_vocab.returncode)

    print("\n" + "=" * 75)
    print("✔ RELATÓRIO DO COMANDO 1 (DRY-RUN) CONCLUÍDO COM SUCESSO ABSOLUTO!")
    print("  ZERO alterações foram enviadas ao Supabase DB.")
    print("  ZERO arquivos foram enviados ao Storage.")
    print("\nPara iniciar a PRODUÇÃO REAL após sua aprovação, execute o Comando 2:")
    print(f"  python scripts/sincronizar_tudo.py {' '.join(idiomas_alvo)}")
    print("=" * 75)
    sys.exit(0)

# ==============================================================================
# FLUXO 2: COMANDO 2 (PRODUÇÃO REAL DEFINITIVA)
# ==============================================================================
print("=" * 75)
print(" DÌNGLÌ - COMANDO 2: PRODUÇÃO REAL DEFINITIVA")
print(f" Idiomas selecionados: {', '.join(i.upper() for i in idiomas_alvo)}")
print(" Modo: GRAVAÇÃO E UPLOAD ATIVOS (STORAGE + SUPABASE DB + VERSIONAMENTO)")
print("=" * 75)

for idioma in idiomas_alvo:
    print(f"\n>>> INICIANDO PRODUÇÃO REAL: [{idioma.upper()}] <<<\n")

    # Identificar deltas com base no último backup existente
    backups = sorted(glob.glob("backups/sentences_v*.csv") + glob.glob("backups/sentences_backup_*.csv"))
    if not backups:
        print("[ERRO] Nenhum backup localizado. Execute o Comando 1 (--dry-run) primeiro.")
        sys.exit(1)

    ultimo_backup = backups[-1]
    db_ref = {int(r["id"]): r for r in csv.DictReader(open(ultimo_backup, encoding="utf-8-sig", errors="ignore")) if r.get("id", "").isdigit()}
    csv_local = {int(r["id"]): r for r in csv.DictReader(open("supabase_sentences.csv", encoding="utf-8-sig", errors="ignore")) if r.get("id", "").isdigit()}

    alteracoes_db = {}
    for fid, r_csv in sorted(csv_local.items()):
        r_db = db_ref.get(fid, {})
        txt_csv = (r_csv.get(idioma) or "").strip()
        txt_db = (r_db.get(idioma) or "").strip()
        if idioma == "zh":
            pi_csv = (r_csv.get("pi") or "").strip()
            pi_db = (r_db.get("pi") or "").strip()
            if txt_csv != txt_db or pi_csv != pi_db:
                alteracoes_db[fid] = {"zh": txt_csv, "pi": pi_csv}
        else:
            if txt_csv != txt_db:
                alteracoes_db[fid] = {idioma: txt_csv}

    if not alteracoes_db:
        print(f"✔ Nenhuma alteração pendente de gravação para [{idioma.upper()}].")
        continue

    # 1. Síntese e Upload dos Áudios de Frases (Somente Áudio)
    print(f"--- [ETAPA 1/5] Síntese e Upload dos Áudios de Frases ({idioma.upper()}) ---")
    res_frases = subprocess.run([sys.executable, "scripts/sincronizar_frases_completo.py", idioma, "--somente-audio"])
    if res_frases.returncode != 0:
        print(f"❌ Interrupção na síntese/upload de frases para [{idioma.upper()}]. O banco NÃO foi modificado.")
        sys.exit(res_frases.returncode)

    # 2. Pipeline Completo de Vocabulário (Síntese FFmpeg + Upload Storage + Purga Órfãos)
    print(f"\n--- [ETAPA 2/5] Síntese e Upload do Vocabulário / Palavras Isoladas ({idioma.upper()}) ---")
    res_vocab = subprocess.run([sys.executable, "scripts/sincronizar_vocabulario_completo.py", idioma])
    if res_vocab.returncode != 0:
        print(f"❌ Interrupção no pipeline de vocabulário para [{idioma.upper()}]. O banco NÃO foi modificado.")
        sys.exit(res_vocab.returncode)

    # 3. Atualização da Tabela sentences no Supabase DB (Somente com 100% dos áudios no Storage)
    print(f"\n--- [ETAPA 3/5] Atualização no Supabase DB (Tabela sentences) ---")
    headers_patch = {
        "apikey": KEY,
        "Authorization": f"Bearer {KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    db_sucessos = 0
    for fid, payload in alteracoes_db.items():
        url_patch = f"{SUPABASE_URL}/rest/v1/sentences?id=eq.{fid}"
        req_patch = urllib.request.Request(url_patch, data=json.dumps(payload).encode("utf-8"), headers=headers_patch, method="PATCH")
        for tentativa in range(3):
            try:
                with urllib.request.urlopen(req_patch, timeout=15) as resp:
                    if resp.status in (200, 204):
                        db_sucessos += 1
                        break
            except Exception:
                pass

    if db_sucessos != len(alteracoes_db):
        print(f"❌ Falha ao atualizar banco de dados: {db_sucessos}/{len(alteracoes_db)} frases atualizadas.")
        sys.exit(1)
    print(f"✔ 3. Supabase DB atualizado: {db_sucessos}/{len(alteracoes_db)} frases sincronizadas com sucesso!")

    # 4. Incremento de Versão no Supabase (Tabela curso_revisoes)
    print(f"\n--- [ETAPA 4/5] Registro de Nova Versão na Tabela curso_revisoes ---")
    versao_anterior = obter_versao_atual_supabase(idioma)
    nova_versao = versao_anterior + 1
    ids_alterados = sorted(list(alteracoes_db.keys()))
    descricao_rev = f"Atualização de conteúdo ({len(ids_alterados)} frase{'s' if len(ids_alterados) > 1 else ''} aprimorada{'s' if len(ids_alterados) > 1 else ''})."

    payload_rev = {
        "versao": nova_versao,
        "idioma": idioma,
        "ids_alterados": ids_alterados,
        "descricao": descricao_rev
    }
    headers_post = {
        "apikey": KEY,
        "Authorization": f"Bearer {KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    req_post = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/curso_revisoes", data=json.dumps(payload_rev).encode("utf-8"), headers=headers_post, method="POST")
    with urllib.request.urlopen(req_post, timeout=15) as resp_post:
        if resp_post.status not in (200, 201):
            print(f"⚠ Resposta inesperada ao registrar versão: {resp_post.status}")
            sys.exit(1)
    print(f"✔ 4. Versão {nova_versao} registrada no Supabase para [{idioma.upper()}] ({len(ids_alterados)} frases afetadas).")

    # 5. Registro no Livro-Razão Local (backups/historico_revisoes.md)
    print(f"\n--- [ETAPA 5/5] Anexando Evento ao Livro-Razão (backups/historico_revisoes.md) ---")
    caminho_hist = os.path.join("backups", "historico_revisoes.md")
    agora_utc = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    snapshot_nome = os.path.basename(ultimo_backup)

    nova_linha_tabela = f"| auto | {agora_utc} | **{idioma.upper()}** | v{nova_versao} | {len(ids_alterados)} | {descricao_rev} | `{snapshot_nome}` |\n"
    detalhes_bloco = f"### {idioma.upper()} (v{nova_versao}) — {agora_utc}\n- **Descrição:** {descricao_rev}\n- **Total de frases:** {len(ids_alterados)}\n- **IDs:** {', '.join(str(i) for i in ids_alterados)}\n\n"

    if os.path.exists(caminho_hist):
        with open(caminho_hist, "r", encoding="utf-8") as f:
            conteudo_hist = f.read()
        partes = conteudo_hist.split("## Detalhamento de IDs por Versão")
        if len(partes) == 2:
            novo_conteudo = partes[0] + nova_linha_tabela + "\n---\n\n## Detalhamento de IDs por Versão\n\n" + detalhes_bloco + partes[1].lstrip("\n")
        else:
            novo_conteudo = conteudo_hist + "\n" + nova_linha_tabela + "\n" + detalhes_bloco
        with open(caminho_hist, "w", encoding="utf-8") as f:
            f.write(novo_conteudo)
        print("✔ 5. Livro-razão local atualizado com sucesso!")

print("\n" + "=" * 75)
print("🎉 PRODUÇÃO REAL FINALIZADA COM 100% DE PARIDADE E SUCESSO ABSOLUTO!")
print("=" * 75)
