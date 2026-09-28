# -*- coding: utf-8 -*-
import os
import re
import csv
import unicodedata

CSV_FILE = "supabase_sentences.csv"
PASTA_PALAVRAS = "audios_dingli/palavras"

def sanitizar_slug_oficial(palavra):
    p = (palavra or "").strip().lower()
    p = p.replace('ß', 'ss').replace("'", "_").replace("’", "_")
    nfd = unicodedata.normalize('NFD', p)
    sem_acento = "".join(c for c in nfd if unicodedata.category(c) != 'Mn')
    clean = re.sub(r'[^a-zA-Z0-9_-]', '', sem_acento).lower()
    return clean

def extrair_vocabulario_oficial(linhas, coluna):
    mapa = {}
    for item in linhas:
        texto = item.get(coluna, "")
        if not texto:
            continue
        for w in str(texto).split():
            w_speech = w.strip().strip('.,!?;:¿¡"“”`{}()[]-—…，。！？；：、«»/\\~*').lower()
            slug = sanitizar_slug_oficial(w)
            if slug and slug not in mapa:
                mapa[slug] = w_speech
    return mapa

# 1. Carregar CSV
with open(CSV_FILE, mode='r', encoding='utf-8-sig', errors='ignore') as f:
    linhas = list(csv.DictReader(f))

print("=" * 65)
print("1. AUDITORIA REAL DE PALAVRAS DO ITALIANO (PADRÃO ASCII)")
print("=" * 65)

vocab_it = extrair_vocabulario_oficial(linhas, "it")
pasta_it = os.path.join(PASTA_PALAVRAS, "it")
arquivos_it = {f[:-4] for f in os.listdir(pasta_it) if f.endswith(".mp3")} if os.path.exists(pasta_it) else set()

aproveitadas = arquivos_it.intersection(set(vocab_it.keys()))
faltantes = set(vocab_it.keys()) - arquivos_it
orfas = arquivos_it - set(vocab_it.keys())

print(f"Total de slugs únicos no vocabulário italiano revisado: {len(vocab_it)}")
print(f"Total de arquivos MP3 existentes em palavras/it/:         {len(arquivos_it)}")
print(f"✔ Palavras APROVEITADAS (já existem e serão mantidas):   {len(aproveitadas)}")
print(f"⚡ Palavras NOVAS que faltam gerar (IsabellaNeural):       {len(faltantes)}")
print(f"🗑 Palavras ÓRFÃS que irão para quarentena_it:            {len(orfas)}")

if faltantes:
    print(f"\nLista completa das que faltam gerar ({len(faltantes)}):")
    print("  " + ", ".join(sorted(list(faltantes))))

print("\n" + "=" * 65)
print("2. AUDITORIA DE 'dingli' E NOMES ANTIGOS NOS DEMAIS IDIOMAS")
print("=" * 65)

slug_dingli = sanitizar_slug_oficial("Dìnglì") # 'dingli'
for lg, col, nome_ant in [
    ("en", "en", "john"),
    ("es", "es", "juan"),
    ("fr", "fr", "jean"),
    ("pt", "pt", "joao"),
    ("ge", "ge", None)
]:
    vocab_lg = extrair_vocabulario_oficial(linhas, col)
    pasta_lg = os.path.join(PASTA_PALAVRAS, lg)
    locais_lg = {f[:-4] for f in os.listdir(pasta_lg) if f.endswith(".mp3")} if os.path.exists(pasta_lg) else set()
    
    tem_dingli = slug_dingli in locais_lg
    tem_ant = nome_ant in locais_lg if nome_ant else False
    ant_no_vocab = nome_ant in vocab_lg if nome_ant else False
    
    print(f"[{lg.upper()}] Vocabulário Oficial: {len(vocab_lg)} | Arquivos em disco: {len(locais_lg)}")
    print(f"   - 'dingli.mp3' existe em disco? {'SIM' if tem_dingli else 'NÃO (precisa gerar)'}")
    if nome_ant:
        print(f"   - Nome antigo '{nome_ant}': está em outras frases? {'SIM' if ant_no_vocab else 'NÃO (órfão)'} | no disco: {'SIM' if tem_ant else 'NÃO'}")
