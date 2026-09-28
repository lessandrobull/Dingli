# -*- coding: utf-8 -*-
import csv, os, re, unicodedata

CSV_FILE = 'supabase_sentences.csv'
PASTA_ES = os.path.join('audios_dingli', 'palavras', 'es')

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
arquivos_disco = set([f[:-4] for f in os.listdir(PASTA_ES) if f.endswith('.mp3')])

# 2. Palavras por coluna no CSV
palavras_frases = {}
palavras_topicos = set()
palavras_inspirational = set()

with open(CSV_FILE, mode='r', encoding='utf-8-sig') as f:
    for row in csv.DictReader(f):
        f_id = row.get('id')
        frase = row.get('es') or ''
        for w in frase.split():
            s = sanitizar(w)
            if s and s not in palavras_frases:
                palavras_frases[s] = {'termo': w, 'frase_id': f_id, 'frase': frase}
            
        for w in (row.get('topic_es') or '').split():
            s = sanitizar(w)
            if s: palavras_topicos.add(s)
            
        for w in (row.get('inspirational') or '').split():
            s = sanitizar(w)
            if s: palavras_inspirational.add(s)

set_frases = set(palavras_frases.keys())

# 3. Faltantes
faltantes = set_frases - arquivos_disco

# 4. Classificação dos excedentes
extras = arquivos_disco - set_frases
em_topicos = extras.intersection(palavras_topicos)
em_inspirational = (extras - em_topicos).intersection(palavras_inspirational)
orfãos_totais = extras - em_topicos - em_inspirational

# 5. Salvar relatórios em texto
with open('scripts/extras_es_topicos.txt', 'w', encoding='utf-8') as f:
    for item in sorted(em_topicos): f.write(item + '\n')

with open('scripts/extras_es_inspirational.txt', 'w', encoding='utf-8') as f:
    for item in sorted(em_inspirational): f.write(item + '\n')

with open('scripts/extras_es_orfaos_totais.txt', 'w', encoding='utf-8') as f:
    for item in sorted(orfãos_totais): f.write(item + '\n')

with open('scripts/faltantes_es.txt', 'w', encoding='utf-8') as f:
    for s in sorted(faltantes):
        d = palavras_frases[s]
        f.write(f"ID {d['frase_id']:>4} | slug: {s:<25} | original: {d['termo']:<15} | frase: {d['frase']}\n")

print("=" * 60)
print("CLASSIFICAÇÃO EXATA DOS ARQUIVOS EM ESPANHOL")
print("=" * 60)
print(f"Total de arquivos na pasta (disco): {len(arquivos_disco)}")
print(f"Necessários para as 1.200 frases (es): {len(set_frases)}")
print(f"Arquivos coincidentes (prontos): {len(set_frases.intersection(arquivos_disco))}")
print(f"Arquivos FALTANTES: {len(faltantes)}")
print(f"Total de arquivos EXCEDENTES: {len(extras)}\n")
print(f"1. Pertencem aos TÍTULOS DE TÓPICOS (topic_es): {len(em_topicos)}")
print(f"   Exemplos: {sorted(list(em_topicos))[:10]}\n")
print(f"2. Pertencem a frases INSPIRATIONAL: {len(em_inspirational)}")
print(f"   Exemplos: {sorted(list(em_inspirational))[:10]}\n")
print(f"3. NÃO EXISTEM EM NENHUM LUGAR DO CSV ATUAL: {len(orfãos_totais)}")
print(f"   Exemplos: {sorted(list(orfãos_totais))[:10]}\n")
print("=" * 60)
print("TODAS AS 23 PALAVRAS FALTANTES EM ESPANHOL:")
print("=" * 60)
for s in sorted(faltantes):
    d = palavras_frases[s]
    print(f"ID {d['frase_id']:>4}: slug: {s:<20} (original: '{d['termo']}')")
