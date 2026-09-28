# -*- coding: utf-8 -*-
import os
import re
import csv
import unicodedata

CSV_FILE = "supabase_sentences.csv"
PASTA_GE = os.path.join("audios_dingli", "palavras", "ge")

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
        "\u0327": "ced"
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

print("=" * 65)
print("AUDITORIA SOMENTE LEITURA - PALAVRAS DO ALEMÃO (GE)")
print("=" * 65)

vocabulario_oficial = {}
with open(CSV_FILE, "r", encoding="utf-8-sig", errors="ignore") as f:
    reader = csv.DictReader(f)
    for row in reader:
        f_id = row.get("id") or row.get("ID")
        if f_id and f_id.isdigit() and 1 <= int(f_id) <= 1200:
            texto = row.get("ge") or ""
            for w in texto.split():
                slug = sanitizar_palavra_audio_frontend(w)
                if slug and slug not in vocabulario_oficial:
                    w_fala = re.sub(r'[.,!?;:¿¡"“”`{}()[\]\-—…，。！？；：、«»/\\~*]', '', w.strip().lower())
                    vocabulario_oficial[slug] = w_fala

print(f"Total de termos únicos oficiais no vocabulário: {len(vocabulario_oficial)}")

arquivos_locais = set(os.path.splitext(f)[0] for f in os.listdir(PASTA_GE) if f.endswith(".mp3")) if os.path.exists(PASTA_GE) else set()
print(f"Total de arquivos locais existentes em palavras/ge/: {len(arquivos_locais)}")

prontas = set(vocabulario_oficial.keys()).intersection(arquivos_locais)
faltantes = set(vocabulario_oficial.keys()) - arquivos_locais
orfas = arquivos_locais - set(vocabulario_oficial.keys())

print("\n--- RESULTADO DA CONFERÊNCIA ---")
print(f"  ✔ Palavras prontas (já existem com o slug exato): {len(prontas)}")
print(f"  ⚡ Palavras faltantes (necessitam síntese):        {len(faltantes)}")
print(f"  🗑 Palavras órfãs (a isolar na quarentena):       {len(orfas)}")

with open("palavras_ge_faltantes.txt", "w", encoding="utf-8") as f:
    for slug in sorted(faltantes):
        f.write(f"{slug}\t{vocabulario_oficial[slug]}\n")

with open("palavras_ge_orfas.txt", "w", encoding="utf-8") as f:
    for slug in sorted(orfas):
        f.write(f"{slug}\n")

print("\nRelatórios dry-run gerados na raiz: palavras_ge_faltantes.txt, palavras_ge_orfas.txt")
