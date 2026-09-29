# -*- coding: utf-8 -*-
import os, sys, subprocess

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

args = sys.argv[1:]
args_lower = [a.lower() for a in args]
dry_run = "--dry-run" in args_lower

# Tratar parâmetro opcional --patch <arquivo.json>
patch_file = None
if "--patch" in args_lower:
    idx = args_lower.index("--patch")
    if idx + 1 < len(args):
        patch_file = args[idx + 1]
    else:
        print("[ERRO] Informe o caminho do arquivo JSON após a flag --patch.")
        sys.exit(1)

# Filtrar idiomas informados ignorando flags e valores de parâmetros
idiomas_informados = []
pular_proximo = False
for a in args:
    if pular_proximo:
        pular_proximo = False
        continue
    if a.lower() == "--patch":
        pular_proximo = True
        continue
    if not a.startswith("--"):
        idiomas_informados.append(a.lower())

TODOS_IDIOMAS = ["pt", "en", "es", "fr", "it", "ge", "zh"]

if not idiomas_informados or "todos" in idiomas_informados:
    idiomas_alvo = TODOS_IDIOMAS
else:
    idiomas_alvo = [i for i in idiomas_informados if i in TODOS_IDIOMAS]

if not idiomas_alvo:
    print(f"[ERRO] Especifique idiomas válidos {TODOS_IDIOMAS} ou 'todos'.")
    sys.exit(1)

print("=" * 75)
print(" DÌNGLÌ - ORQUESTRADOR UNIFICADO DE REVISÃO (FRASES + VOCABULÁRIO)")
print(f" Modo: {'SOMENTE LEITURA (DRY-RUN)' if dry_run else 'EXECUÇÃO REAL'}")
print(f" Idiomas selecionados: {', '.join(i.upper() for i in idiomas_alvo)}")
if patch_file:
    print(f" Patch de Revisões: {patch_file}")
print("=" * 75)

# ETAPA PRELIMINAR: Aplicar patch e gerar backup se --patch foi fornecido
if patch_file:
    print(f"\n--- [ETAPA 0] Backup Remoto Supabase + Injeção de Revisões ({patch_file}) ---")
    cmd_patch = [sys.executable, "scripts/aplicar_revisao_e_backup.py", patch_file]
    res_patch = subprocess.run(cmd_patch)
    if res_patch.returncode != 0:
        print(f"[FALHA] Interrupção no backup/aplicação de revisões do arquivo {patch_file}.")
        sys.exit(res_patch.returncode)

for idioma in idiomas_alvo:
    print(f"\n>>> INICIANDO PROCESSAMENTO DO IDIOMA: [{idioma.upper()}] <<<\n")

    # 1. Pipeline de Frases (Passo 6)
    cmd_frases = [sys.executable, "scripts/sincronizar_frases_completo.py", idioma]
    if dry_run:
        cmd_frases.append("--dry-run")
    
    print(f"--- [ETAPA 1/2] Sincronização de Frases Completas ({idioma.upper()}) ---")
    res_frases = subprocess.run(cmd_frases)
    if res_frases.returncode != 0:
        print(f"[FALHA] Interrupção no pipeline de frases para [{idioma.upper()}].")
        sys.exit(res_frases.returncode)

    # 2. Pipeline de Palavras / Vocabulário (Passo 7)
    print(f"\n--- [ETAPA 2/2] Sincronização de Vocabulário / Palavras Isoladas ({idioma.upper()}) ---")
    if dry_run:
        cmd_vocab_local = [sys.executable, "scripts/sincronizar_vocabulario.py", idioma, "--dry-run"]
        res_vocab = subprocess.run(cmd_vocab_local)
        if res_vocab.returncode != 0:
            print(f"[FALHA] Interrupção no dry-run de vocabulário para [{idioma.upper()}].")
            sys.exit(res_vocab.returncode)
    else:
        cmd_vocab_completo = [sys.executable, "scripts/sincronizar_vocabulario_completo.py", idioma]
        res_vocab = subprocess.run(cmd_vocab_completo)
        if res_vocab.returncode != 0:
            print(f"[FALHA] Interrupção no pipeline de vocabulário para [{idioma.upper()}].")
            sys.exit(res_vocab.returncode)

print("\n" + "=" * 75)
print("✔ SUCESSO TOTAL: TODAS AS ETAPAS FORAM CONCLUÍDAS COM ÊXITO!")
print("=" * 75)
