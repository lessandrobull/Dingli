# -*- coding: utf-8 -*-
import os
import re
import csv
import unicodedata

CSV_FILE = "supabase_sentences.csv"
PASTA_IT = os.path.join("audios_dingli", "palavras", "it")

# Função espelho exata do frontend (src/services/audioCacheService.js)
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
print("AUDITORIA SOMENTE LEITURA - PALAVRAS DO ITALIANO (IT)")
print("=" * 65)

# 1. Extrair vocabulário oficial a partir do CSV
vocabulario_oficial = {}
with open(CSV_FILE, "r", encoding="utf-8-sig", errors="ignore") as f:
    reader = csv.DictReader(f)
    for row in reader:
        f_id = row.get("id") or row.get("ID")
        if f_id and f_id.isdigit() and 1 <= int(f_id) <= 1200:
            texto = row.get("it") or ""
            for w in texto.split():
                slug = sanitizar_palavra_audio_frontend(w)
                if slug and slug not in vocabulario_oficial:
                    # Texto limpo para síntese de voz mantendo a acentuação original
                    w_fala = re.sub(r'[.,!?;:¿¡"“”`{}()[\]\-—…，。！？；：、«»/\\~*]', '', w.strip().lower())
                    vocabulario_oficial[slug] = w_fala

print(f"Total de termos únicos oficiais no vocabulário: {len(vocabulario_oficial)}")

# 2. Varrer arquivos locais existentes
arquivos_locais = set(os.path.splitext(f)[0] for f in os.listdir(PASTA_IT) if f.endswith(".mp3")) if os.path.exists(PASTA_IT) else set()
print(f"Total de arquivos locais existentes em palavras/it/: {len(arquivos_locais)}")

# 3. Cruzamento determinístico
prontas = set(vocabulario_oficial.keys()).intersection(arquivos_locais)
faltantes = set(vocabulario_oficial.keys()) - arquivos_locais
orfas = arquivos_locais - set(vocabulario_oficial.keys())

print("\n--- RESULTADO DA CONFERÊNCIA ---")
print(f"  ✔ Palavras prontas (já existem com o slug exato): {len(prontas)}")
print(f"  ⚡ Palavras faltantes (necessitam síntese):        {len(faltantes)}")
print(f"  🗑 Palavras órfãs (a isolar na quarentena):       {len(orfas)}")

# 4. Salvar relatórios para conferência
with open("palavras_it_faltantes.txt", "w", encoding="utf-8") as f:
    for slug in sorted(faltantes):
        f.write(f"{slug}\t{vocabulario_oficial[slug]}\n")

with open("palavras_it_orfas.txt", "w", encoding="utf-8") as f:
    for slug in sorted(orfas):
        f.write(f"{slug}\n")

print("\nRelatórios gerados em disco:")
print(" - palavras_it_faltantes.txt")
print(" - palavras_it_orfas.txt")

if faltantes:
    print(f"\nAmostra de palavras faltantes ({len(faltantes)} no total):")
    for s in sorted(list(faltantes))[:10]:
        print(f"   slug: {s:<25} | falar: '{vocabulario_oficial[s]}'")

if orfas:
    print(f"\nAmostra de palavras órfãs ({len(orfas)} no total):")
    for s in sorted(list(orfas))[:10]:
        print(f"   {s}.mp3")
