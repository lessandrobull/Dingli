# -*- coding: utf-8 -*-
import os
import re
import csv
import unicodedata

CSV_FILE = "supabase_sentences.csv"
PASTA_PALAVRAS = "audios_dingli/palavras"

# A função exata usada no frontend (src/services/audioCacheService.js)
def sanitizar_palavra_audio_frontend(palavra):
    p = (palavra or "").strip().lower()
    p = p.replace('ß', 'ss')
    # Normalização NFD e remoção de acentos gráficos
    nfd = unicodedata.normalize('NFD', p)
    sem_acento = "".join(c for c in nfd if unicodedata.category(c) != 'Mn')
    # Remove pontuações e hífens idêntico ao regex do JS:
    # /[.,!?;:¿¡"“”`{}()[\]\-—…，。！？；：、«»/\\~*]/g
    sem_pontuacao = re.sub(r'[.,!?;:¿¡"“”`{}()[\]\-—…，。！？；：、«»/\\~*]', '', sem_acento)
    # Substitui apóstrofos por underline: /['’]/g -> _
    slug = sem_pontuacao.replace("'", "_").replace("’", "_")
    return slug

with open(CSV_FILE, mode='r', encoding='utf-8-sig', errors='ignore') as f:
    linhas = list(csv.DictReader(f))

idiomas = [
    ("en", "en"),
    ("es", "es"),
    ("fr", "fr"),
    ("it", "it"),
    ("pt", "pt"),
    ("ge", "ge"),
    ("zh", "zh")
]

print("=" * 70)
print("AUDITORIA DE CLIQUE DOS CARDS DE FALA (SIMULAÇÃO REAL DO FRONTEND)")
print("=" * 70)

relatorio = {}

for cod, col in idiomas:
    pasta = os.path.join(PASTA_PALAVRAS, cod)
    arquivos_no_disco = set()
    if os.path.exists(pasta):
        arquivos_no_disco = {f[:-4] for f in os.listdir(pasta) if f.endswith(".mp3")}
    
    # Extrair todos os cliques possíveis que o aluno pode dar nas frases
    palavras_solicitadas = {}
    for row in linhas:
        texto = row.get(col, "")
        if not texto:
            continue
        
        # No chinês tradicional/simplificado pode haver divisão por caractere ou espaço
        tokens = str(texto).split()
        for tk in tokens:
            slug = sanitizar_palavra_audio_frontend(tk)
            palavra_limpa = tk.strip('.,!?;:¿¡"“”`{}()[]-—…，。！？；：、«»/\\~*')
            if slug and slug not in palavras_solicitadas:
                palavras_solicitadas[slug] = palavra_limpa
    
    total_necessarias = len(palavras_solicitadas)
    presentes = set(palavras_solicitadas.keys()).intersection(arquivos_no_disco)
    faltantes = set(palavras_solicitadas.keys()) - arquivos_no_disco
    orfaos = arquivos_no_disco - set(palavras_solicitadas.keys())
    
    relatorio[cod] = {
        'total': total_necessarias,
        'presentes': len(presentes),
        'faltantes': faltantes,
        'orfaos': len(orfaos),
        'mapa': palavras_solicitadas
    }
    
    status = "✔ 100% COBERTO" if len(faltantes) == 0 else f"✖ {len(faltantes)} FALTANDO (NÃO TOCAM)"
    print(f"[{cod.upper()}] Necessárias: {total_necessarias:4d} | No Disco: {len(presentes):4d} | {status} | Órfãos no disco: {len(orfaos)}")
    if faltantes:
        amostra = sorted(list(faltantes))[:12]
        print(f"       Exemplos que não tocam no {cod.upper()}: {amostra}")

print("=" * 70)
