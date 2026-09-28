# -*- coding: utf-8 -*-
import os
import re
import csv
import unicodedata

CSV_FILE = "supabase_sentences.csv"
PASTA_PALAVRAS = os.path.join("audios_dingli", "palavras")

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

# 1. Carregar frases 1 e 988 do CSV
frases = {}
with open(CSV_FILE, "r", encoding="utf-8-sig", errors="ignore") as f:
    for row in csv.DictReader(f):
        f_id = row.get("id") or row.get("ID")
        if f_id in ["1", "988"]:
            frases[int(f_id)] = row

idiomas = ["en", "es", "fr", "it", "pt", "ge", "zh"]

print("=" * 70)
print("1. VERIFICAÇÃO DE 'Dìnglì' (FRASE 1) EM CADA PASTA DE PALAVRAS")
print("=" * 70)
slug_dingli = sanitizar_palavra_audio_frontend("Dìnglì")
print(f"Slug esperado para 'Dìnglì': {slug_dingli}.mp3\n")

for lg in idiomas:
    pasta_lg = os.path.join(PASTA_PALAVRAS, lg)
    existe = os.path.exists(os.path.join(pasta_lg, f"{slug_dingli}.mp3"))
    print(f"  palavras/{lg:<4} -> {slug_dingli}.mp3 existe? {'✔ SIM' if existe else '✖ NÃO (Falta gerar)'}")

print("\n" + "=" * 70)
print("2. VERIFICAÇÃO DAS PALAVRAS DA FRASE 1 E FRASE 988 EM ES, FR E IT")
print("=" * 70)

for f_id in [1, 988]:
    print(f"\n--- FRASE ID {f_id} ---")
    for lg in ["es", "fr", "it"]:
        texto = frases.get(f_id, {}).get(lg, "")
        print(f"[{lg.upper()}] Texto: \"{texto}\"")
        pasta_lg = os.path.join(PASTA_PALAVRAS, lg)
        tokens = texto.split()
        for tk in tokens:
            slug = sanitizar_palavra_audio_frontend(tk)
            if not slug:
                continue
            arq = f"{slug}.mp3"
            existe = os.path.exists(os.path.join(pasta_lg, arq))
            status = "✔ OK" if existe else "✖ FALTA NO DISCO"
            if not existe:
                print(f"    - {tk:<20} -> slug: {slug:<30} [{status}]")
            else:
                print(f"    - {tk:<20} -> slug: {slug:<30} [{status}]")

print("\n" + "=" * 70)
print("3. RESUMO GERAL DE FALTANTES EM CADA IDIOMA AUDITADO")
print("=" * 70)
# Conferência geral de cada idioma contra o vocabulário total do CSV
with open(CSV_FILE, "r", encoding="utf-8-sig", errors="ignore") as f:
    todas_linhas = list(csv.DictReader(f))

for lg in ["en", "es", "fr", "it", "pt"]:
    vocab_total = set()
    for row in todas_linhas:
        txt = row.get(lg, "")
        for w in txt.split():
            s = sanitizar_palavra_audio_frontend(w)
            if s:
                vocab_total.add(s)
    
    pasta_lg = os.path.join(PASTA_PALAVRAS, lg)
    locais = set(os.path.splitext(f)[0] for f in os.listdir(pasta_lg) if f.endswith(".mp3")) if os.path.exists(pasta_lg) else set()
    faltantes = vocab_total - locais
    print(f"[{lg.upper()}] Vocabulário Oficial: {len(vocab_total):4d} | No Disco: {len(locais):4d} | Faltantes Reais: {len(faltantes)}")
    if faltantes:
        print(f"     Lista de Faltantes: {sorted(list(faltantes))}")
