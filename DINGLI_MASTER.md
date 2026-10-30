# DINGLI_MASTER.md
**Documentação Conceitual e Operacional para IAs - Dingli**

---

## 1. Visão Geral da Plataforma
O **DINGLI** é um Progressive Web App (PWA) de aprendizado acelerado de idiomas e treino ativo de pronúncia baseado no ecossistema de estudo contínuo "Dìngloop" e no algoritmo proprietário de repetição espaçada (SRS) "Dominium".
- **Proposta Central:** Input compreensível e treino prático de fala em tempo real com correção fonética imediata, operando através de uma esteira determinística com fila FIFO de exatamente até 5 cartas em jogo (`LIMITE_BANDEJA = 5`), sem contadores artificiais de tempo nos microciclos, com arquitetura offline-first e interface móvel responsiva.
- **Entrada de Dados:** Reconhecimento de voz em tempo real via Web Speech API para exercícios orais, além de digitação e seleção por toque para exercícios de escrita, baseados em uma grade fixa de exatamente 1.200 frases sequenciais distribuídas em 4 níveis do CEFR (A1 a B2), 40 tópicos e 7 idiomas (8 frentes, incluindo Mandarim Hanzi e Pinyin com tons).
- **Processamento:** O sistema valida o acerto fonético e sintático, gerencia avanço e recuo de ranks (R1 a R27), encaminha frases para quarentena no laboratório fonético **Dìnglab** (automaticamente após 3 falhas vocais consecutivas ou manualmente via **Modo Pitstop** durante qualquer exercício) blindando o rank conquistado, oferece treino livre no **Modo Espelho** (com gravação da própria voz e metrônomo de repetição por palavra) e reintegração via **Prova de Fogo**, agenda revisões de macrociclo com descansos exponenciais de 1 a 32 dias no algoritmo Dominium, aplica atualizações cirúrgicas de versão de conteúdo (`CardAvisoAtualizacao`) e sincroniza dados entre memória RAM, cache do navegador (Cache Storage, IndexedDB e localStorage) e nuvem (Supabase e Cloudflare R2).
- **Arquitetura do Card de Escrita (`ExercicioEscrita` em `TelaEstudo.jsx`):**
  - **Geometria Fixa Pré-alocada e Multilinha:** A lacuna opera estritamente via elemento `<div contentEditable>` posicionado na mesma célula de grade (`gridArea: '1/1'`) que o `placeholderInvisivel` (`whiteSpace: 'pre-wrap'`). A caixa já nasce com a dimensão e a quantidade exata de linhas da resposta esperada, quebrando linhas automaticamente durante a digitação sem alterar seu tamanho e sem rolagem horizontal (proibido o uso de `<input type="text">`).
  - **Pontuação Final Soldada:** A pontuação imediata pós-lacuna (`configLacuna.pontuacao`: `.`, `!`, `?`, etc.) é renderizada dentro de um `<span>` com `display: 'inline-flex'` e `whiteSpace: 'nowrap'` junto ao `wrapperInputRelativo`, impedindo que o ponto quebre sozinho para a linha inferior.
  - **Camada de Correção (Verde/Vermelho):** O feedback compartilha a célula `gridArea: '1/1'` com `whiteSpace: 'pre-wrap'` e renderiza cada palavra com `whiteSpace: 'pre'`, preservando os espaços originais entre palavras nas mesmas quebras de linha da lacuna.
  - **Regra de Maiúsculas e Minúsculas (`ehInicioOracao`):** Avalia se o prefixo está vazio ou termina em `.`, `!` ou `?`. No 1º caractere digitado, força maiúscula em início de oração e força minúscula em lacunas de meio de oração, reposicionando o cursor ao final via `Selection/Range`.

### Mecânica Operacional do Dominium (Task, Bandeja e Esteira)
- **Definição de Task (Bandeja):** Uma Task é um ciclo ativo de estudos operado por uma bandeja com capacidade fixa de até 5 frases simultâneas (`LIMITE_BANDEJA = 5`). As frases em jogo rodam em rotação contínua até que atinjam seus respectivos portos seguros de descanso macro (R5 $\rightarrow$ R6 repousa 1 dia; R9 $\rightarrow$ R10 repousa 2 dias; R14 $\rightarrow$ R15 repousa 4 dias; R18 $\rightarrow$ R19 repousa 8 dias; R23 $\rightarrow$ R24 repousa 16 dias; R27 $\rightarrow$ R24 repousa 32 dias). Apenas no esgotamento de cartas inéditas do nível sem cartas prontas na lista **Próximas**, a bandeja fecha com menos de 5 cartas.
- **Fila Unificada de Prioridades de Entrega:** O motor avaliador (`avaliarProximoAlvo`) adota estritamente a seguinte cascata:
  1. **1ª da Bandeja:** Se houver frases ativas na bandeja (`taskIdsRef`), entrega o elemento frontal da fila FIFO.
  2. **1ª de Próximas:** Se a bandeja tiver vagas ($< 5$) e não estiver fechada, busca e promove a frase mais antiga pronta da gaveta **Próximas** (`next_review <= Date.now()`).
  3. **Inédita de Menor ID:** Se a bandeja tiver vagas ($< 5$), não estiver fechada e a lista Próximas estiver vazia, sugere a frase inédita (Rank 0) de menor ID global do nível.
- **Navegação Livre em Cards Rank 0:** Cartas inéditas sugeridas abrem obrigatoriamente na tela de apresentação (R0) com botão "Praticar" ativo e com `fraseAtivaGlobal` nula, garantindo que os botões "Anterior" e "Próximo" naveguem com total liberdade por todas as cartas do tópico. O aluno pode aceitar a sugestão, folhear o tópico, sair para o Deck e escolher outro tópico ou interromper o estudo.
- **Dois Caminhos de Acesso:**
  - **Caminho A (Botão GAME):** O aluno inicia a esteira automática, recebendo a 1ª da bandeja, ou a 1ª de Próximas, ou a sugestão da inédita de menor ID na Prioridade 3.
  - **Caminho B (Card Inédito Manual no Deck):** O aluno acessa o Deck, escolhe um tópico e clica diretamente em "Praticar" em um card Rank 0, atuando manualmente na Prioridade 3 da esteira e executando imediatamente o Rank 1.
- **Alocação Pós-Exercício da Inédita:**
  - **Se a bandeja tiver menos de 5 cartas:** A carta recém-praticada entra **após a última da bandeja**. Ao atingir 5 cartas, a bandeja ativa a trava de fechamento (`bandeja_fechada_${idiomaOrigem}_${idiomaEstudo}`), cessando a admissão de novas inéditas.
  - **Se a bandeja já estiver completa com 5 cartas (abandono prévio):** A carta recém-praticada **não entra na bandeja** e é carimbada com timestamp recente, posicionando-se após a última da fila **Próximas**.
  - Em ambos os casos, a esteira entrega em seguida a **1ª carta da Bandeja**, operando em FIFO pura.
- **Formatura e Conclusão:** Ao atingir o descanso macro (`foiConcluido = true`), a frase é expurgada da bandeja e enviada à sua respectiva gaveta de repouso no Dominium. Ao zerar todos os IDs pendentes da bandeja, a Task é dada como concluída, limpando as chaves de persistência local e retornando o aluno ao menu.

---

## 2. Ambiente de Desenvolvimento e Regras de Conduta para IAs
- **Ambiente Operacional:** Windows.
- **Terminal Padrão:** Git Bash integrado ao VSCode. Todos os comandos de terminal sugeridos devem ser estritamente compatíveis com a sintaxe do Git Bash / Bash no ambiente Windows.
- **Comunicação:** Respostas sempre curtas, diretas e estritamente em Português do Brasil (`pt-BR`), sem textos longos ou introduções desnecessárias.
- **Proibido Inferir, Supor ou Chutar:** É terminantemente proibido adivinhar código, nomes de variáveis, estrutura de arquivos ou números (como contagem de linhas). A IA deve sempre verificar o arquivo real no `DINGLI_DUMPER.md` (ou solicitar o arquivo atual ao usuário caso não esteja visível) antes de afirmar qualquer coisa ou propor alterações.
- **Fluxo de Trabalho em Suaves Etapas (Proibido Despejar Código):** Ao receber uma demanda, a IA deve primeiro confirmar o que entendeu e apresentar um planejamento dividido em etapas suaves (uma etapa por vez), sem enviar blocos de código sem autorização prévia e sem tomar decisões pelo projeto.
- **Padrão Obrigatório de Alteração ("Como está" x "Como tem que ser"):** Toda alteração de código ou documentação — somente após autorizada pelo usuário — deve ser apresentada mostrando estritamente o trecho exato atual (**Como está**) e o trecho novo (**Como tem que ser**) para localização e edição manual.

---

## 3. Infraestrutura e Serviços Externos (Invisíveis no Código Local)
Esta seção documenta as dependências que residem fora do repositório local e os motores híbridos que o código-fonte consome:

### A. Supabase (PostgreSQL, Auth Anônima & Auth Admin)
- Autenticação em dois níveis:
  - **Alunos (`App.jsx` / `dataService.js`):** autenticação anônima silenciosa (`signInAnonymously`) com fallback transparente para operação 100% local.
  - **Administrador (`Perfil.jsx`):** autenticação via e-mail e senha (`supabase.auth.signInWithPassword`) em modal acionado por 4 toques consecutivos (janela de `1500ms`) na frase inspiracional (ou pelo botão `Adm` em ambiente `DEV`), definindo `userRole = 'adm'`, abrindo a tela `adm` e autenticando a sessão para exclusão de registros em `reports_frases` sob política RLS restrita ao papel `authenticated`.
- Banco de dados relacional com as tabelas:
  - `sentences`: base curricular das 1.200 frases em todos os idiomas, tópicos por idioma de origem (`topic_{lang}`) e frases inspiracionais.
  - `curso_revisoes`: controle de versionamento independente por idioma (`versao`, `ids_alterados`, `descricao`, `tipo`), permitindo invalidação seletiva de cache e reset cirúrgico apenas das frases atualizadas (`tipo = 'texto'`) ou preservação integral de progresso e ranks (`tipo = 'audio'`).
  - `user_progress`: persistência de progresso e maestria em nuvem (`user_id`, `idioma`, `maestria`) com regras de degradação por inatividade.
  - `reports_frases`: telemetria de reportes manuais dos alunos (`TelaEstudo.jsx` e `Dinglab.jsx`), quarentenas automáticas do Dìnglab (3 erros vocais), superações na Prova de Fogo e reportes manuais de auditoria de áudio (`public/auditor.html`), gerenciáveis (marcar resolvido, inspecionar no card e excluir) pelo painel administrativo (`Adm.jsx`).

### B. Cloudflare R2 (Storage Remoto de Áudios), Cache Offline Híbrido e Auditor de Áudios
- Bucket público no **Cloudflare R2** (`https://pub-b24d092a7bf34fd9bf22befba89de35f.r2.dev`) contendo:
  - Arquivos de frases completas (`/{lang}/{id}_{voz}.mp3`), com 6 vozes (`v1` a `v6`) para Inglês, Espanhol e Francês e 4 vozes (`v1` a `v4`) para Italiano, Alemão, Português e Mandarim (`zh`).
  - Arquivos de vocabulário de palavras isoladas (`/palavras/{lang}/{slug}.mp3`) sanitizados com mapeamento de diacríticos.
- Controle de versionamento local (`VERSOES_AUDIOS`) para *cache busting* silencioso (`?v=2`) em regravações pontuais.
- Persistência offline em duas camadas: **Cache Storage API** (`dingli-audios-v1`) como camada primária e **IndexedDB** (`dingli_offline_db` v3 com as *stores* `topics_cache`, `sentences_cache` e `audios_cache`) como *fallback* para dados e blobs de áudio.
- **Auditor de Áudios (`public/auditor.html`):** ferramenta web independente acessada pelo botão `Auditor de Áudios` no menu de `Adm.jsx` (`window.location.href = '/auditor.html'`). Carrega as 1.200 frases da tabela `sentences` em dois lotes paralelos via REST (`limit=1000&offset=0` e `limit=1000&offset=1000`), reproduz os arquivos `.mp3` diretamente do Cloudflare R2 com *cache busting* (`?v=${Date.now()}`), opera com filtros de idioma, nível, velocidade (`1.0x` a `0.65x`) e busca por ID, seletor de vozes (`v1` a `v6`), playlist automática (pausa de `1.0s`), atalhos de teclado (`Espaço`, `←`/`→`, `1` a `6`, `F`) e envio de reportes com campo descritivo (`inputProblema`) para a tabela `reports_frases`, utilizando paleta clara (`#e4eafa`) e barra de rolagem oculta.

### C. Síntese Neural de Voz (Edge-TTS), Pipeline FFmpeg e Motor de Reprodução
- Síntese automatizada de frases e termos isolados via Microsoft Edge-TTS cobrindo as vozes oficiais dos 7 idiomas, orquestrada exclusivamente pelo script unificado `scripts/dingli.py` com envio direto ao Cloudflare R2.
- Tratamento de áudio anti-corte (prevenção de DAC sleep) nos arquivos de vocabulário com pré-delay de 300ms (`adelay=300|300`) e pós-padding de 100ms (`apad=pad_dur=0.1`) a 128 kbps via FFmpeg para evitar corte de pronúncia em fones Bluetooth por economia de energia.
- Sorteio sem repetição da fila de vozes em tempo de execução (`useSpeech.js`), troca forçada para uma voz diferente da anterior na reprodução lenta pós-erro e velocidades calibradas por idioma (`VELOCIDADES_AUDIO`).

### D. Web Speech API, MediaRecorder e Explicações Estáticas Locais
- **Web Speech API:** Reconhecimento de voz contínuo executado nativamente no navegador (`continuous = true`, `interimResults = true`) com limiar adaptativo (`>= 75%` geral e `>= 50%` para frases de até 2 palavras), confirmação rápida de acerto em `750ms` e tolerância de silêncio (VAD) de `1,3s`, além de normalização fonética e conversão de numerais por extenso (`NUMEROS_EXTENSO` e `normalizarMandarimNumeros`).
- **MediaRecorder API:** Gravação local em tempo real da voz do aluno (`audio/webm`) no Modo Espelho do Dìnglab para reprodução comparativa imediata ("Ouvir gravação").
- **Base Estática de Explicações (`/public/explicacoes/`):** Explicações gramaticais e *breakdowns* de vocabulário pré-gerados offline em arquivos JSON estáticos (`/public/explicacoes/{estudo}_{origem}/{nivel}_{topico}.json`) via scripts utilitários (`scripts/extrair.mjs` e `scripts/gerarExplicacoes.mjs`), com cache em memória (`cacheExplicacoesTopico`), eliminando latência e custos de API de IA durante o estudo.

---

## 4. Protocolo de Inicialização para IAs (Geração dos Dumpers)
**Ação Obrigatória:** Ao iniciar uma nova conversa técnica, a IA deve orientar o usuário a executar o comando unificado abaixo no Git Bash. Este script varre a estrutura do projeto e gera simultaneamente dois snapshots complementares:
1. `DINGLI_DUMPER.md`: Contém a árvore geral e o código integral da aplicação frontend/PWA (`src/` e configurações vitais de build).
2. `DINGLI_DUMPER_SCRIPTS.md`: Contém as ferramentas internas (`public/auditor.html`), o livro-razão de revisões (`backups/historico_revisoes.md`) e os scripts de automação (`scripts/dingli.py`, `scripts/extrair.mjs`, `scripts/gerarExplicacoes.mjs`).

> **Parâmetro de Estabilidade Técnica:** A Seção 2 do Dumper foi calibrada para manter o volume total abaixo de 8.000 linhas (~250 KB), garantindo entrega integral sem cortes em nenhum modelo de IA. Arquivos utilitários de build local, binários, mídias, backups, bases estáticas de explicações e scripts Python de automação permanecem documentados neste Master, não sendo despejados na Seção 2.

```bash
# ------------------------------------------------------------------------------
# 1. DUMPER PRINCIPAL: APLICAÇÃO & FRONTEND (DINGLI_DUMPER.md)
# ------------------------------------------------------------------------------
OUTPUT_CORE="DINGLI_DUMPER.md"
OUTPUT_SCRIPTS="DINGLI_DUMPER_SCRIPTS.md"

echo "Gerando Snapshot da Aplicação ($OUTPUT_CORE)..."
echo "# 🖨️ DINGLI_DUMPER.md" > "$OUTPUT_CORE"
echo "Snapshot técnico gerado com estrutura de arquivos e código-fonte da aplicação." >> "$OUTPUT_CORE"

echo -e "\n## 1. ÁRVORE DE DIRETÓRIOS" >> "$OUTPUT_CORE"
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
  -not -name "$OUTPUT_CORE" \
  -not -name "$OUTPUT_SCRIPTS" \
  -not -name "*.csv*" \
  -not -name "*.mp3" \
  -not -name "*.wav" \
  -not -name "*.png" \
  -not -name "*.jpg" \
  -not -name "*.svg" \
  -not -name "*.ico" \
  -not -name "*.webp" \
  -not -name "*.pyc" | sort >> "$OUTPUT_CORE"

echo -e "\n## 2. CÓDIGO FONTE INTEGRAL" >> "$OUTPUT_CORE"
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
  -not -name "$OUTPUT_CORE" \
  -not -name "$OUTPUT_SCRIPTS" \
  -not -name "auditor.html" \
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
  -not -name "DINGLI_MASTER.md" \
  -not -name "historico_revisoes.md" \
  -not -name "README.md" | sort | while read -r file; do
  echo -e "\n\n### 📄 ARQUIVO: $file" >> "$OUTPUT_CORE"
  sed -e 's/GEMINI_API_KEY: "[^"]*"/GEMINI_API_KEY: "SUA_CHAVE_GEMINI_AQUI"/' \
      -e 's/SUPABASE_SECRET_KEY: "[^"]*"/SUPABASE_SECRET_KEY: "SUA_CHAVE_SUPABASE_SECRET_AQUI"/' \
      "$file" >> "$OUTPUT_CORE"
done

# ------------------------------------------------------------------------------
# 2. DUMPER DE SCRIPTS, FERRAMENTAS & AUDITORIA (DINGLI_DUMPER_SCRIPTS.md)
# ------------------------------------------------------------------------------
echo "Gerando Snapshot de Scripts e Ferramentas ($OUTPUT_SCRIPTS)..."
echo "# 🛠️ DINGLI_DUMPER_SCRIPTS.md" > "$OUTPUT_SCRIPTS"
echo "Snapshot técnico de scripts de automação, ferramentas de auditoria e governança de dados do Dìnglì." >> "$OUTPUT_SCRIPTS"

echo -e "\n## 1. CÓDIGO FONTE DE SCRIPTS E FERRAMENTAS" >> "$OUTPUT_SCRIPTS"
find ./scripts ./public/auditor.html ./backups/historico_revisoes.md -type f 2>/dev/null \
  -not -name "*.pyc" \
  -not -name "__pycache__" | sort | while read -r file; do
  if [ -f "$file" ]; then
    echo -e "\n\n### 📄 ARQUIVO: $file" >> "$OUTPUT_SCRIPTS"
    sed -e 's/GEMINI_API_KEY: "[^"]*"/GEMINI_API_KEY: "SUA_CHAVE_GEMINI_AQUI"/' \
        -e 's/API_KEY = "[^"]*"/API_KEY = "SUA_CHAVE_GEMINI_AQUI"/' \
        -e 's/SUPABASE_SECRET_KEY: "[^"]*"/SUPABASE_SECRET_KEY: "SUA_CHAVE_SUPABASE_SECRET_AQUI"/' \
        "$file" >> "$OUTPUT_SCRIPTS"
  fi
done

echo "✔ Concluído com sucesso! Gerados: $OUTPUT_CORE e $OUTPUT_SCRIPTS."
```

*Instrução para a IA:* Somente após o usuário rodar o comando e disponibilizar o conteúdo do `DINGLI_DUMPER.md` (e `DINGLI_DUMPER_SCRIPTS.md`, caso a demanda envolva banco, áudios ou automações), inicie as análises e edições solicitadas.

---

## 5. Protocolo de Autoatualização e Governança do Dumper (Encerramento de Sessão)
**Ação Obrigatória:** Antes de dar como finalizado qualquer atendimento que altere a arquitetura, estrutura ou escopo da plataforma, a IA deve cumprir o seguinte checklist de governança:

1. **Auditoria de Escopo e Arquitetura:** Avaliar se as alterações realizadas modificaram integrações externas (Supabase, Cloudflare R2, Edge-TTS, Web Speech API, etc.), dependências estruturais ou fluxos de trabalho descritos na Seção 1 e Seção 3 deste documento.
2. **Governança do Comando do Dumper (Seção 4):** Caso novos arquivos secundários, dados estáticos brutos, scripts pontuais de automação ou arquivos de documentação sejam criados no projeto, a IA DEVE atualizar as regras `-not -path` ou `-not -name` na Seção 4 para preservar o teto operacional de segurança de 8.000 linhas da Seção 2, mantendo nela estritamente o código-fonte vivo da aplicação (`src/` e arquivos vitais de configuração).
3. **Entrega de Atualização:** Caso identifique divergências, fornecer explicitamente ao usuário a versão revisada e atualizada do `DINGLI_MASTER.md` utilizando encapsulamento com 4 crases para evitar quebra de formatação.
4. **Instrução de Novo Snapshot:** Instruir o usuário a gerar uma nova versão dos dumpers (`DINGLI_DUMPER.md` e `DINGLI_DUMPER_SCRIPTS.md`) caso arquivos tenham sido criados, movidos ou excluídos.

---

## 6. Governança de Revisões, Atualizações e Script Unificado (`scripts/dingli.py`)

### 6.1 Tabela de Vozes Oficiais do Ecossistema Dìnglì

#### A. Frases Completas (Edge-TTS)
- **Inglês (`en`):**
  - `v1`: `en-US-SteffanNeural` (Masculina)
  - `v2`: `en-IE-ConnorNeural` (Masculina)
  - `v3`: `en-CA-LiamNeural` (Masculina)
  - `v4`: `en-US-JennyNeural` (Feminina)
  - `v5`: `en-GB-LibbyNeural` (Feminina)
  - `v6`: `en-CA-ClaraNeural` (Feminina)
- **Espanhol (`es`):**
  - `v1`: `es-AR-TomasNeural`
  - `v2`: `es-MX-JorgeNeural`
  - `v3`: `es-MX-DaliaNeural`
  - `v4`: `es-ES-AlvaroNeural`
  - `v5`: `es-ES-ElviraNeural`
  - `v6`: `es-US-AlonsoNeural`
- **Francês (`fr`):**
  - `v1`: `fr-FR-DeniseNeural`
  - `v2`: `fr-FR-HenriNeural`
  - `v3`: `fr-FR-VivienneMultilingualNeural`
  - `v4`: `fr-BE-GerardNeural`
  - `v5`: `fr-CH-ArianeNeural`
  - `v6`: `ko-KR-HyunsuMultilingualNeural`
- **Italiano (`it`):**
  - `v1`: `it-IT-GiuseppeMultilingualNeural`
  - `v2`: `it-IT-DiegoNeural`
  - `v3`: `it-IT-IsabellaNeural`
  - `v4`: `it-IT-ElsaNeural`
- **Português (`pt`):**
  - `v1`: `pt-BR-AntonioNeural`
  - `v2`: `pt-BR-ThalitaMultilingualNeural`
  - `v3`: `ko-KR-HyunsuMultilingualNeural`
  - `v4`: `en-US-AvaMultilingualNeural`
- **Alemão (`ge`):**
  - `v1`: `de-AT-JonasNeural`
  - `v2`: `de-DE-FlorianMultilingualNeural`
  - `v3`: `de-DE-SeraphinaMultilingualNeural`
  - `v4`: `de-DE-KatjaNeural`
- **Mandarim (`zh`):**
  - `v1`: `zh-CN-XiaoxiaoNeural`
  - `v2`: `zh-CN-YunxiNeural`
  - `v3`: `zh-CN-YunjianNeural`
  - `v4`: `zh-CN-XiaoyiNeural`

#### B. Palavras Isoladas / Vocabulário (Edge-TTS + FFmpeg)
- `en`: `en-CA-ClaraNeural`
- `es`: `es-MX-DaliaNeural`
- `fr`: `fr-FR-DeniseNeural`
- `ge`: `de-DE-KatjaNeural`
- `it`: `it-IT-IsabellaNeural`
- `pt`: `pt-BR-FranciscaNeural`
- `zh`: `zh-CN-XiaoxiaoNeural`

---

### 6.2 Regras da Tabela Comparativa de Revisão no Chat
Sempre que o usuário solicitar revisão ou melhoria didática de frases, a IA DEVE estruturar o atendimento seguindo rigorosamente estas diretrizes:
- **Tamanho do Bloco:** Lotes recomendados de exatamente 50 frases por chamada para manter controle fino e evitar saturação de contexto.
- **Colunas Obrigatórias:** A tabela gerada pela IA deve conter estritamente as colunas:
  `id | inglês | como está | como deve ser | explicação mais breve possível`
- **Formatação de Tela:** A tabela deve ocupar toda a largura útil da tela (de lado a lado), garantindo o máximo de espaço horizontal para que cada frase seja lida com clareza sem quebras desnecessárias de linha.

---

### 6.3 Fluxo F1: Revisão ou Alteração de Texto (Com Reset de Rank)
Aplicado quando a escrita da frase ou da tradução é modificada. Exige reaprendizado do aluno, regravação de áudios de frases, atualização do vocabulário léxico e commit estrutural no banco.

- **Passo 1 (Chat):** Usuário solicita a revisão informando o idioma e o bloco de frases (ex: 50 frases).
- **Passo 2 (Terminal - Backup):** A IA orienta o comando de backup. O usuário executa `python scripts/dingli.py backup` (que extrai as 1.200 frases paginadas da tabela `sentences` do Supabase para `backups/sentences_backup_TIMESTAMP.csv`) e cola a confirmação no chat.
- **Passo 3 (Chat - Tabela Comparativa):** A IA entrega a tabela de 50 frases no formato de largura máxima. O usuário avalia e aprova as frases que devem mudar.
- **Passo 4 (Terminal - Patch Local):** A IA entrega o comando para salvar o arquivo `patch.json` e aplicar as alterações aprovadas em `supabase_sentences.csv` via `python scripts/dingli.py patch patch.json`.
- **Passo 5 (Terminal - Frases no Cloudflare R2):** Usuário executa `python scripts/dingli.py frases-f1 <idioma>`. O script compara o CSV com o último backup, move os áudios locais antigos dessas frases para `audios_dingli/quarentena_frases/<idioma>/`, sintetiza os novos `.mp3` via Edge-TTS e faz upload com sobrescrita direta no bucket do Cloudflare R2.
- **Passo 6 (Terminal - Palavras Isoladas no Cloudflare R2):** Usuário executa `python scripts/dingli.py palavras-f1 <idioma>`. O script varre o CSV local, move palavras órfãs locais para quarentena, sintetiza palavras novas com Edge-TTS + FFmpeg (`adelay=300|300,apad=pad_dur=0.1`), faz upload para `palavras/<idioma>/` no Cloudflare R2 e deleta do bucket R2 os arquivos de palavras órfãs que não pertencem mais ao curso.
- **Passo 7 (Terminal - Commit no Banco e Carimbo de Versão):** Usuário executa `python scripts/dingli.py commit-f1 <idioma>`. O script atualiza as colunas de texto na tabela `sentences` do Supabase via PATCH e insere uma nova linha na tabela `curso_revisoes` com `tipo = 'texto'`, listando os IDs afetados.
- **Passo 8 (App do Aluno):** O app lê a versão com `tipo = 'texto'`. Ao abrir Deck ou Game, exibe o `CardAvisoAtualizacao` informando que o conteúdo foi aprimorado. Ao clicar em atualizar, o app expurga os áudios antigos do Cache Storage e IndexedDB, invalida tópicos em cache, reseta as frases afetadas para `rank: 0` (`inedita`), baixa os novos áudios do R2 com barra de progresso e libera o estudo.

---

### 6.4 Fluxo F2: Atualização Pura de Áudio e Novas Vozes (Sem Perda de Progresso)
Aplicado quando o texto permanece 100% idêntico e apenas as gravações de áudio/vozes foram alteradas ou adicionadas. O progresso do aluno é estritamente preservado.

- **Passo 1 (Chat):** Usuário define idioma, vozes envolvidas e faixa de IDs (ex: `en`, `1 1200`, `--vozes v1,v2,v3`).
- **Passo 2 (Terminal - Síntese e Upload R2):** Usuário executa `python scripts/dingli.py frases-f2 <idioma> <inicio> <fim> [--vozes <v1,v2...>]`. O script sintetiza os áudios via Edge-TTS e faz upload direto ao Cloudflare R2 sobrescrevendo os arquivos no bucket.
- **Passo 3 (Terminal - Carimbo de Versão de Áudio):** Usuário executa `python scripts/dingli.py commit-f2 <idioma> <inicio> <fim>`. O script insere uma linha em `curso_revisoes` no Supabase com `tipo = 'audio'`, nova versão e a lista dos IDs afetados (sem modificar a tabela `sentences`).
- **Passo 4 (App do Aluno):** O app detecta a versão com `tipo = 'audio'`. Exibe o `CardAvisoAtualizacao` informando que novas pronúncias foram aprimoradas e que o progresso e ranks do Dìngloop continuam exatamente iguais. Ao confirmar, o app limpa o cache antigo, preserva integralmente os ranks do aluno, baixa os novos MP3s com barra de porcentagem e libera a sessão imediatamente.

---

### 6.5 Governança do Script Único (`scripts/dingli.py`)
- **Centralização Estrita:** Toda e qualquer rotina de backup, patch, síntese de frases, geração de vocabulário, uploads para Cloudflare R2 e carimbos de versão no Supabase é executada exclusivamente por `scripts/dingli.py`.
- **Scripts Legados Extintos:** Fica expressamente proibida a criação ou execução dos scripts fragmentados antigos (`sincronizar_frases_completo.py`, `sincronizar_vocabulario.py`, `sincronizar_storage_vocabulario.py`, `sincronizar_vocabulario_completo.py`, `sincronizar_sentences_db.py`, `sincronizar_tudo.py`, `aplicar_revisao_e_backup.py`, etc.).
- **Saídas Orientadoras no Terminal:** Cada subcomando do `scripts/dingli.py` imprime um relatório visual do que foi realizado e exibe ao final a orientação exata do próximo comando que o usuário e a IA devem executar.