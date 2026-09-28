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
        if c in mapa:
            marcas.append(f'{ultimo}_{mapa[c]}')
        elif not ('\u0300' <= c <= '\u036f'):
            base_chars.append(c)
            ultimo = c
    slug = re.sub(r'[^a-zA-Z0-9_-]', '', ''.join(base_chars))
    return f'{slug}_{"_".join(marcas)}' if marcas else slug

mapa_esperados = {'en': set(), 'es': set(), 'fr': set(), 'ge': set(), 'it': set(), 'pt': set(), 'zh': set()}

with open(CSV_FILE, mode='r', encoding='utf-8-sig') as f:
    for row in csv.DictReader(f):
        for idm in ['en', 'es', 'fr', 'ge', 'it', 'pt']:
            texto = row.get(idm, '')
            if texto:
                for token in texto.split():
                    s = sanitizar_palavra_audio(token)
                    if s: mapa_esperados[idm].add(f'{s}.mp3')
        
        texto_pi = row.get('pi', '')
        if texto_pi:
            for token in texto_pi.split():
                s = sanitizar_palavra_audio(token)
                if s: mapa_esperados['zh'].add(f'{s}.mp3')

print(f'{"Idioma":<8} | {"Esperados (CSV)":<16} | {"No Disco":<10} | {"Correspondentes":<16} | {"Órfãos":<8} | {"Faltando":<8}')
print('-' * 76)

for idm, esperados in mapa_esperados.items():
    pasta = os.path.join(PASTA_BASE, idm)
    if not os.path.exists(pasta):
        print(f'{idm:<8} | {len(esperados):<16} | Pasta inexistente')
        continue
    arquivos_disco = set([f for f in os.listdir(pasta) if f.endswith('.mp3')])
    correspondentes = esperados.intersection(arquivos_disco)
    orfaos = arquivos_disco - esperados
    faltando = esperados - arquivos_disco
    print(f'{idm:<8} | {len(esperados):<16} | {len(arquivos_disco):<10} | {len(correspondentes):<16} | {len(orfaos):<8} | {len(faltando):<8}')
