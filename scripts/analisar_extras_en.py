# -*- coding: utf-8 -*-
import csv, os, re, unicodedata

CSV_FILE = 'supabase_sentences.csv'
PASTA_EN = os.path.join('audios_dingli', 'palavras', 'en')

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

# 1. Arquivos reais no disco
arquivos_disco = set([f[:-4] for f in os.listdir(PASTA_EN) if f.endswith('.mp3')])

# 2. Palavras por coluna no CSV
palavras_frases = set()
palavras_topicos = set()
palavras_inspirational = set()
palavras_outras_colunas = set()

with open(CSV_FILE, mode='r', encoding='utf-8-sig') as f:
    for row in csv.DictReader(f):
        # Frases oficiais (coluna en)
        for w in (row.get('en') or '').split():
            s = sanitizar(w)
            if s: palavras_frases.add(s)
            
        # Tópicos em inglês (coluna topic_en)
        for w in (row.get('topic_en') or '').split():
            s = sanitizar(w)
            if s: palavras_topicos.add(s)
            
        # Frases de inspiração (coluna inspirational)
        for w in (row.get('inspirational') or '').split():
            s = sanitizar(w)
            if s: palavras_inspirational.add(s)

# 3. Classificação dos 1.432 arquivos excedentes
extras = arquivos_disco - palavras_frases

em_topicos = extras.intersection(palavras_topicos)
em_inspirational = (extras - em_topicos).intersection(palavras_inspirational)
orfãos_totais = extras - em_topicos - em_inspirational

# 4. Salvar relatórios em texto para consulta detalhada
with open('scripts/extras_en_topicos.txt', 'w', encoding='utf-8') as f:
    for item in sorted(em_topicos): f.write(item + '\n')

with open('scripts/extras_en_inspirational.txt', 'w', encoding='utf-8') as f:
    for item in sorted(em_inspirational): f.write(item + '\n')

with open('scripts/extras_en_orfaos_totais.txt', 'w', encoding='utf-8') as f:
    for item in sorted(orfãos_totais): f.write(item + '\n')

print("=" * 60)
print("CLASSIFICAÇÃO EXATA DOS ARQUIVOS EXCEDENTES EM INGLÊS")
print("=" * 60)
print(f"Total de arquivos na pasta: {len(arquivos_disco)}")
print(f"Necessários para as 1.200 frases (en): {len(palavras_frases)}")
print(f"Total de arquivos a mais (excedentes): {len(extras)}\n")
print(f"1. Pertencem aos TÍTULOS DE TÓPICOS (topic_en): {len(em_topicos)}")
print(f"   Exemplos: {sorted(list(em_topicos))[:10]}\n")
print(f"2. Pertencem a frases INSPIRATIONAL: {len(em_inspirational)}")
print(f"   Exemplos: {sorted(list(em_inspirational))[:10]}\n")
print(f"3. NÃO EXISTEM EM NENHUM LUGAR DO CSV ATUAL: {len(orfãos_totais)}")
print(f"   Exemplos: {sorted(list(orfãos_totais))[:10]}\n")
print("=" * 60)
print("Listas completas geradas:")
print(" - scripts/extras_en_topicos.txt")
print(" - scripts/extras_en_inspirational.txt")
print(" - scripts/extras_en_orfaos_totais.txt")
