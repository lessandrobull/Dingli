# -*- coding: utf-8 -*-
import sys, subprocess

alvo = sys.argv[1] if len(sys.argv) > 1 else "todos"

print("=" * 65)
print(" DÌNGLÌ - PASSO 7: PIPELINE COMPLETO DE VOCABULÁRIO")
print(f" Execução: [Passo 10/11 Local] -> [Passo 12 Remoto]")
print("=" * 65)

# A. Executar quarentena local e síntese Edge-TTS + FFmpeg
res1 = subprocess.run([sys.executable, "scripts/sincronizar_vocabulario.py", alvo])
if res1.returncode != 0:
    print("[FALHA] Interrupção no pipeline local de vocabulário.")
    sys.exit(res1.returncode)

# B. Executar upload para o Storage, purga remota e ateste de 100% paridade
res2 = subprocess.run([sys.executable, "scripts/sincronizar_storage_vocabulario.py", alvo])
if res2.returncode != 0:
    print("[FALHA] Interrupção no pipeline de paridade do Storage.")
    sys.exit(res2.returncode)

print("\n🎉 PASSO 7 FINALIZADO COM 100% DE PARIDADE LOCAL E REMOTA!")
