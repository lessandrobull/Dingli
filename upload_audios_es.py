import os
import sys
import glob
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

SUPABASE_URL = "https://lxdmfaxxxfyzbpzvniyi.supabase.co"
SUPABASE_SERVICE_KEY = sys.argv[1] if len(sys.argv) > 1 else "SUA_SERVICE_ROLE_AQUI"
BUCKET_NAME = "audios"
PASTA_LOCAL = "audios_dingli/es"

if SUPABASE_SERVICE_KEY == "SUA_SERVICE_ROLE_AQUI":
    print("\n[ERRO] Passe a service_role como argumento:\npython upload_audios_es.py SUA_CHAVE\n")
    sys.exit(1)

UPLOAD_URL = f"{SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}/es"

def upload_arquivo(caminho_local):
    nome_arquivo = os.path.basename(caminho_local)
    url = f"{UPLOAD_URL}/{nome_arquivo}"
    
    with open(caminho_local, "rb") as f:
        conteudo = f.read()

    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "audio/mpeg",
        "x-upsert": "true"
    }

    for tentativa in range(4):
        try:
            req = urllib.request.Request(url, data=conteudo, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=30) as resp:
                if resp.status in (200, 201):
                    return True
        except urllib.error.HTTPError as e:
            if e.code in (200, 201):
                return True
            if tentativa == 3:
                print(f"\n[FALHA HTTP {e.code}] {nome_arquivo}")
                return False
        except Exception as e:
            if tentativa == 3:
                print(f"\n[FALHA CONEXAO] {nome_arquivo}: {e}")
                return False
        time.sleep(1 + tentativa)
    return False

def main():
    arquivos = glob.glob(os.path.join(PASTA_LOCAL, "*.mp3"))
    total = len(arquivos)
    print(f"Iniciando envio nativo de {total} arquivos para {BUCKET_NAME}/es/...")

    concluidos = 0
    # 3 workers paralelos: velocidade ideal sem sobrecarregar sockets no Windows
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(upload_arquivo, arq) for arq in arquivos]
        for future in as_completed(futures):
            future.result()
            concluidos += 1
            if concluidos % 50 == 0 or concluidos == total:
                pct = (concluidos / total) * 100
                print(f"Upload: {concluidos}/{total} ({pct:.1f}%)", end="\r", flush=True)

    print("\nUpload concluido com sucesso!")

if __name__ == "__main__":
    main()
