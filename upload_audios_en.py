import os
import sys
import glob
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from supabase import create_client

SUPABASE_URL = "https://lxdmfaxxxfyzbpzvniyi.supabase.co"
SUPABASE_SERVICE_KEY = sys.argv[1] if len(sys.argv) > 1 else "SUA_SERVICE_ROLE_AQUI"
BUCKET_NAME = "audios"
PASTA_LOCAL = "audios_dingli/en"

if SUPABASE_SERVICE_KEY == "SUA_SERVICE_ROLE_AQUI":
    print("\n[ERRO] Passe a service_role como argumento:\npython upload_audios_en.py SUA_CHAVE\n")
    sys.exit(1)

client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def upload_arquivo(caminho_local):
    nome_arquivo = os.path.basename(caminho_local)
    caminho_storage = f"en/{nome_arquivo}"
    
    with open(caminho_local, "rb") as f:
        conteudo = f.read()

    for tentativa in range(3):
        try:
            client.storage.from_(BUCKET_NAME).upload(
                path=caminho_storage,
                file=conteudo,
                file_options={"content-type": "audio/mpeg", "upsert": "true"}
            )
            return True
        except Exception as e:
            if tentativa == 2:
                print(f"\n[FALHA DEFINITIVA] {nome_arquivo}: {e}")
                return False
            time.sleep(0.5)

def main():
    arquivos = glob.glob(os.path.join(PASTA_LOCAL, "*.mp3"))
    total = len(arquivos)
    print(f"Iniciando envio dos {total} arquivos para o bucket '{BUCKET_NAME}/en/'...")

    concluidos = 0
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = [executor.submit(upload_arquivo, arq) for arq in arquivos]
        for future in as_completed(futures):
            future.result()
            concluidos += 1
            if concluidos % 50 == 0 or concluidos == total:
                pct = (concluidos / total) * 100
                print(f"Upload: {concluidos}/{total} ({pct:.1f}%)", end="\r", flush=True)

    print("\nUpload concluído com sucesso!")

if __name__ == "__main__":
    main()
