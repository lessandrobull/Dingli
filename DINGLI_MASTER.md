# DINGLI_MASTER.md
**Documentação Conceitual e Operacional para IAs - Dingli**

---

## 1. Visão Geral da Plataforma
O **DINGLI** é um Progressive Web App (PWA) de aprendizado acelerado de idiomas e treino ativo de pronúncia baseado no ecossistema de estudo contínuo "Dìngloop" e no algoritmo proprietário de repetição espaçada (SRS) "Dominium"[cite: 1].
- **Proposta Central:** Input compreensível e treino prático de fala em tempo real com correção fonética imediata, operando através de uma esteira hermética e determinística com fila FIFO de até 5 cartas em jogo, sem contadores artificiais de tempo nos microciclos, com arquitetura offline-first e interface móvel responsiva[cite: 1].
- **Entrada de Dados:** Reconhecimento de voz em tempo real via Web Speech API para exercícios orais, além de digitação e seleção por toque para exercícios de escrita, baseados em uma grade fixa de exatamente 1.200 frases sequenciais distribuídas em 4 níveis do CEFR (A1 a B2), 40 tópicos e 7 idiomas (8 frentes, incluindo Mandarim Hanzi e Pinyin com tons)[cite: 1].
- **Processamento:** O sistema valida o acerto fonético e sintático, gerencia avanço e recuo de ranks, encaminha frases com 3 falhas vocais consecutivas para quarentena no laboratório fonético Dìnglab blindando o rank conquistado, agenda revisões de macrociclo com descansos exponenciais de 1 a 32 dias no algoritmo Dominium e sincroniza dados entre memória RAM, cache do navegador (IndexedDB e localStorage) e nuvem (Supabase)[cite: 1].

---

## 2. Ambiente de Desenvolvimento
- **Ambiente Operacional:** Windows[cite: 1].
- **Terminal Padrão:** Git Bash integrado ao VSCode[cite: 1].
- **Diretriz para IAs:** Todos os comandos de terminal sugeridos devem ser estritamente compatíveis com a sintaxe do Git Bash / Bash no ambiente Windows[cite: 1].
- **Sempre proibido inferir:** ao receber instruções, é obrigatório saber como o projeto está e como tem que ser antes de realizar qualquer alteração[cite: 1].

---

## 3. Infraestrutura e Serviços Externos (Invisíveis no Código Local)
Esta seção documenta as dependências que residem fora do repositório local e que o código-fonte por si só não explica completamente[cite: 1]:

### A. Supabase (PostgreSQL & Storage Remoto)[cite: 1]
- Banco de dados relacional com as tabelas `sentences` (base curricular das 1.200 frases em todos os idiomas), `curso_revisoes` (controle e versionamento independente por idioma), `user_progress` (persistência de progresso e maestria) e `reports_frases` (telemetria e relatórios de falhas fonéticas do Dìnglab)[cite: 1].
- Supabase Storage público no bucket `audios` contendo os arquivos de frases completas (`{lang}/{id}_{voz}.mp3`) e vocabulário de palavras isoladas (`palavras/{lang}/{slug}.mp3`)[cite: 1].

### B. Síntese Neural de Voz (Edge-TTS) e Pipeline FFmpeg[cite: 1]
- Síntese automatizada de frases e termos isolados via Microsoft Edge-TTS cobrindo as vozes oficiais de Inglês, Espanhol, Francês, Italiano, Português, Alemão e Mandarim[cite: 1].
- Tratamento de áudio anti-corte (prevenção de DAC sleep) nos arquivos de vocabulário com pré-delay de 300ms (`adelay=300|300`) e pós-padding de 100ms (`apad=pad_dur=0.1`) a 128 kbps via FFmpeg para evitar corte de pronúncia em fones Bluetooth por economia de energia[cite: 1].

### C. Web Speech API Nativa do Navegador[cite: 1]
- Mecanismo de reconhecimento de voz contínuo executado nativamente no motor do navegador do usuário (`interimResults = true`) com limiar de acerto >= 75% e tolerância de silêncio (VAD) de 1,3s, eliminando custos de API externa de transcrição durante o fluxo de estudo[cite: 1].

---

## 4. Protocolo de Inicialização para IAs (Geração do Dumper)
**Ação Obrigatória:** Ao iniciar uma nova conversa técnica, a IA deve orientar o usuário a executar o comando abaixo no Git Bash[cite: 1]. Este script varre a estrutura do projeto e consolida a árvore de arquivos e o código-fonte atualizado no arquivo `DINGLI_DUMPER.md`[cite: 1].

> **Parâmetro de Estabilidade Técnica:** A Seção 2 do Dumper foi calibrada para manter o volume total abaixo de 8.000 linhas (~250 KB), garantindo entrega integral sem cortes em nenhum modelo de IA. Arquivos utilitários de build local, binários, mídias, backups, bases estáticas e scripts Python de automação permanecem listados na Árvore (Seção 1) e documentados neste Master, não sendo despejados na Seção 2.

```bash
OUTPUT="DINGLI_DUMPER.md"
echo "Gerando Snapshot Técnico do DINGLI..."
echo "# 🖨️ DINGLI_DUMPER.md" > "$OUTPUT"
echo "Snapshot técnico gerado com estrutura de arquivos e código-fonte da aplicação." >> "$OUTPUT"

echo -e "\n## 1. ÁRVORE DE DIRETÓRIOS" >> "$OUTPUT"
find . -type f \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -path "*/dist/*" \
  -not -path "*/dev-dist/*" \
  -not -path "*/build/*" \
  -not -path "*/audios*/*" \
  -not -path "*/__pycache__/*" \
  -not -name "*.env*" \
  -not -name "$OUTPUT" \
  -not -name "*.mp3" \
  -not -name "*.wav" \
  -not -name "*.png" \
  -not -name "*.jpg" \
  -not -name "*.svg" \
  -not -name "*.ico" \
  -not -name "*.webp" \
  -not -name "*.pyc" | sort >> "$OUTPUT"

echo -e "\n## 2. CÓDIGO FONTE INTEGRAL" >> "$OUTPUT"
find . -type f \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -path "*/dist/*" \
  -not -path "*/dev-dist/*" \
  -not -path "*/build/*" \
  -not -path "*/audios*/*" \
  -not -path "*/public/explicacoes/*" \
  -not -path "*/scripts/*" \
  -not -path "*/__pycache__/*" \
  -not -name "*.env*" \
  -not -name "$OUTPUT" \
  -not -name "*.exe" \
  -not -name "*.dll" \
  -not -name "*.csv*" \
  -not -name "*.bak" \
  -not -name "*.mp3" \
  -not -name "*.wav" \
  -not -name "*.png" \
  -not -name "*.jpg" \
  -not -name "*.svg" \
  -not -name "*.ico" \
  -not -name "*.webp" \
  -not -name "*.pyc" \
  -not -name "*.txt" \
  -not -name "package-lock.json" \
  -not -name "audioPronuncias.json" \
  -not -name "dingli_master_backup.md" \
  -not -name "documentacao_dominium.html" \
  -not -name "DINGLI_MASTER.md" \
  -not -name "historico_revisoes.md" \
  -not -name "README.md" \
  -not -name "gerarExplicacoes.mjs" \
  -not -name "extrair.mjs" | sort | while read -r file; do
  echo -e "\n\n### 📄 ARQUIVO: $file" >> "$OUTPUT"
  sed -e 's/GEMINI_API_KEY: "[^"]*"/GEMINI_API_KEY: "SUA_CHAVE_GEMINI_AQUI"/' \
      -e 's/SUPABASE_SERVICE_ROLE_KEY: "[^"]*"/SUPABASE_SERVICE_ROLE_KEY: "SUA_CHAVE_SUPABASE_SERVICE_ROLE_AQUI"/' \
      "$file" >> "$OUTPUT"
done
echo "Concluído! Arquivo $OUTPUT gerado com sucesso."
```

*Instrução para a IA:* Somente após o usuário rodar o comando e disponibilizar o conteúdo do `DINGLI_DUMPER.md`, inicie as análises e edições solicitadas[cite: 1].

---

## 5. Protocolo de Autoatualização e Governança do Dumper (Encerramento de Sessão)
**Ação Obrigatória:** Antes de dar como finalizado qualquer atendimento que altere a arquitetura, estrutura ou escopo da plataforma, a IA deve cumprir o seguinte checklist de governança[cite: 1]:

1. **Auditoria de Escopo e Arquitetura:** Avaliar se as alterações realizadas modificaram integrações externas (Supabase, Edge-TTS, Web Speech API, etc.), dependências estruturais ou fluxos de trabalho descritos na Seção 3 deste documento[cite: 1].
2. **Governança do Comando do Dumper (Seção 4):** Caso novos arquivos secundários, dados estáticos brutos, scripts pontuais de automação ou arquivos de documentação sejam criados no projeto, a IA DEVE atualizar as regras `-not -path` ou `-not -name` na Seção 4 para preservar o teto operacional de segurança de 8.000 linhas da Seção 2, mantendo nela estritamente o código-fonte vivo da aplicação (`src/` e arquivos vitais de configuração)[cite: 1].
3. **Entrega de Atualização:** Caso identifique divergências, fornecer explicitamente ao usuário a versão revisada e atualizada do `DINGLI_MASTER.md` utilizando encapsulamento com 4 crases para evitar quebra de formatação[cite: 1].
4. **Instrução de Novo Snapshot:** Instruir o usuário a gerar uma nova versão do `DINGLI_DUMPER.md` caso arquivos tenham sido criados, movidos ou excluídos[cite: 1].