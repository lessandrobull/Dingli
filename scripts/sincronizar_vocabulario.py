# -*- coding: utf-8 -*-
import os, sys, re, csv, shutil, asyncio, subprocess
import edge_tts

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sanitizacao import sanitizar_palavra_audio

CSV_FILE = "supabase_sentences.csv"
PASTA_PALAVRAS = os.path.join("audios_dingli", "palavras")
PASTA_QUARENTENA = os.path.join("audios_dingli", "quarentena_orfaos")
FFMPEG_EXE = os.path.abspath("ffmpeg.exe")

if not os.path.exists(FFMPEG_EXE):
    raise FileNotFoundError(f"ffmpeg.exe não encontrado em: {FFMPEG_EXE}")

VOZES_OFICIAIS = {
    "en": "en-CA-ClaraNeural",
    "es": "es-MX-DaliaNeural",
    "fr": "fr-FR-DeniseNeural",
    "ge": "de-DE-KatjaNeural",
    "it": "it-IT-IsabellaNeural",
    "pt": "pt-BR-FranciscaNeural"
}

alvo = sys.argv[1].lower() if len(sys.argv) > 1 else "todos"
if alvo != "todos" and alvo not in VOZES_OFICIAIS:
    print(f"[ERRO] Idioma '{alvo}' inválido. Válidos: {list(VOZES_OFICIAIS.keys())} ou 'todos'")
    sys.exit(1)

idiomas_alvo = list(VOZES_OFICIAIS.keys()) if alvo == "todos" else [alvo]

print("=" * 65)
print(" DÌNGLÌ - PIPELINE UNIFICADO DE VOCABULÁRIO (PASSOS 10 E 11)")
print(f" Idiomas selecionados: {', '.join(i.upper() for i in idiomas_alvo)}")
print("=" * 65)

mapa_esperado = {l: {} for l in idiomas_alvo}
with open(CSV_FILE, "r", encoding="utf-8-sig", errors="ignore") as f:
    for row in csv.DictReader(f):
        fid = row.get("id") or row.get("ID")
        if not (fid and fid.isdigit() and 1 <= int(fid) <= 1200):
            continue
        for l in idiomas_alvo:
            texto = row.get(l, "")
            if texto:
                for token in texto.split():
                    slug = sanitizar_palavra_audio(token)
                    if slug and slug not in mapa_esperado[l]:
                        texto_fala = re.sub(r'[.,!?;:¿¡"“”`{}()[\]\-—…，。！？；：、«»/\\~*]', '', token.strip())
                        mapa_esperado[l][slug] = texto_fala

print("\n[ETAPA 1] AUDITORIA E QUARENTENA DE ARQUIVOS ÓRFÃOS:")
total_movidos = 0
for l in idiomas_alvo:
    dir_lang = os.path.join(PASTA_PALAVRAS, l)
    dir_quar = os.path.join(PASTA_QUARENTENA, l)
    os.makedirs(dir_quar, exist_ok=True)
    if not os.path.exists(dir_lang):
        continue

    locais = set(f for f in os.listdir(dir_lang) if f.endswith(".mp3"))
    esperados_com_ext = set(f"{s}.mp3" for s in mapa_esperado[l].keys())
    orfaos = locais - esperados_com_ext
    orfaos = {o for o in orfaos if not o.startswith("5550192")}

    for arq in orfaos:
        shutil.move(os.path.join(dir_lang, arq), os.path.join(dir_quar, arq))
        total_movidos += 1

    print(f"  [{l.upper()}] Esperados: {len(mapa_esperado[l]):<4} | Ativos: {len(locais) - len(orfaos):<4} | Órfãos em Quarentena: {len(orfaos):<4}")

faltantes_fila = []
for l in idiomas_alvo:
    dir_lang = os.path.join(PASTA_PALAVRAS, l)
    locais = set(f for f in os.listdir(dir_lang) if f.endswith(".mp3")) if os.path.exists(dir_lang) else set()
    for slug, texto_fala in mapa_esperado[l].items():
        if f"{slug}.mp3" not in locais:
            faltantes_fila.append((l, slug, texto_fala, VOZES_OFICIAIS[l]))

print(f"\n[ETAPA 2] PALAVRAS FALTANTES A SINTETIZAR: {len(faltantes_fila)}")
for l in idiomas_alvo:
    qtd = sum(1 for item in faltantes_fila if item[0] == l)
    if qtd > 0:
        print(f"  - [{l.upper()}]: {qtd} termos faltantes")

if not faltantes_fila:
    print("✔ Todas as palavras esperadas já existem em disco com o slug exato. Nenhuma síntese pendente!")
    sys.exit(0)

print("\n[ETAPA 3] SÍNTESE COM EDGE-TTS + PÓS-PROCESSAMENTO FFMPEG:")
semaforo = asyncio.Semaphore(4)
progresso = {"ok": 0, "erros": 0}

async def processar_palavra(lang, slug, texto_fala, voz):
    dir_lang = os.path.join(PASTA_PALAVRAS, lang)
    os.makedirs(dir_lang, exist_ok=True)
    final_mp3 = os.path.join(dir_lang, f"{slug}.mp3")
    raw_mp3 = os.path.join(dir_lang, f"temp_raw_{slug}.mp3")

    async with semaforo:
        sucesso_tts = False
        for tentativa in range(3):
            try:
                com = edge_tts.Communicate(texto_fala, voz)
                await com.save(raw_mp3)
                if os.path.exists(raw_mp3) and os.path.getsize(raw_mp3) > 0:
                    sucesso_tts = True
                    break
            except Exception:
                await asyncio.sleep(1)

        if not sucesso_tts:
            progresso["erros"] += 1
            print(f"\n[ERRO TTS] {lang}/{slug} ('{texto_fala}')")
            return

        cmd = [
            FFMPEG_EXE, "-y", "-i", raw_mp3,
            "-af", "adelay=300|300,apad=pad_dur=0.1",
            "-b:a", "128k",
            final_mp3
        ]

        def rodar_ffmpeg():
            res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return res.returncode == 0

        loop = asyncio.get_event_loop()
        ffmpeg_ok = await loop.run_in_executor(None, rodar_ffmpeg)

        if os.path.exists(raw_mp3):
            os.remove(raw_mp3)

        if ffmpeg_ok and os.path.exists(final_mp3) and os.path.getsize(final_mp3) > 0:
            progresso["ok"] += 1
        else:
            progresso["erros"] += 1
            print(f"\n[ERRO FFMPEG] {lang}/{slug}")

        total = len(faltantes_fila)
        pct = (progresso["ok"] / total) * 100 if total > 0 else 100
        print(f"Processando: {progresso['ok']}/{total} ({pct:.1f}%) | Falhas: {progresso['erros']}", end="\r", flush=True)

async def main():
    tarefas = [processar_palavra(l, s, t, v) for l, s, t, v in faltantes_fila]
    await asyncio.gather(*tarefas)
    print(f"\n\n✔ SÍNTESE CONCLUÍDA! Sucesso: {progresso['ok']} | Falhas: {progresso['erros']}")

if __name__ == "__main__":
    asyncio.run(main())
