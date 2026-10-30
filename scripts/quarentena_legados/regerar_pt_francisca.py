# -*- coding: utf-8 -*-
import asyncio, csv, os, re, shutil, subprocess, unicodedata, edge_tts

CSV_FILE = 'supabase_sentences.csv'
PASTA_PT = os.path.join('audios_dingli', 'palavras', 'pt')
PASTA_QUARENTENA_PT = os.path.join('audios_dingli', 'quarentena_orfaos', 'pt_legado')
FFMPEG = os.path.abspath('ffmpeg.exe')
VOZ = 'pt-BR-FranciscaNeural'
SEMAFORO_LIMITE = 6

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

# 1. Isolamento seguro da pasta legada
if os.path.exists(PASTA_PT):
    os.makedirs(os.path.dirname(PASTA_QUARENTENA_PT), exist_ok=True)
    if os.path.exists(PASTA_QUARENTENA_PT):
        shutil.rmtree(PASTA_QUARENTENA_PT)
    shutil.move(PASTA_PT, PASTA_QUARENTENA_PT)
    print(f"✔ Pasta legada de 'pt' movida com segurança para: {PASTA_QUARENTENA_PT}")

os.makedirs(PASTA_PT, exist_ok=True)

# 2. Extração determinística do vocabulário oficial
mapa_palavras = {}  # slug -> texto_tts

with open(CSV_FILE, mode='r', encoding='utf-8-sig') as f:
    for row in csv.DictReader(f):
        texto = row.get('pt', '')
        if not texto: continue
        for token in texto.split():
            slug = sanitizar_palavra_audio(token)
            if not slug or slug in mapa_palavras:
                continue
            
            # Ajuste fonético de fechamento para a conjunção 'e'
            limpa = token.strip('.,!?;:¿¡"“”`{}()[]-—…，。！？；：、«»/\\~*').lower()
            if limpa == 'e':
                texto_tts = 'ê'
            else:
                texto_tts = limpa
            
            mapa_palavras[slug] = texto_tts

total = len(mapa_palavras)
print(f"Total de palavras únicas a sintetizar: {total} (Voz: {VOZ})")

# 3. Pipeline assíncrono: Edge-TTS + FFmpeg 300ms
async def sintetizar_item(slug, texto_tts, sem, progresso):
    destino_final = os.path.join(PASTA_PT, f"{slug}.mp3")
    destino_raw = os.path.join(PASTA_PT, f"{slug}_raw.mp3")

    async with sem:
        for tentativa in range(3):
            try:
                com = edge_tts.Communicate(texto_tts, VOZ)
                await com.save(destino_raw)
                
                cmd = [
                    FFMPEG, '-y', '-i', destino_raw,
                    '-af', 'adelay=300|300,apad=pad_dur=0.1',
                    '-b:a', '128k', destino_final
                ]
                res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                if os.path.exists(destino_raw):
                    os.remove(destino_raw)
                
                if res.returncode == 0 and os.path.exists(destino_final) and os.path.getsize(destino_final) > 0:
                    progresso['ok'] += 1
                    break
            except Exception:
                if os.path.exists(destino_raw):
                    os.remove(destino_raw)
                await asyncio.sleep(1.0)
        else:
            progresso['falhas'].append(slug)

    progresso['atual'] += 1
    atual = progresso['atual']
    if atual % 100 == 0 or atual == total:
        print(f"Progresso [PT]: {atual}/{total} gerados ({progresso['ok']} sucessos, {len(progresso['falhas'])} falhas)...", flush=True)

async def main():
    sem = asyncio.Semaphore(SEMAFORO_LIMITE)
    progresso = {'atual': 0, 'ok': 0, 'falhas': []}
    tarefas = [sintetizar_item(slug, txt, sem, progresso) for slug, txt in mapa_palavras.items()]
    await asyncio.gather(*tarefas)

    print("\n" + "=" * 50)
    print(f"Concluído! Total gerado no disco: {len(os.listdir(PASTA_PT))} arquivos.")
    if progresso['falhas']:
        print(f"Falhas registradas ({len(progresso['falhas'])}): {progresso['falhas']}")
    else:
        print("✔ 100% dos arquivos gerados com sucesso e sem falhas.")

asyncio.run(main())
