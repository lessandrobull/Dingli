# -*- coding: utf-8 -*-
import os
import re
import csv
import unicodedata

CSV_FILE = "supabase_sentences.csv"
PASTA_PALAVRAS = os.path.join("audios_dingli", "palavras")
PASTA_QUARENTENA = os.path.join("audios_dingli", "quarentena_orfaos")

def sanitizar_palavra_audio_frontend(palavra):
    p = (palavra or "").strip().lower().replace('ß', 'ss')
    sem_pontuacao = re.sub(r'[.,!?;:¿¡"“”`{}()[\]\-—…，。！？；：、«»/\\~*]', '', p)
    sem_pontuacao = re.sub(r"['’]", "_", sem_pontuacao)
    if not sem_pontuacao:
        return ""

    nfd = unicodedata.normalize("NFD", sem_pontuacao)
    mapa_diacriticos = {
        "\u0300": "grave",
        "\u0301": "acute",
        "\u0302": "circ",
        "\u0303": "tilde",
        "\u0308": "uml",
        "\u0327": "ced",
        "\u0304": "macron",
        "\u030c": "caron"
    }

    base_chars = []
    marcas = []
    ultimo_char_base = ""

    for char in nfd:
        if char in mapa_diacriticos:
            marcas.append(f"{ultimo_char_base}_{mapa_diacriticos[char]}")
        else:
            if not ("\u0300" <= char <= "\u036f"):
                base_chars.append(char)
                ultimo_char_base = char

    slug_base = re.sub(r"[^a-zA-Z0-9_-]", "", "".join(base_chars))
    if marcas:
        return f"{slug_base}_{'_'.join(marcas)}"
    return slug_base

with open(CSV_FILE, "r", encoding="utf-8-sig", errors="ignore") as f:
    linhas = list(csv.DictReader(f))

print("=" * 70)
print("MAPEAMENTO FACTUAL DE RESGATE - ESPANHOL E PORTUGUÊS")
print("=" * 70)

for lg in ["es", "pt"]:
    # 1. Vocabulário oficial esperado das 1.200 frases
    vocab_oficial = {}
    for row in linhas:
        txt = row.get(lg, "")
        for w in txt.split():
            s = sanitizar_palavra_audio_frontend(w)
            if s and s not in vocab_oficial:
                vocab_oficial[s] = re.sub(r'[.,!?;:¿¡"“”`{}()[\]\-—…，。！？；：、«»/\\~*]', '', w.strip().lower())
    
    total_esperado = len(vocab_oficial)
    
    # 2. Arquivos na pasta oficial
    pasta_oficial = os.path.join(PASTA_PALAVRAS, lg)
    arquivos_oficiais = set(os.path.splitext(f)[0] for f in os.listdir(pasta_oficial) if f.endswith(".mp3")) if os.path.exists(pasta_oficial) else set()
    
    # 3. Arquivos na quarentena
    pasta_q = os.path.join(PASTA_QUARENTENA, lg)
    arquivos_q = set(os.path.splitext(f)[0] for f in os.listdir(pasta_q) if f.endswith(".mp3")) if os.path.exists(pasta_q) else set()
    
    # Cruzamento
    ja_na_pasta = set(vocab_oficial.keys()).intersection(arquivos_oficiais)
    resgatáveis_quarentena = set(vocab_oficial.keys()).intersection(arquivos_q)
    total_recuperavel = ja_na_pasta.union(resgatáveis_quarentena)
    faltantes_reais = set(vocab_oficial.keys()) - total_recuperavel
    
    # Arquivos na pasta oficial que NÃO são o slug oficial (ex: arquivos sem acento)
    excedentes_pasta = arquivos_oficiais - set(vocab_oficial.keys())
    
    print(f"\n[{lg.upper()}] Vocabulário Oficial Esperado: {total_esperado} palavras")
    print(f"  ✔ Já corretos na pasta oficial:                   {len(ja_na_pasta)}")
    print(f"  📦 RESGATÁVEIS DA QUARENTENA (áudios prontos!):   {len(resgatáveis_quarentena)}")
    print(f"  ⚡ Faltantes reais que precisam ser sintetizados: {len(faltantes_reais)}")
    print(f"  🗑 Arquivos planos/órfãos na pasta oficial:       {len(excedentes_pasta)}")
    
    if faltantes_reais:
        print(f"     Lista dos que faltam sintetizar ({len(faltantes_reais)}):")
        for s in sorted(list(faltantes_reais)):
            print(f"       slug: {s:<30} | falar: '{vocab_oficial[s]}'")

print("\n" + "=" * 70)
