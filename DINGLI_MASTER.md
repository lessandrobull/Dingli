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
  - `curso_revisoes`: controle de versionamento independente por idioma (`versao`, `ids_alterados`, `descricao`), permitindo invalidação seletiva de cache e reset cirúrgico apenas das frases atualizadas.
  - `user_progress`: persistência de progresso e maestria em nuvem (`user_id`, `idioma`, `maestria`) com regras de degradação por inatividade.
  - `reports_frases`: telemetria de reportes manuais dos alunos (`TelaEstudo.jsx` e `Dinglab.jsx`), quarentenas automáticas do Dìnglab (3 erros vocais), superações na Prova de Fogo e reportes manuais de auditoria de áudio (`public/auditor.html`), gerenciáveis (marcar resolvido, inspecionar no card e excluir) pelo painel administrativo (`Adm.jsx`).

### B. Cloudflare R2 (Storage Remoto de Áudios), Cache Offline Híbrido e Auditor de Áudios
- Bucket público no **Cloudflare R2** (`https://pub-b24d092a7bf34fd9bf22befba89de35f.r2.dev`) contendo:
  - Arquivos de frases completas (`/{lang}/{id}_{voz}.mp3`), com 6 vozes (`v1` a `v6`) para Inglês e Espanhol e 4 vozes (`v1` a `v4`) para Francês, Italiano, Alemão, Português e Mandarim (`zh`).
  - Arquivos de vocabulário de palavras isoladas (`/palavras/{lang}/{slug}.mp3`) sanitizados com mapeamento de diacríticos.
- Controle de versionamento local (`VERSOES_AUDIOS`) para *cache busting* silencioso (`?v=2`) em regravações pontuais.
- Persistência offline em duas camadas: **Cache Storage API** (`dingli-audios-v1`) como camada primária e **IndexedDB** (`dingli_offline_db` v3 com as *stores* `topics_cache`, `sentences_cache` e `audios_cache`) como *fallback* para dados e blobs de áudio.
- **Auditor de Áudios (`public/auditor.html`):** ferramenta web independente acessada pelo botão `Auditor de Áudios` no menu de `Adm.jsx` (`window.location.href = '/auditor.html'`). Carrega as 1.200 frases da tabela `sentences` em dois lotes paralelos via REST (`limit=1000&offset=0` e `limit=1000&offset=1000`), reproduz os arquivos `.mp3` diretamente do Cloudflare R2 com *cache busting* (`?v=${Date.now()}`), opera com filtros de idioma, nível, velocidade (`1.0x` a `0.65x`) e busca por ID, seletor de vozes (`v1` a `v6`), playlist automática (pausa de `1.0s`), atalhos de teclado (`Espaço`, `←`/`→`, `1` a `6`, `F`) e envio de reportes com campo descritivo (`inputProblema`) para a tabela `reports_frases`, utilizando paleta clara (`#e4eafa`) e barra de rolagem oculta.

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

1. **Auditoria de Escopo e Arquitetura:** Avaliar se as alterações realizadas modificaram integrações externas (Supabase, Cloudflare R2, Edge-TTS, Web Speech API, etc.), dependências estruturais ou fluxos de trabalho descritos na Seção 1 e Seção 3 deste documento.
2. **Governança do Comando do Dumper (Seção 4):** Caso novos arquivos secundários, dados estáticos brutos, scripts pontuais de automação ou arquivos de documentação sejam criados no projeto, a IA DEVE atualizar as regras `-not -path` ou `-not -name` na Seção 4 para preservar o teto operacional de segurança de 8.000 linhas da Seção 2, mantendo nela estritamente o código-fonte vivo da aplicação (`src/` e arquivos vitais de configuração).
3. **Entrega de Atualização:** Caso identifique divergências, fornecer explicitamente ao usuário a versão revisada e atualizada do `DINGLI_MASTER.md` utilizando encapsulamento com 4 crases para evitar quebra de formatação.
4. **Instrução de Novo Snapshot:** Instruir o usuário a gerar uma nova versão do `DINGLI_DUMPER.md` caso arquivos tenham sido criados, movidos ou excluídos.