# -*- coding: utf-8 -*-
import os
import re
import csv

CSV_FILE = "supabase_sentences.csv"
PASTA_PALAVRAS = "audios_dingli/palavras"

VOZES_OFICIAIS = {
    "en": "en-CA-ClaraNeural",
    "es": "es-MX-DaliaNeural",
    "fr": "fr-FR-DeniseNeural",
    "ge": "de-DE-KatjaNeural",
    "it": "it-IT-IsabellaNeural",
    "pt": "pt-BR-ThalitaMultilingualNeural",
    "zh": "zh-CN-XiaoxiaoNeural"
}

def sanitizar_slug(palavra):
    p = (palavra or "").strip().lower()
    p = re.sub(r'[.,!?;:¿¡"“”`{}()[\]\-—…，。！？；：、«»/\\~*]', '', p)
    p = p.replace("'", "_").replace("’", "_")
    return p

def extrair_vocabulario(linhas, coluna):
    mapa = {}
    for item in linhas:
        texto = item.get(coluna, "")
        if not texto:
            continue
        for w in str(texto).split():
            w_speech = w.strip().strip('.,!?;:¿¡"“”`{}()[]-—…，。！？；：、«»/\\~*').lower()
            slug = sanitizar_slug(w)
            if slug and slug not in mapa:
                mapa[slug] = w_speech
    return mapa

# 1. Carregar frases do CSV
linhas = []
with open(CSV_FILE, mode='r', encoding='utf-8-sig', errors='ignore') as f:
    linhas = list(csv.DictReader(f))

print("=" * 65)
print("1. INVENTÁRIO DO ITALIANO (palavras/it/)")
print("=" * 65)
vocab_oficial_it = extrair_vocabulario(linhas, "it")
pasta_it = os.path.join(PASTA_PALAVRAS, "it")
arquivos_locais_it = set()
if os.path.exists(pasta_it):
    arquivos_locais_it = {f[:-4] for f in os.listdir(pasta_it) if f.endswith(".mp3")}

aproveitadas_it = arquivos_locais_it.intersection(set(vocab_oficial_it.keys()))
orfas_it = arquivos_locais_it - set(vocab_oficial_it.keys())
faltantes_it = set(vocab_oficial_it.keys()) - arquivos_locais_it

print(f"Total de palavras no vocabulário oficial revisado: {len(vocab_oficial_it)}")
print(f"Total de arquivos locais existentes em it/:        {len(arquivos_locais_it)}")
print(f"✔ Palavras que serão APROVEITADAS:                 {len(aproveitadas_it)}")
print(f"🗑 Palavras ÓRFÃS a remover/isolar:                {len(orfas_it)}")
print(f"⚡ Palavras NOVAS a sintetizar (IsabellaNeural):    {len(faltantes_it)}")

if orfas_it:
    print(f"\nAmostra de palavras órfãs do Italiano (total {len(orfas_it)}):")
    print("  " + ", ".join(sorted(list(orfas_it))[:15]))

if faltantes_it:
    print(f"\nAmostra de palavras novas a gerar no Italiano (total {len(faltantes_it)}):")
    print("  " + ", ".join(sorted(list(faltantes_it))[:15]))

print("\n" + "=" * 65)
print("2. IMPACTO DA FRASE 1 (DÌNGLÌ) E FRASE 988 NOS OUTROS IDIOMAS")
print("=" * 65)

# Nomes antigos para checar se viraram órfãos
nomes_antigos = {
    "en": "john",
    "es": "juan",
    "fr": "jean",
    "pt": "joão",
    "it": "giovanni"
}

for lg, col in [("en", "en"), ("es", "es"), ("fr", "fr"), ("pt", "pt"), ("ge", "ge")]:
    vocab_lg = extrair_vocabulario(linhas, col)
    pasta_lg = os.path.join(PASTA_PALAVRAS, lg)
    locais_lg = {f[:-4] for f in os.listdir(pasta_lg) if f.endswith(".mp3")} if os.path.exists(pasta_lg) else set()
    
    slug_dingli = sanitizar_slug("Dìnglì")
    dingli_existe = slug_dingli in locais_lg
    
    # Checar se o nome antigo ainda existe em alguma outra frase
    nome_ant = nomes_antigos.get(lg)
    slug_ant = sanitizar_slug(nome_ant) if nome_ant else None
    ant_no_vocab = slug_ant in vocab_lg if slug_ant else False
    ant_no_disco = slug_ant in locais_lg if slug_ant else False
    
    # Checar faltantes gerais
    faltantes_lg = set(vocab_lg.keys()) - locais_lg
    orfas_lg = locais_lg - set(vocab_lg.keys())
    
    print(f"[{lg.upper()}] Vocabulário Oficial: {len(vocab_lg)} | Em disco: {len(locais_lg)}")
    print(f"   - 'dìnglì.mp3' presente no disco? {'SIM' if dingli_existe else 'NÃO (precisa gerar)'}")
    if slug_ant:
        print(f"   - Nome antigo '{nome_ant}': está em outras frases? {'SIM' if ant_no_vocab else 'NÃO (virou órfão)'} | no disco: {'SIM' if ant_no_disco else 'NÃO'}")
    print(f"   - Total Faltantes: {len(faltantes_lg)} | Total Órfãos: {len(orfas_lg)}")
    if faltantes_lg:
        print(f"     Faltantes: {sorted(list(faltantes_lg))}")
    if orfas_lg:
        print(f"     Órfãos: {sorted(list(orfas_lg))[:10]}")
