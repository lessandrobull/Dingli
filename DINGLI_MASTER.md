# DÌNGLÌ - CONTRATO MESTRE DE ARQUITETURA E SEGURANÇA
# ==============================================================================
# ESTE ARQUIVO É A FONTE ÚNICA DE VERDADE PARA DESENVOLVEDORES E AGENTES DE IA.
# LEITURA OBRIGATÓRIA NO INÍCIO DE QUALQUER SESSÃO ANTES DE EXECUTAR QUALQUER COMANDO.
# ==============================================================================

## 0. DIRETRIZ ZERO: CONTRATO DE PROTEÇÃO E PROIBIÇÃO DE INFERÊNCIA
1. PROIBIÇÃO ABSOLUTA DE INFERIR OU SUPOR:
   - É terminantemente proibido inferir, deduzir, adivinhar, estimar ou assumir qualquer regra, comportamento,
     existência de arquivo, contagem de dados ou status de idioma sem verificação factual prévia via terminal.
   - Toda e qualquer afirmação deve ser fundamentada em evidências auditadas diretamente no banco, no disco ou no Storage.
2. TRAVA DE SEGURANÇA (CIRCUIT BREAKER EM CÓDIGO):
   - Nenhum script tem permissão de executar movimentação em lote ou exclusão em massa automaticamente.
   - Qualquer script de saneamento/quarentena DEVE conter um disjuntor em código puro: se a quantidade de arquivos
     órfãos detectados for superior a 15 arquivos, a execução DEVE abortar imediatamente (`sys.exit`), exigindo
     inspeção prévia para evitar deleções acidentais.
   - EXCEÇÃO CONTROLADA DE REVISÃO EM LOTE: Em processos de revisão contínua formalmente aprovados pelo usuário,
     a trava de 15 arquivos pode ser destravada exclusivamente mediante parâmetro explícito de confirmação em linha de comando,
     após exibição integral do relatório em modo somente leitura (dry-run).
3. PROTOCOLO DE MODIFICAÇÃO DE DADOS:
   - Todo processo de limpeza deve primeiro gerar um relatório em modo somente leitura (dry-run).
   - Nenhum arquivo é deletado diretamente do disco local: deve ser movido previamente para pastas sob `quarentena_orfaos/`.
   - Toda alteração em lote no Supabase deve ser precedida de backup exportado da tabela completa e validado em disco.
   - Codificação de Arquivos CSV: Todo e qualquer arquivo CSV de sentenças deve ser gravado e manipulado estritamente
     com codificação UTF-8 com BOM (`utf-8-sig`), assegurando 100% de integridade fonética e compatibilidade direta
     com o Google Sheets sem corrupção de caracteres especiais.

---

### 0.1 AMBIENTE OPERACIONAL, TERMINAL E PROTOCOLO DE INTERAÇÃO
- **Terminal Oficial:** Git Bash no Windows (`MINGW64`), executado estritamente na raiz do repositório (`~/Documents/Apps/Dìnglì`).
- **Padrão de Scripts e Automação:** Todo comando de inspeção, refatoração ou automação via terminal DEVE ser entregue pronto para o Git Bash utilizando Python com heredoc Bash (`python - << 'EOF' ... EOF`), com codificação explícita `utf-8` ou `utf-8-sig`. É estritamente proibido o uso de comandos em PowerShell (`.ps1`) ou Prompt de Comando (`cmd.exe`).
- **Modelo de Interação:** O agente de IA não possui terminal autônomo conectado diretamente ao computador; toda ação no sistema depende de o desenvolvedor colar comandos fornecidos no Git Bash e retornar os logs para validação factual.

### 0.2 INFRAESTRUTURA, DEPLOY CONTÍNUO E CONTROLE DE VERSÃO
- **Branch Principal:** `master`.
- **Deploy Contínuo (CI/CD):** Todo commit enviado via `git push origin master` dispara automaticamente o build e deploy em produção (Vercel/Netlify).
- **Rigor de Versionamento:** Qualquer alteração no código deve ser precedida e sucedida por checagem de status (`git status -s`) e seguir a convenção de Conventional Commits (`feat:`, `fix:`, `perf:`, `docs:`, `chore:`).

### 0.3 HIERARQUIA DE DADOS E REGRA ANTI-STALE (AS 4 CAMADAS DO APP)
Para garantir consistência absoluta e impedir a renderização de dados desatualizados (*stale state*), toda funcionalidade ou refatoração deve respeitar a hierarquia de persistência:
1. **Camada 1 - Memória RAM (React Hooks / State):** `frasesFiltradas`, `fraseAtivaGlobal`, `sessaoDominium`. Devem ser higienizadas de imediato (`limparEstadoExercicio`, `setFrasesFiltradas([])`) antes de qualquer recarga de conteúdo.
2. **Camada 2 - Armazenamento Síncrono do Navegador:** 
   - `localStorage`: `versao_conteudo_${idiomaEstudo}`, `maestria_${cursoKey}`, `bandeja_${idiomaOrigem}_${idiomaEstudo}` (apenas cartas iniciadas da Task), `dinglab_${idiomaOrigem}_${idiomaEstudo}` (quarentena fonética) e `sessao_dominium_${cursoKey}`.
   - `sessionStorage`: `app_topico`, `app_tela`, `app_nivel`, `app_origem`, `app_estudo`.
3. **Camada 3 - Armazenamento Offline em Disco:** `IndexedDB` (Stores: `SENTENCES`, `TOPICS`, `AUDIOS`) e `CacheStorage` (`CACHE_NAME`). Atualizações de texto devem sincronizar diretamente o IndexedDB para evitar downloads redundantes.
4. **Camada 4 - Nuvem / Supabase:** Banco relacional PostgreSQL (`sentences`, `curso_revisoes`, `user_progress`, `reports_frases`) e Bucket de Storage (`audios/`).

### 0.4 PADRÕES DE ÁUDIO, VOZES E IDIOMAS
- **Bucket Supabase Storage Oficial:** `audios` (Público).
- **Storage Remoto de Frases:** `{SUPABASE_URL}/storage/v1/object/audios/{lang}/{id}_{voz}.mp3`.
- **Storage Remoto de Vocabulário:** `{SUPABASE_URL}/storage/v1/object/audios/palavras/{lang}/{slug}.mp3`.
- **Diretório Local de Frases:** `audios_dingli/{lang}/{id}_{voz}.mp3`.
- **Diretório Local de Vocabulário:** `audios_dingli/palavras/{lang}/{slug}.mp3`.
- **Livro-Razão de Auditoria Local:** `backups/historico_revisoes.md`.
- **Snapshots Locais da Base:** `backups/sentences_v{versao}_{idioma}_{timestamp}.csv`.
- **Mandarim (`zh`/`pi`):** Par inseparável Hanzi (`zh`) e Pinyin tonal (`pi`). Qualquer alteração em ideogramas exige sincronia imediata com o pinyin correspondente.

---

## 1. CONTEXTO GERAL E FUNDAÇÕES DA APLICAÇÃO
- Objetivo: Aplicativo progressivo para aprendizado acelerado de idiomas, baseado no ecossistema de estudo contínuo "Dìngloop" e no algoritmo proprietário de repetição espaçada (SRS) "Dominium".
- Pilares Didáticos: Input compreensível, treino ativo de pronúncia em tempo real, rotação determinística FIFO, arquitetura offline-first e interface móvel responsiva estrita.
- Stack Tecnológica:
  * Frontend: React 19 (`^19.2.0`), Vite 7 (`^7.3.1`).
  * Backend / Banco: Supabase (PostgreSQL - tabelas `sentences`, `curso_revisoes`, `user_progress`, `reports_frases`).
  * Armazenamento Remoto: Supabase Storage (Bucket público `audios`).
  * Cache Local: IndexedDB nativo (`DB_NAME = "dingli_offline_db"`, `DB_VERSION = 3`).
- Grade Curricular:
  * Exatamente 1.200 frases sequenciais (IDs 1 a 1200).
  * 4 Níveis do CEFR: A1, A2, B1, B2 (300 frases por nível).
  * 40 Tópicos Temáticos: 10 tópicos por nível, 30 frases por tópico.
  * 7 Idiomas / 8 Frentes: Inglês (`en`), Espanhol (`es`), Francês (`fr`), Italiano (`it`), Português (`pt`), Alemão (`ge`), Mandarim Hanzi (`zh`) e Mandarim Pinyin com tons (`pi`).
- Fonte Única de Verdade do Currículo: Ficheiro `supabase_sentences.csv` (com `utf-8-sig`), rigorosamente espelhado na tabela `sentences` do Supabase.

---

## 2. O MOTOR DÌNGLOOP (TASK HERMÉTICA & CARROSSEL FIFO PURO)
O Dìngloop é o ecossistema mestre de estudo ativo contínuo que unifica a Task (carrossel de até 5 cartas), o motor SRS Dominium e o subsistema Dìnglab.

### 2.1 Princípios Invariantes da Task
1. **Extinção Total de Timers de 30 Segundos:** Nos microciclos (Ranks 1 a 5), não existe contagem regressiva cronológica (`espera: 0`). A frase respondida fica imediatamente disponível para a esteira e o espaçamento pedagógico é determinado mecanicamente pela rotação das outras cartas da bandeja.
2. **Capacidade Hermética (Teto de 5 Cartas):** A sessão ativa admite no máximo 5 cartas distintas (`LIMITE_BANDEJA = 5`). Nenhuma 6ª carta é admitida durante a Task.
3. **Bloqueio Absoluto do Dìnglab:** Nenhuma frase que esteja retida no Dìnglab pode entrar na bandeja.
4. **Fechamento e Encerramento Determinístico:** Quando a contagem de cartas pendentes na bandeja chega a zero (todas graduaram para descanso de macrociclo ou foram enviadas ao Dìnglab), a Task declara `tipo: 'concluido'`, a chave `bandeja_${idiomaOrigem}_${idiomaEstudo}` é removida do `localStorage` e o aluno retorna imediatamente ao menu do Dìngloop (`menuCartoes`), sem admissão de novas cartas.

### 2.2 Os Dois Cenários Determinísticos de Inicialização
1. **Cenário 1 — Início via Botão GAME (Modo Global):**
   * A formação das 5 vagas ocorre no momento do clique respeitando a ordem estrita:
     - **1ª Prioridade:** Cartas remanescentes da Bandeja abandonada anterior (se houver).
     - **2ª Prioridade:** Cartas da lista **Próximas** (revisões de macrociclo vencidas + recém-saídas do Dìnglab com `next_review <= agora`).
     - **3ª Prioridade:** Cartas inéditas (Rank 0) de menor ID global do nível atual.
   * **Exceção de Fim de Nível:** Se a soma de todas as cartas disponíveis for menor que 5, a Task fecha hermeticamente com as cartas existentes (ex: 2 ou 3).
2. **Cenário 2 — Início via Card Avulso (Modo Tópico / Deck):**
   * **Vaga 1:** A carta clicada assume a mesa, abrindo em formato de apresentação (R0) com botões "Explicação", "Ouvir" e "Praticar" e cabeçalho exibindo tópico e posição real (`indice + 1 / total`).
   * **Expansão das Vagas 2 a 5:** Ocorre após a resposta do primeiro exercício dessa 1ª carta (seja acerto ou erro):
     - **1ª Prioridade:** Cartas remanescentes da Bandeja abandonada anterior.
     - **2ª Prioridade:** Cartas da lista **Próximas**.
     - **3ª Prioridade:** Cartas inéditas de menor ID do mesmo tópico da Vaga 1.
     - **4ª Prioridade (Transbordamento):** Cartas inéditas de menor ID global do nível (se o tópico esgotar).
   * **Rotação da Carta 1:** Tendo acabado de ser respondida, a Carta 1 é reposicionada obrigatoriamente no **final da fila expandida** (`[carta2, carta3, carta4, carta5, carta1]`), garantindo que o carrossel chame a Carta 2 em seguida e só retorne à Carta 1 após o giro completo.

### 2.3 Matriz de Regras de Exercício, Ranks e Fila FIFO
| Tipo de Exercício | Ação do Aluno | Efeito no Rank | Destino no Carrossel FIFO |
| :--- | :--- | :---: | :--- |
| **Escrita ou Seleção** | Acerto | $+1$ rank | Fim da fila da bandeja (`rotacionarBandeja(id, false)`) |
| **Escrita ou Seleção** | Erro | $-1$ rank | Permanece no mesmo card para correção imediata. A rotação e avanço ocorrem exclusivamente após o acerto. |
| **Voz (`RANKS_VOICE`)** | Acerto na 1ª tentativa | $+1$ rank | Fim da fila da bandeja (`rotacionarBandeja(id, false)`) |
| **Voz (`RANKS_VOICE`)** | Acerto na 2ª ou 3ª tentativa | $-1$ rank | Fim da fila da bandeja (`rotacionarBandeja(id, false)`) |
| **Voz (`RANKS_VOICE`)** | 3 falhas consecutivas | $0$ (Rank blindado) | Ejeção imediata ao Dìnglab (`rotacionarBandeja(id, true)`) — sai da mesa |
| **Qualquer Exercício** | Acerto em Rank de Macrociclo (R5, R9, R14, R18, R23, R27) | Avança para R6, R10, R15, R19, R24 | Conquista repouso em dias e **sai da mesa** (`rotacionarBandeja(id, true)`) |

*Nota sobre R27:* Ao acertar o Rank 27, a frase inicia o loop perpétuo de manutenção no Rank 24 com descanso de 32 dias.

### 2.4 Persistência Seletiva no Abandono da Task
Se o aluno interromper a Task antes do fim (clicando em "← Sair" ou fechando a aplicação):
* A chave `bandeja_${idiomaOrigem}_${idiomaEstudo}` grava **estritamente as frases que foram efetivamente colocadas em jogo (`rank > 0`) e que ainda não concluíram**.
* Frases reservadas na memória que ainda não foram apresentadas na tela continuam como cartas inéditas livres no banco.
* O relatório exibe `BANDEJA (X)` com a contagem real exata, sem vagas vazias, sem R0 fantasma e sem erros de "Frase não encontrada".

---

## 2.1 O SUBSISTEMA DÌNGLAB (QUARENTENA FONÉTICA & PROVA DE FOGO)
O Dìnglab é o laboratório fonético de isolamento do Dìngloop, ativado para proteger a retenção do aluno contra travas fonéticas.

### A. Gatilho de Ejeção e Blindagem de Rank
* Ao registrar a 3ª falha consecutiva na mesma frase em exercícios de fala (`RANKS_VOICE`), o microfone cessa e é exibido o card pedagógico de encaminhamento.
* O acionamento de `handleRevisarMaisTarde` executa:
  1. Ejeção limpa da bandeja ativa (`rotacionarBandeja(fraseId, true)`), sem admitir carta substituta.
  2. Preservação estrita do rank praticado (`exercicioNivel`) tanto em `frasesMaestria` quanto no objeto gravado sob `dinglab_${idiomaOrigem}_${idiomaEstudo}`.
  3. Telemetria silenciosa gravada em `reports_frases` (`tipo_problema: "Dìnglab (3 erros de pronúncia)"`, `resolvido: false`).

### B. Modo Espelho e Metrônomo Silábico
* Treino livre com metrônomo palavra por palavra acionando arquivos `.mp3` individuais de vocabulário via `tocarAudioPalavraMetronomo`.
* Sincronização visual em tempo real: a palavra acende no momento exato do som, acompanhada por gravação espelho para autocrítica auditiva sem julgamento de nota.

### C. Prova de Fogo (Botão "Pronto")
* **Em Caso de Reprovação Vocal:** Mensagem de incentivo em vermelho fixa na tela, sem timer de desaparecimento e com **zero punição de rank**. A frase permanece retida no Dìnglab para novo treino.
* **Em Caso de Aprovação Vocal:**
  1. Feedback visual imediato: palavras e borda do card tornam-se verdes (`COR_ACERTO`).
  2. Reprodução do áudio integral da frase em velocidade normal via `falar(alvo, false)`.
  3. Remoção da frase do `localStorage` do Dìnglab (`chaveDinglab`).
  4. Preservação do rank original da frase (sem rebaixamento e sem salto indevido).
  5. Marcação de `next_review = Date.now()`, fazendo a frase entrar imediatamente na lista **Próximas** do relatório Dominium para ser admitida no próximo ciclo natural da Task.
  6. Telemetria de resolução enviada a `reports_frases` (`resolvido: true`).
  7. Avanço automático condicionado ao término do áudio (`onended`). Caso esgote a lista, exibe a tela "Dìnglab em dia!".

---

## 2.2 O RELATÓRIO DOMINIUM (HIERARQUIA OFICIAL DAS LISTAS)
O componente `DominiumStats` (`src/useDominiumData.js`) organiza as cartas nas seguintes seções:
1. **1. DÌNGLAB (X) (Topo Absoluto):** Frases retidas no laboratório com seus ranks originais preservados. São mutuamente exclusivas e não aparecem em nenhuma outra seção.
2. **2. BANDEJA (X) (Condicional de Abandono):** Só é renderizada se houver frases de uma Task abandonada pelo aluno. Exibe apenas cartas efetivamente iniciadas e pendentes. Fica oculta em sessões finalizadas com sucesso.
3. **3. PRÓXIMAS (X):** Frases com descanso macro de dias cumprido (`next_review <= agora`) e frases recém-saídas da Prova de Fogo do Dìnglab. Exclui rigorosamente quem está na Bandeja ou no Dìnglab.
4. **4. PROGRESSO DE DIAS:** Frases em repouso macro do SRS divididas em blocos:
   - Progresso 1 dia (após R5)
   - Progresso 2 dias (após R9)
   - Progresso 4 dias (após R14)
   - Progresso 8 dias (após R18)
   - Progresso 16 dias (após R23)
   - Manutenção 32 dias (após R27 / loop no R24)
* **Proibição:** É terminantemente proibida a exibição ou cômputo de listas de 30 segundos.

---

## 2.3 ESCALA DE RANKS E DESCANSOS EXPONENCIAIS (DOMINIUM SRS)
* **Microciclos (Ranks 1 a 5):** Estudo rotativo puro no carrossel da Task sem bloqueio cronológico.
* **Macrociclos (Portos Seguros Exponenciais):**
  - Ranks 1 a 5 -> ao acertar Rank 5 atinge **Rank 6:** 1 dia de descanso ($86.400.000	ext{ ms}$).
  - Ranks 6 a 9 -> ao acertar Rank 9 atinge **Rank 10:** 2 dias de descanso ($172.800.000	ext{ ms}$).
  - Ranks 10 a 14 -> ao acertar Rank 14 atinge **Rank 15:** 4 dias de descanso ($345.600.000	ext{ ms}$).
  - Ranks 15 a 18 -> ao acertar Rank 18 atinge **Rank 19:** 8 dias de descanso ($691.200.000	ext{ ms}$).
  - Ranks 19 a 23 -> ao acertar Rank 23 atinge **Rank 24:** 16 dias de descanso ($1.382.400.000	ext{ ms}$).
  - Ranks 24 a 26 -> ao acertar Rank 27 atinge **Rank 24 (Loop):** 32 dias de descanso perpétuo ($2.764.800.000	ext{ ms}$).

---

## 3. MOTOR DE VOZ, RECONHECIMENTO E INTERFACE DE ESTUDO
- Reconhecimento de Fala & VAD (`src/useSpeech.js`):
  * Web Speech API contínua com `interimResults = true`.
  * Acerto validado com taxa >= 75% com buffer de tolerância de 0,75s.
  * Erro decretado após silêncio contínuo de 1,3s abaixo do limiar.
- Transição Vinculada ao Término do Áudio (`onended`):
  * Toda transição de card após acerto ou erro aguarda obrigatoriamente o evento nativo de término do áudio (`audio.onended`) via callback de `falar()`.
  * Proibido o uso de temporizadores matemáticos fixos baseados em contagem de palavras multiplicadas por milissegundos para forçar trocas de tela.
- Áudio Lento Exclusivo Pós-Erro:
  * Pré-avaliação / Botão Ouvir regular: reprodução sempre em velocidade normal (1.00 para ocidentais / 0.85 para mandarim).
  * Pós-erro vocal: disparado automaticamente em velocidade lenta (0.65 para ocidentais / 0.50 para mandarim via `VELOCIDADES_AUDIO`) exclusivamente quando `resultado === 'erro'`.
- Palavras Vermelhas Interativas (`TelaEstudo.jsx`):
  * No feedback de erro de voz, palavras com pronúncia divergente ficam vermelhas (`#ef4444`) com cursor pointer.
  * O clique do aluno dispara `tocarAudioPalavra(word, idiomaEstudo)`, executando o arquivo isolado armazenado no Storage.

---

## 4. ENGENHARIA DE ÁUDIO: FRASES VS. PALAVRAS E REGRAS FONÉTICAS
### A. Frases Completas (`audios_dingli/{lang}/{id}_{voz}.mp3`)
- Formato: `{id}_{voz}.mp3` (ex: `1_v1.mp3`, `988_v2.mp3`).
- Bucket Supabase: `audios/{lang}/{id}_{voz}.mp3`.
- Identificadores Técnicos Oficiais (Edge-TTS):
  * **Inglês (`en` - 6 vozes):**
    - `v1`: `en-US-AndrewNeural`
    - `v2`: `en-US-GuyNeural`
    - `v3`: `en-US-EricNeural`
    - `v4`: `en-US-JennyNeural`
    - `v5`: `en-GB-LibbyNeural`
    - `v6`: `en-CA-ClaraNeural`
  * **Espanhol (`es` - 6 vozes):**
    - `v1`: `es-AR-TomasNeural`
    - `v2`: `es-MX-JorgeNeural`
    - `v3`: `es-PE-AlexNeural`
    - `v4`: `es-CO-SalomeNeural`
    - `v5`: `es-CL-CatalinaNeural`
    - `v6`: `es-MX-DaliaNeural`
  * **Francês (`fr` - 4 vozes):**
    - `v1`: `fr-FR-DeniseNeural`
    - `v2`: `fr-FR-HenriNeural`
    - `v3`: `fr-BE-CharlineNeural`
    - `v4`: `fr-CA-ThierryNeural`
  * **Italiano (`it` - 4 vozes):**
    - `v1`: `it-IT-GiuseppeMultilingualNeural`
    - `v2`: `it-IT-DiegoNeural`
    - `v3`: `it-IT-IsabellaNeural`
    - `v4`: `it-IT-ElsaNeural`
  * **Português (`pt` - 4 vozes):**
    - `v1`: `pt-BR-AntonioNeural`
    - `v2`: `pt-BR-ThalitaMultilingualNeural`
    - `v3`: `ko-KR-HyunsuMultilingualNeural`
    - `v4`: `en-US-AvaMultilingualNeural`
  * **Alemão (`ge` - 4 vozes):**
    - `v1`: `de-AT-JonasNeural`
    - `v2`: `de-DE-FlorianMultilingualNeural`
    - `v3`: `de-DE-SeraphinaMultilingualNeural`
    - `v4`: `de-DE-KatjaNeural`
  * **Mandarim (`zh` - 4 vozes):**
    - `v1`: `zh-CN-XiaoxiaoNeural`
    - `v2`: `zh-CN-YunxiNeural`
    - `v3`: `zh-CN-YunjianNeural`
    - `v4`: `zh-CN-XiaoyiNeural`


### C. Regra do Mandarim: Par Inseparável Hanzi (`zh`) e Pinyin (`pi`)
- Ao sincronizar o idioma Mandarim, os campos `zh` e `pi` formam um par inseparável no banco de dados Supabase (`sentences`).
- Toda atualização no Supabase para Mandarim deve enviar simultaneamente ambos os campos: `{"zh": ..., "pi": ...}`.
- A geração e upload de áudios é disparada exclusivamente para frases em que o texto Hanzi (`zh`) foi alterado. Alterações restritas a ajustes ortográficos/fonéticos de Pinyin (`pi`) atualizam o banco de dados sem re-síntese redundante de áudio.

### B. Palavras Isoladas (`audios_dingli/palavras/{lang}/{slug}.mp3`)
- Desambiguação Fonética Obrigatória (Sufixos NFD):
  * Proibido normalizar ciegamente para ASCII puro removendo acentos.
  * Termos com acentos/marcas utilizam sufixos descritivos (`_acute`, `_grave`, `_circ`, `_tilde`, `_uml`, `_ced`, `_macron`, `_caron`).
  * O sintetizador neural (Edge-TTS) recebe o texto com sua acentuação original para entonação nativa exata; o arquivo físico e a URL no Storage usam o slug descritivo (`caffe_e_grave.mp3`, `dingli_i_grave_i_grave.mp3`).
  * A função `sanitizarPalavraAudio` em `src/services/audioCacheService.js` reflete identicamente essa convenção.
- Prevenção de DAC Sleep (Hardware / Bluetooth):
  * Todos os arquivos de palavras isoladas possuem 300ms de silêncio inicial (`adelay=300|300`) e 100ms de silêncio final (`apad=pad_dur=0.1`) via FFmpeg a 128 kbps.
- Casos Especiais Blindados:
  * `5550192.mp3`: Sequência telefônica ditada com ritmo natural em blocos.
  * `24h24.mp3`: Expressão idiomática francesa tratada com dicção humana autêntica ("vingt-quatre heures sur vingt-quatre").
  * Português: Injeção de "ê" quando a conjunção for "e" isolada (som fechado /e/).
- Vozes Oficiais de Vocabulário:
  * Inglês: `en-CA-ClaraNeural`
  * Espanhol: `es-MX-DaliaNeural`
  * Francês: `fr-FR-DeniseNeural`
  * Italiano: `it-IT-IsabellaNeural`
  * Português: `pt-BR-FranciscaNeural`
  * Alemão: `de-DE-KatjaNeural`
  * Mandarim: `zh-CN-XiaoxiaoNeural`

---

### E. Regra Oficial do Vocabulário de Mandarim (Passo 7)
- **Origem Lexical:** As palavras isoladas de Mandarim derivam exclusivamente da coluna `pi` (Pinyin com acentos tonais) do `supabase_sentences.csv`.
- **Voz Neural:** Síntese direta com `zh-CN-XiaoxiaoNeural` a partir do Pinyin com marcas de tom nativas.
- **Desambiguação e Slugs:** Utiliza `sanitizar_palavra_audio`, suportando formalmente `macron` (`̄` - 1º tom) e `caron` (`̌` - 3º tom), além de `acute` (`́` - 2º tom) e `grave` (`̀` - 4º tom).
- **Destino Storage:** Bucket `audios/palavras/zh/{slug}.mp3`.
- **Tratamento de Áudio:** Todo arquivo de vocabulário recebe pré-delay de 300ms e pós-padding de 100ms via FFmpeg para prevenção de DAC sleep.
- **Comando Único Oficial:** `python scripts/sincronizar_vocabulario.py zh [--dry-run]`.

### F. Orquestrador Unificado de Sincronização Total (Passos 4, 6 e 7)
Fluxo oficial automatizado em 2 comandos após aprovação da tabela de revisão:
1. **Preparação & Auditoria Prévia (Backup Supabase + Patch CSV + Dry-Run Completo):**
   `python scripts/sincronizar_tudo.py [idiomas...] --patch revisoes.json --dry-run`
2. **Execução Real Definitiva (Síntese TTS, Upload Storage, PATCH DB, Purga Remota):**
   `python scripts/sincronizar_tudo.py [idiomas...]`
   *(Lembrete: Enquanto a execução real é processada no terminal, o operador pode copiar manualmente o arquivo recém-gerado em `backups/sentences_backup_[timestamp].csv` para a planilha espelho do Google Sheets).*

---

## 5. MATRIZ DE ESTADO DOS IDIOMAS (100% FACTUAL)
| Idioma | Frases no Supabase | Áudios de Frases (Storage) | Palavras no Disco | Palavras no Storage | Status Oficial |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Inglês (`en`)** | 1.200 / 1.200 | 7.200 / 7.200 | 1.824 | 1.824 | ✔ **100% Concluído** |
| **Italiano (`it`)** | 1.200 / 1.200 | 4.800 / 4.800 | 2.148 | 2.148 | ✔ **100% Concluído** |
| **Francês (`fr`)** | 1.200 / 1.200 | 4.800 / 4.800 | 2.143 | 2.143 | ✔ **100% Concluído** |
| **Espanhol (`es`)** | 1.200 / 1.200 | 7.200 / 7.200 | 2.083 | 2.083 | ✔ **100% Concluído** |
| **Português (`pt`)** | 1.200 / 1.200 | 4.800 / 4.800 | 2.055 | 2.055 | ✔ **100% Concluído** |
| **Alemão (`ge`)** | 1.200 / 1.200 | 4.800 / 4.800 | 2.190 | 2.190 | ✔ **100% Concluído** |
| **Mandarim (`zh`/`pi`)** | 1.200 / 1.200 | 4.800 / 4.800 | 2.675 *(sem tons)* | 2.675 *(sem tons)* | ⏳ Pendente Palavras (~1.787 oficiais) |

---

## 6. INSTRUÇÃO DE ABERTURA PARA NOVAS SESSÕES DE IA
Ao iniciar um novo chat de desenvolvimento:
1. Ler obrigatoriamente `DINGLI_MASTER.md` na íntegra na primeira mensagem.
2. Obedecer à Diretriz Zero: proibição absoluta de inferir; conferir tudo no terminal.
3. Se o usuário solicitar revisão de frases: seguir estritamente o protocolo da Seção 7.

---

## 7. PROTOCOLO PADRÃO DE REVISÃO CONTÍNUA DE FRASES E ÁUDIOS

### 7.1 OS 4 PILARES OBRIGATÓRIOS DE AVALIAÇÃO LINGUÍSTICA E PEDAGÓGICA
Em toda e qualquer revisão de frases, a IA e o desenvolvedor devem auditar as frases contra 4 critérios inegociáveis:
1. ADEQUAÇÃO AO NÍVEL CEFR (A1, A2, B1 ou B2):
   - Verificar se a estrutura gramatical, extensão e complexidade lexical servem com rigor ao nível pedagógico da frase.
2. PURIFICAÇÃO CONTRA CALQUES E INFLUÊNCIAS EXTERNAS:
   - Averiguar e eliminar qualquer influência sintática, lexical ou distorção de tradução de outros idiomas (do inglês-fonte, do português ou de terceiros).
3. EQUILÍBRIO ENTRE AUTENTICIDADE NATIVA E DIDÁTICA DO APLICATIVO:
   - Assegurar que a frase soe como o idioma puro falado naturalmente por nativos no dia a dia, mantendo perfeito equilíbrio com o paralelismo pedagógico entre as 7 línguas da plataforma (usando a frase em inglês como fonte original de sentido).
   - Regra de Formalidade (Du vs. Sie / Tu vs. Vous / Tu vs. Lei): Por critério didático explícito, apenas interações com estranhos ou atendentes comerciais que exigem formalidade recebem tratamento formal (*Sie* / *Vous* / *Lei*). Todas as demais interações interpessoais cotidianas usam obrigatoriamente a forma informal (*Du* / *Tu*).
   - Registro Contínuo de Peculiaridades: Caso surja um novo padrão de avaliação ou convenção recorrente própria do idioma sendo revisado, esse critério deverá ser formalizado e incluído aqui como uma nova regra oficial para orientar todas as revisões seguintes.
4. RIGOR DE PONTUAÇÃO E ESPAÇAMENTO:
   - Checar se a pontuação segue estritamente a norma-padrão do idioma (vírgulas antes de orações subordinadas e orações infinitivas com *zu*, ausência de palavras grudadas sem espaço, correspondência de pontos finais, exclamações e interrogações).

### 7.2 O FLUXO SEQUENCIAL DE 7 PASSOS CONSOLIDADOS
Sempre que o usuário solicitar revisão ou melhoria didática de frases, a execução DEVE seguir rigorosamente esta sequência automatizada:

1. [Chat] Solicitação do bloco de frases para revisão (indicando idioma e faixa de IDs, em lotes recomendados de 50 frases).
2. [Chat] Tabela comparativa gerada pela IA contendo estritamente as colunas:
   `id | inglês | como está | como deve ser | explicação mais breve possível`
   (aplicando os 4 pilares da Seção 7.1).
   - REGRA MANDATÓRIA DE LARGURA TOTAL (FULL-WIDTH):
     * Abertura obrigatória na primeira linha sem saudações ou títulos Markdown (##):
       "Tabela comparativa de frases de [Idioma] tendo o Inglês como referência:"
     * Alinhamento estrito à esquerda em todas as 5 colunas no separador:
       `| :--- | :--- | :--- | :--- | :--- |`
     * Proibição de tags ou notas internas dentro das células para não forçar barra de rolagem horizontal.
     * Concisão estrita na 5ª coluna: frases sem alteração recebem exclusivamente "Perfeito e natural." e frases com ajuste recebem explicação direta de no máximo 1 linha curta.
3. [Chat] Análise, discussão e aprovação final das sugestões pelo usuário. Ao aprovar um bloco de frases, a IA deve obrigatoriamente questionar se há mais alguma frase para ser revisada antes de avançar; o Passo 4 só pode ser iniciado após a confirmação explícita do usuário autorizando o início da sincronização.
4. [Terminal] Backup automático da tabela `sentences` do Supabase (`backups/sentences_backup_TIMESTAMP.csv`) seguido da atualização do CSV local (`supabase_sentences.csv`) em `utf-8-sig` (`python scripts/aplicar_revisao_e_backup.py [arquivo_revisoes.json]`), preservando rigorosamente todas as 19 colunas curriculares e pedagógicas existentes no arquivo via reader.fieldnames.
5. [Manual] Usuário importa o CSV no Google Sheets para acompanhamento visual e cópia de segurança pessoal.
6. [Terminal] Pipeline unificado de frases completas: quarentena local dos áudios antigos, síntese Edge-TTS de todas as vozes oficiais, upload com `x-upsert` para o Storage e atualização da tabela `sentences` no Supabase via `PATCH` (`python scripts/sincronizar_frases_completo.py [idioma] [--dry-run]`).
7. [Terminal] Pipeline unificado de vocabulário de palavras isoladas: auditoria via `scripts/sanitizacao.py`, quarentena de órfãos locais, síntese com Edge-TTS + FFmpeg (`adelay=300|300,apad=pad_dur=0.1` a 128 kbps), upload para o Storage, purga de órfãos remotos em lotes e ateste de 100% de paridade (`python scripts/sincronizar_vocabulario_completo.py [idioma|todos]`).
---

### 7.3 CONTROLE DE CICLOS, VERSIONAMENTO E BACKUPS (SUPABASE: curso_revisoes)

#### A. Arquitetura de Versões Independentes por Idioma
- Cada idioma mantém seu próprio contador sequencial de versão na tabela `curso_revisoes`.
- Atualizações em um curso incrementam apenas o contador daquele idioma, registrando a lista exata de IDs alterados.
- Todo ciclo sincronizado gera um snapshot completo da tabela `sentences` em `backups/sentences_v{versao}_{idioma}_{timestamp}.csv` e anexa o evento no livro-razão `backups/historico_revisoes.md`.

#### B. Estado Oficial de Versões
- **Mandarim (`zh`)**: Versão 2 (921 frases aprimoradas).
- **Inglês (`en`)**: Versão 2 (ID 135 reparado).
- **Espanhol (`es`)**: Versão 2 (ID 135 reparado).
- **Italiano (`it`)**: Versão 2 (ID 135 reparado).
- **Francês (`fr`)**: Versão 1 (Carga inicial de 1.200 frases).
- **Alemão (`ge`)**: Versão 1 (Carga inicial de 1.200 frases).
- **Português (`pt`)**: Versão 3 atual:
  * Nível A1 (IDs 1–300): Concluído (Versão 2 — 37 revisões aplicadas).
  * Nível A2 (IDs 301–600): Concluído (Versão 3 — 16 revisões aplicadas).
  * Nível B1 (IDs 601–900): Pendente de início.
  * Nível B2 (IDs 901–1200): Pendente.

---

## 8. SUBSISTEMA DE VERSIONAMENTO E SINCRONIZAÇÃO CIRÚRGICA DE CONTEÚDO

### 8.1 Tabela `curso_revisoes` e Pipeline no Supabase
- **Estrutura:** Registra a evolução de conteúdo por curso (`idioma`, `versao`, `ids`, `descricao`, `updated_at`).
- **Automação (`sincronizar_frases_completo.py`):** Ao auditar ou sincronizar frases com alterações de texto/áudio, o script detecta os IDs afetados, incrementa a versão daquele idioma e grava o registro de revisão no Supabase.

### 8.2 Os 3 Cenários Determinísticos de Atualização no Front-End
A verificação ocorre na transição de telas (abertura de Deck/Game) comparando a versão remota (`curso_revisoes`) com o cache local (`localStorage.getItem('versao_conteudo_' + idiomaEstudo)`):
1. **Cenário 1 (Sem revisão pendente):** A versão local é igual à remota. A navegação prossegue de imediato.
2. **Cenário 2 (Revisão existente, R = 0 frases estudadas):**
   - Gravação imediata da nova versão no `localStorage`.
   - Limpeza assíncrona em segundo plano de caches antigos (`expurgarAudiosDeIds`, `invalidarTopicosPorSentencas`) via `Promise.all()`.
   - Abertura imediata do Deck ou Game sem bloqueio de interface.
3. **Cenário 3 (Revisão existente com frases já estudadas, R > 0):**
   - Interceptação com bloqueio e exibição do modal `CardAvisoAtualizacao.jsx`.

### 8.3 Contrato de Limpeza Prévia de Memória e Consistência (Pre-emptive Clearing)
Para evitar condições de corrida (*stale state*) onde o motor do jogo lê frases antigas ainda em memória ao terminar o download:
1. **Limpeza Prévia de Memória RAM:** No clique de confirmação, executar imediatamente:
   - `limparEstadoExercicio()` e `setFrasesFiltradas([])`.
   - Remoção dos IDs revisados de `sessaoDominium` (`primeira`, `recuperadas`, `acertosTempo`, `falhas`).
   - Reset de `frasesMaestria[id]` para Rank 0 descartando chaves estáticas de texto (`texto`, `traducao`, `texto_zh`).
2. **Sincronização no IndexedDB (`offlineStorage`):**
   - Os tópicos afetados salvos localmente (`topicosBaixados`) são reconsultados na nuvem e regravados no IndexedDB com os textos atualizados, prevenindo solicitações de download redundantes no Deck.
3. **Download Cirúrgico (`audioCacheService`):**
   - O download de novos arquivos `.mp3` é restrito estritamente aos IDs estudados pelo usuário (em lotes concorrentes de 4), emitindo percentual contínuo de 0% a 100% diretamente no botão.
4. **Finalização:** Gravação da nova versão no `localStorage`, fechamento do modal e acionamento da tela de destino com os novos dados em vigor.

### 8.4 Interface Centralizada e Internacionalizada (`CardAvisoAtualizacao.jsx`)
- Componente em tela cheia com alinhamento vertical e horizontal estrito (`margin: 0 auto`, `alignItems: 'center'`).
- Suporte nativo para os 7 idiomas suportados (`pt`, `en`, `es`, `fr`, `it`, `ge`, `pi`).
- Monitoramento de viewport dinâmico (`visualViewport`) para evitar deslocamento com teclados virtuais ou barras de navegação móveis.
