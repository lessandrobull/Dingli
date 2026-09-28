# -*- coding: utf-8 -*-
import csv, os, re, unicodedata

CSV_FILE = 'supabase_sentences.csv'
PASTA_AUDIOS = 'audios_dingli'

print("=" * 60)
print("1. INVENTÁRIO DO CSV (supabase_sentences.csv)")
print("=" * 60)

if not os.path.exists(CSV_FILE):
    print(f"[ERRO CRÍTICO] Arquivo '{CSV_FILE}' não encontrado na raiz.")
    exit(1)

colunas = []
total_linhas = 0
contagem_preenchidos = {}
vocabulario_csv = {}

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

with open(CSV_FILE, mode='r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    colunas = reader.fieldnames or []
    for col in colunas:
        contagem_preenchidos[col] = 0
        vocabulario_csv[col] = set()

    for row in reader:
        total_linhas += 1
        for col in colunas:
            val = (row.get(col) or '').strip()
            if val:
                contagem_preenchidos[col] += 1
                for token in val.split():
                    s = sanitizar(token)
                    if s: vocabulario_csv[col].add(s)

print(f"Total de linhas (frases): {total_linhas}")
print(f"Colunas detectadas: {colunas}\n")
print(f"{'Coluna':<12} | {'Linhas Preenchidas':<20} | {'Palavras Únicas (Slugs)':<25}")
print("-" * 62)
for col in colunas:
    print(f"{col:<12} | {contagem_preenchidos[col]:<20} | {len(vocabulario_csv[col]):<25}")

print("\n" + "=" * 60)
print("2. INVENTÁRIO DO DISCO LOCAL (audios_dingli)")
print("=" * 60)

if not os.path.exists(PASTA_AUDIOS):
    print(f"Pasta '{PASTA_AUDIOS}' não encontrada.")
else:
    for raiz, pastas, arquivos in os.walk(PASTA_AUDIOS):
        mp3s = [f for f in arquivos if f.endswith('.mp3')]
        if mp3s or not pastas:
            rel = os.path.relpath(raiz, '.')
            print(f"{rel:<45} : {len(mp3s)} arquivos .mp3")

print("\n" + "=" * 60)
print("3. CONFERÊNCIA DE PALAVRAS ISOLADAS (CSV vs DISCO)")
print("=" * 60)
print(f"{'Idioma':<8} | {'Únicos no CSV':<15} | {'No Disco Local':<16} | {'Coincidentes':<14} | {'Faltando':<10}")
print("-" * 68)

mapa_idm_coluna = {
    'en': 'en',
    'es': 'es',
    'fr': 'fr',
    'ge': 'ge',
    'it': 'it',
    'pt': 'pt',
    'zh': 'pi' if 'pi' in vocabulario_csv else 'zh'
}

for idm, col in mapa_idm_coluna.items():
    esperados = vocabulario_csv.get(col, set())
    pasta_disco = os.path.join(PASTA_AUDIOS, 'palavras', idm)
    no_disco = set()
    if os.path.exists(pasta_disco):
        no_disco = set([f[:-4] for f in os.listdir(pasta_disco) if f.endswith('.mp3')])
    
    coincidentes = esperados.intersection(no_disco)
    faltando = esperados - no_disco
    print(f"{idm:<8} | {len(esperados):<15} | {len(no_disco):<16} | {len(coincidentes):<14} | {len(faltando):<10}")
