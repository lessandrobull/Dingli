import asyncio
import os
import json
import urllib.request
import edge_tts

SUPABASE_URL = "https://lxdmfaxxxfyzbpzvniyi.supabase.co"
SUPABASE_KEY = "sb_publishable_iPykeIMk376fBXL0b-hGjA_FkvaDcVp"
PASTA_DESTINO = "audios_dingli/en"

VOZES = {
    "v1": "en-US-AndrewNeural",
    "v2": "en-US-GuyNeural",
    "v3": "en-US-EricNeural",
    "v4": "en-US-JennyNeural",
    "v5": "en-GB-LibbyNeural",
    "v6": "en-CA-ClaraNeural"
}

def buscar_todas_frases():
    frases = []
    offset = 0
    tamanho_pagina = 1000
    
    while True:
        url = f"{SUPABASE_URL}/rest/v1/sentences?select=id,en&en=not.is.null&order=id.asc&limit={tamanho_pagina}&offset={offset}"
        req = urllib.request.Request(url, headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}"
        })
        with urllib.request.urlopen(req) as response:
            dados = json.loads(response.read().decode('utf-8'))
            if not dados:
                break
            frases.extend(dados)
            if len(dados) < tamanho_pagina:
                break
            offset += tamanho_pagina
            
    return frases

async def sintetizar_audio(semaforo, texto, voz, caminho_arquivo):
    if os.path.exists(caminho_arquivo) and os.path.getsize(caminho_arquivo) > 0:
        return False

    async with semaforo:
        for tentativa in range(3):
            try:
                com = edge_tts.Communicate(texto, voz)
                await com.save(caminho_arquivo)
                return True
            except Exception:
                if tentativa == 2:
                    print(f"\n[ERRO] Falha ao gerar: {caminho_arquivo}")
                    return False
                await asyncio.sleep(1.5)

async def main():
    os.makedirs(PASTA_DESTINO, exist_ok=True)
    
    print("Consultando frases no Supabase...")
    frases = buscar_todas_frases()
    total_frases = len(frases)
    total_audios = total_frases * len(VOZES)
    print(f"Total de frases encontradas: {total_frases} ({total_audios} arquivos de áudio no total)")
    
    semaforo = asyncio.Semaphore(5)
    tarefas = []
    
    for item in frases:
        f_id = item["id"]
        texto = item["en"].strip()
        if not texto:
            continue
            
        for v_num, voz in VOZES.items():
            arquivo = os.path.join(PASTA_DESTINO, f"{f_id}_{v_num}.mp3")
            tarefas.append(sintetizar_audio(semaforo, texto, voz, arquivo))

    concluidos = 0
    for future in asyncio.as_completed(tarefas):
        gerou = await future
        concluidos += 1
        if concluidos % 50 == 0 or concluidos == total_audios:
            pct = (concluidos / total_audios) * 100
            print(f"Progresso: {concluidos}/{total_audios} ({pct:.1f}%)", end="\r", flush=True)

    print("\nProcessamento concluído com sucesso!")

if __name__ == "__main__":
    asyncio.run(main())
