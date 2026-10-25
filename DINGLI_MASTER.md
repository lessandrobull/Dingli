# DINGLI_MASTER.md
**Documentação Conceitual e Operacional para IAs - Dingli**

---

## 1. Visão Geral da Plataforma
O **DINGLI** é um Progressive Web App (PWA) de aprendizado acelerado de idiomas e treino ativo de pronúncia baseado no ecossistema de estudo contínuo "Dìngloop" e no algoritmo proprietário de repetição espaçada (SRS) "Dominium".
- **Proposta Central:** Input compreensível e treino prático de fala em tempo real com correção fonética imediata, operando através de uma esteira hermética e determinística com fila FIFO de até 5 cartas em jogo (`LIMITE_BANDEJA = 5`), sem contadores artificiais de tempo nos microciclos, com arquitetura offline-first e interface móvel responsiva.
- **Entrada de Dados:** Reconhecimento de voz em tempo real via Web Speech API para exercícios orais, além de digitação e seleção por toque para exercícios de escrita, baseados em uma grade fixa de exatamente 1.200 frases sequenciais distribuídas em 4 níveis do CEFR (A1 a B2), 40 tópicos e 7 idiomas (8 frentes, incluindo Mandarim Hanzi e Pinyin com tons).
- **Processamento:** O sistema valida o acerto fonético e sintático, gerencia avanço e recuo de ranks (R1 a R27), encaminha frases para quarentena no laboratório fonético **Dìnglab** (automaticamente após 3 falhas vocais consecutivas ou manualmente via **Modo Pitstop** durante qualquer exercício) blindando o rank conquistado, oferece treino livre no **Modo Espelho** (com gravação da própria voz e metrônomo de repetição por palavra) e reintegração via **Prova de Fogo**, agenda revisões de macrociclo com descansos exponenciais de 1 a 32 dias no algoritmo Dominium, aplica atualizações cirúrgicas de versão de conteúdo (`CardAvisoAtualizacao`) e sincroniza dados entre memória RAM, cache do navegador (Cache Storage, IndexedDB e localStorage) e nuvem (Supabase e Cloudflare R2).

---

## 2. Ambiente de Desenvolvimento
- **Ambiente Operacional:** Windows.
- **Terminal Padrão:** Git Bash integrado ao VSCode.
- **Diretriz para IAs:** Todos os comandos de terminal sugeridos devem ser estritamente compatíveis com a sintaxe do Git Bash / Bash no ambiente Windows.
- **Sempre proibido inferir:** ao receber instruções, é obrigatório saber como o projeto está e como tem que ser antes de realizar qualquer alteração.

---

## 3. Infraestrutura e Serviços Externos (Invisíveis no Código Local)
Esta seção documenta as dependências que residem fora do repositório local e os motores híbridos que o código-fonte consome:

### A. Supabase (PostgreSQL & Auth Anônima)
- Autenticação anônima silenciosa (`signInAnonymously`) com fallback transparente para operação 100% local.
- Banco de dados relacional com as tabelas:
  - `sentences`: base curricular das 1.200 frases em todos os idiomas, tópicos por idioma de origem (`topic_{lang}`) e frases inspiracionais.
  - `curso_revisoes`: controle de versionamento independente por idioma (`versao`, `ids_alterados`, `descricao`), permitindo invalidação seletiva de cache e reset cirúrgico apenas das frases atualizadas.
  - `user_progress`: persistência de progresso e maestria em nuvem (`user_id`, `idioma`, `maestria`) com regras de degradação por inatividade.
  - `reports_frases`: telemetria de reportes manuais dos alunos, quarentenas automáticas do Dìnglab (3 erros vocais) e superações na Prova de Fogo, gerenciáveis pelo painel administrativo (`Adm.jsx`).

### B. Cloudflare R2 (Storage Remoto de Áudios) e Cache Offline Híbrido
- Bucket público no **Cloudflare R2** (`https://pub-b24d092a7bf34fd9bf22befba89de35f.r2.dev`) contendo:
  - Arquivos de frases completas (`/{lang}/{id}_{voz}.mp3`), com 6 vozes (`v1` a `v6`) para Inglês e Espanhol e 4 vozes (`v1` a `v4`) para Francês, Italiano, Alemão, Português e Mandarim (`zh`).
  - Arquivos de vocabulário de palavras isoladas (`/palavras/{lang}/{slug}.mp3`) sanitizados com mapeamento de diacríticos.
- Controle de versionamento local (`VERSOES_AUDIOS`) para *cache busting* silencioso (`?v=2`) em regravações pontuais.
- Persistência offline em duas camadas: **Cache Storage API** (`dingli-audios-v1`) como camada primária e **IndexedDB** (`dingli_offline_db` v3 com as *stores* `topics_cache`, `sentences_cache` e `audios_cache`) como *fallback* para dados e blobs de áudio.

### C. Síntese Neural de Voz (Edge-TTS), Pipeline FFmpeg e Motor de Reprodução
- Síntese automatizada de frases e termos isolados via Microsoft Edge-TTS cobrindo as vozes oficiais dos 7 idiomas (scripts em `scripts/`).
- Tratamento de áudio anti-corte (prevenção de DAC sleep) nos arquivos de vocabulário com pré-delay de 300ms (`adelay=300|300`) e pós-padding de 100ms (`apad=pad_dur=0.1`) a 128 kbps via FFmpeg para evitar corte de pronúncia em fones Bluetooth por economia de energia.
- Sorteio sem repetição da fila de vozes em tempo de execução (`useSpeech.js`), troca forçada para uma voz diferente da anterior na reprodução lenta pós-erro e velocidades calibradas por idioma (`VELOCIDADES_AUDIO`).

### D. Web Speech API, MediaRecorder e Explicações Estáticas Locais
- **Web Speech API:** Reconhecimento de voz contínuo executado nativamente no navegador (`continuous = true`, `interimResults = true`) com limiar adaptativo (`>= 75%` geral e `>= 50%` para frases de até 2 palavras), confirmação rápida de acerto em `750ms` e tolerância de silêncio (VAD) de `1,3s`, além de normalização fonética e conversão de numerais por extenso (`NUMEROS_EXTENSO` e `normalizarMandarimNumeros`).
- **MediaRecorder API:** Gravação local em tempo real da voz do aluno (`audio/webm`) no Modo Espelho do Dìnglab para reprodução comparativa imediata ("Ouvir gravação").
- **Base Estática de Explicações (`/public/explicacoes/`):** Explicações gramaticais e *breakdowns* de vocabulário pré-gerados em arquivos JSON estáticos (`/public/explicacoes/{estudo}_{origem}/{nivel}_{topico}.json`) com cache em memória (`cacheExplicacoesTopico`), eliminando latência e custos de API de IA durante o estudo.

---

## 4. Protocolo de Inicialização para IAs (Geração do Dumper)
**Ação Obrigatória:** Ao iniciar uma nova conversa técnica, a IA deve orientar o usuário a executar o comando abaixo no Git Bash. Este script varre a estrutura do projeto e consolida a árvore de arquivos e o código-fonte atualizado no arquivo `DINGLI_DUMPER.md`.

> **Parâmetro de Estabilidade Técnica:** A Seção 2 do Dumper foi calibrada para manter o volume total abaixo de 8.000 linhas (~250 KB), garantindo entrega integral sem cortes em nenhum modelo de IA. Arquivos utilitários de build local, binários, mídias, backups, bases estáticas de explicações e scripts Python de automação permanecem documentados neste Master, não sendo despejados na Seção 2.

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
  -not -path "*/public/explicacoes/*" \
  -not -path "*/__pycache__/*" \
  -not -name "*.env*" \
  -not -name "$OUTPUT" \
  -not -name "*.csv*" \
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
  -not -path "*/backups/*" \
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

*Instrução para a IA:* Somente após o usuário rodar o comando e disponibilizar o conteúdo do `DINGLI_DUMPER.md`, inicie as análises e edições solicitadas.

---

## 5. Protocolo de Autoatualização e Governança do Dumper (Encerramento de Sessão)
**Ação Obrigatória:** Antes de dar como finalizado qualquer atendimento que altere a arquitetura, estrutura ou escopo da plataforma, a IA deve cumprir o seguinte checklist de governança:

1. **Auditoria de Escopo e Arquitetura:** Avaliar se as alterações realizadas modificaram integrações externas (Supabase, Cloudflare R2, Edge-TTS, Web Speech API, etc.), dependências estruturais ou fluxos de trabalho descritos na Seção 3 deste documento.
2. **Governança do Comando do Dumper (Seção 4):** Caso novos arquivos secundários, dados estáticos brutos, scripts pontuais de automação ou arquivos de documentação sejam criados no projeto, a IA DEVE atualizar as regras `-not -path` ou `-not -name` na Seção 4 para preservar o teto operacional de segurança de 8.000 linhas da Seção 2, mantendo nela estritamente o código-fonte vivo da aplicação (`src/` e arquivos vitais de configuração).
3. **Entrega de Atualização:** Caso identifique divergências, fornecer explicitamente ao usuário a versão revisada e atualizada do `DINGLI_MASTER.md` utilizando encapsulamento com 4 crases para evitar quebra de formatação.
4. **Instrução de Novo Snapshot:** Instruir o usuário a gerar uma nova versão do `DINGLI_DUMPER.md` caso arquivos tenham sido criados, movidos ou excluídos.