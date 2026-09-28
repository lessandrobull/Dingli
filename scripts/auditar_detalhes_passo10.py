# -*- coding: utf-8 -*-
import csv, os, re, unicodedata

CSV_FILE = 'supabase_sentences.csv'
PASTA_BASE = os.path.join('audios_dingli', 'palavras')

def sanitizar_palavra_audio(palavra):
    p = (palavra or '').strip().lower().replace('ß', 'ss')
    sem_p = re.sub(r'[.,!?;:¿¡"“”`{}()[\]\-—…，。！？；：、«»/\\~*]', '', p).replace("'", "_").replace('’', '_')
    if not sem_p: return ''
    nfd = unicodedata.normalize('NFD', sem_p)
    mapa = {'\u0300': 'grave', '\u0301': 'acute', '\u0302': 'circ', '\u0303': 'tilde', '\u0308': 'uml', '\u0327': 'ced'}
    base_chars, marcas, ultimo = [], [], ''
    for c in nfd:
        if c in mapa: marcas.append(f'{ultimo}_{mapa[c]}')
        elif not ('\u0300' <= c <= '\u036f'): base_chars.append(c); ultimo = c
    slug = re.sub(r'[^a-zA-Z0-9_-]', '', ''.join(base_chars))
    return f'{slug}_{"_".join(marcas)}' if marcas else slug

mapa_esperados = {l: set() for l in ['en', 'es', 'fr', 'it', 'pt', 'ge']}
with open(CSV_FILE, mode='r', encoding='utf-8-sig') as f:
    for row in csv.DictReader(f):
        for l in mapa_esperados.keys():
            texto = row.get(l, '')
            if texto:
                for token in texto.split():
                    s = sanitizar_palavra_audio(token)
                    if s: mapa_esperados[l].add(f'{s}.mp3')

print('=== DETALHE DE ÓRFÃOS E FALTANTES (EN, ES, FR, IT, PT) ===')
for l in ['en', 'es', 'fr', 'it', 'pt']:
    pasta = os.path.join(PASTA_BASE, l)
    arquivos_disco = set([f for f in os.listdir(pasta) if f.endswith('.mp3')]) if os.path.exists(pasta) else set()
    orfaos = arquivos_disco - mapa_esperados[l]
    faltando = mapa_esperados[l] - arquivos_disco
    print(f'{l.upper()}:')
    print(f'  Órfãos   : {sorted(list(orfaos))}')
    print(f'  Faltando : {sorted(list(faltando))}')

pasta_ge = os.path.join(PASTA_BASE, 'ge')
arquivos_ge = set([f for f in os.listdir(pasta_ge) if f.endswith('.mp3')]) if os.path.exists(pasta_ge) else set()
faltando_ge = mapa_esperados['ge'] - arquivos_ge
print(f'\nGE: {len(faltando_ge)} palavras faltantes. Amostra (primeiras 10): {sorted(list(faltando_ge))[:10]}')

print('\n' + '='*60)
print('Verificando primeiras 35 linhas de scripts/gerar_palavras_isoladas.py:')
print('='*60)
with open('scripts/gerar_palavras_isoladas.py', 'r', encoding='utf-8', errors='ignore') as f:
    for _ in range(35):
        print(f.readline(), end='')
