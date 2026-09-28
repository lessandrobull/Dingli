# -*- coding: utf-8 -*-
import re
import unicodedata

def sanitizar_palavra_audio(palavra):
    p = (palavra or "").strip().lower().replace("ß", "ss")
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
