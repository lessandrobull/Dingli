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

## 1. CONTEXTO GERAL E FUNDAÇÕES DA APLICAÇÃO
- Objetivo: Aplicativo progressivo para aprendizado acelerado de idiomas, baseado no algoritmo proprietário de repetição espaçada (SRS) "Dominium".
- Pilares Didáticos: Input compreensível, treino ativo de pronúncia em tempo real, arquitetura offline-first e interface móvel responsiva estrita.
- Stack Tecnológica:
  * Frontend: React 19 (`^19.2.0`), Vite 7 (`^7.3.1`).
  * Backend / Banco: Supabase (PostgreSQL - tabela `sentences`).
  * Armazenamento Remoto: Supabase Storage (Bucket público `audios`).
  * Cache Local: IndexedDB nativo (`DB_NAME = "dingli_offline_db"`, `DB_VERSION = 3`).
- Grade Curricular:
  * Exatamente 1.200 frases sequenciais (IDs 1 a 1200).
  * 4 Níveis do CEFR: A1, A2, B1, B2 (300 frases por nível).
  * 40 Tópicos Temáticos: 10 tópicos por nível, 30 frases por tópico.
  * 7 Idiomas / 8 Frentes: Inglês (`en`), Espanhol (`es`), Francês (`fr`), Italiano (`it`), Português (`pt`), Alemão (`ge`), Mandarim Hanzi (`zh`) e Mandarim Pinyin com tons (`pi`).
- Fonte Única de Verdade do Currículo: Ficheiro `supabase_sentences.csv` (com `utf-8-sig`), rigorosamente espelhado na tabela `sentences` do Supabase.

---

## 2. MOTOR DOMINIUM (SRS DETERMINÍSTICO) E CICLO DA TASK
- Bandeja Hermética de 5 Cartas (`taskIdsRef.current`, `LIMITE_BANDEJA = 5`):
  * A sessão ativa de estudo admite no máximo 5 frases distintas por ciclo de estudo (Task).
  * Prioridade de Admissão: 1º Cartas em trânsito abertas na mesa (`emTransito`); 2º Revisões liberadas de dias anteriores (`progressoDias`); 3º Cartas inéditas do tópico/nível (`ineditas`).
  * Fechamento Hermético: Preenchida a cota de 5 IDs, a admissão fecha totalmente. Nenhuma 6ª carta entra na sessão corrente (~4 a 5 minutos por Task).
- Válvula de Escape no 3º Erro Consecutivo de Voz:
  * Ao registrar 3 falhas consecutivas na mesma frase em exercícios vocais, o microfone não entra em loop.
  * O app exibe o aviso pedagógico: "Revisar mais tarde, dê uma pesquisada nessa pronúncia e tente no próximo ciclo".
  * O botão move o ID da frase para o final da fila da bandeja atual (`taskIdsRef.current = [...outras, idAlvo]`), retendo o rank em recuperação no Dominium sem punições desproporcionais.
- Escala de Ranks e Portos Seguros (Descansos Exponenciais):
  * Ranks 1 a 5 (microciclos de 30s) -> ao acertar Rank 5 atinge Rank 6: descanso de 1 dia.
  * Ranks 6 a 9 -> ao acertar Rank 9 atinge Rank 10: descanso de 2 dias.
  * Ranks 10 a 14 -> atinge Rank 15: descanso de 4 dias.
  * Ranks 15 a 18 -> atinge Rank 19: descanso de 8 dias.
  * Ranks 19 a 23 -> atinge Rank 24: descanso de 16 dias.
  * Ranks 24 a 26 -> atinge Rank 27: descanso perpétuo de 32 dias (Maestria Permanente).

---

## 3. MOTOR DE VOZ, RECONHECIMENTO E INTERFACE DE ESTUDO
- Reconhecimento de Fala & VAD (`src/useSpeech.js`):
  * Web Speech API contínua com `interimResults = true`.
  * Acerto validado com taxa >= 75% com buffer de tolerância de 0,75s.
  * Erro decretado após silêncio contínuo de 1,3s abaixo do limiar.
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
- Vozes Oficiais de Frases:
  * Inglês (`en` - 6 vozes): Andrew, Guy, Eric, Jenny, Libby, Clara.
  * Espanhol (`es` - 6 vozes): Tomás, Jorge, Alex, Salomé, Catalina, Dalia.
  * Francês (`fr` - 4 vozes): Denise, Henri, Charline, Thierry.
  * Italiano (`it` - 4 vozes): Giuseppe, Diego, Isabella, Elsa.
  * Português (`pt` - 4 vozes): Antônio, Thalita, Hyunsu, Ava.
  * Alemão (`ge` - 4 vozes): Jonas, Florian, Seraphina, Katja.
  * Mandarim (`zh` - 4 vozes): Xiaoxiao, Yunxi, Yunjian, Xiaoyi.


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
3. [Chat] Análise, discussão e aprovação final das sugestões pelo usuário. Ao aprovar um bloco de frases, a IA deve obrigatoriamente questionar se há mais alguma frase para ser revisada antes de avançar; o Passo 4 só pode ser iniciado após a confirmação explícita do usuário autorizando o início da sincronização.
4. [Terminal] Backup automático da tabela `sentences` do Supabase (`backups/sentences_backup_TIMESTAMP.csv`) seguido da atualização do CSV local (`supabase_sentences.csv`) em `utf-8-sig` (`python scripts/aplicar_revisao_e_backup.py`).
5. [Manual] Usuário importa o CSV no Google Sheets para acompanhamento visual e cópia de segurança pessoal.
6. [Terminal] Pipeline unificado de frases completas: quarentena local dos áudios antigos, síntese Edge-TTS de todas as vozes oficiais, upload com `x-upsert` para o Storage e atualização da tabela `sentences` no Supabase via `PATCH` (`python scripts/sincronizar_frases_completo.py [idioma] [--dry-run]`).
7. [Terminal] Pipeline unificado de vocabulário de palavras isoladas: auditoria via `scripts/sanitizacao.py`, quarentena de órfãos locais, síntese com Edge-TTS + FFmpeg (`adelay=300|300,apad=pad_dur=0.1` a 128 kbps), upload para o Storage, purga de órfãos remotos em lotes e ateste de 100% de paridade (`python scripts/sincronizar_vocabulario_completo.py [idioma|todos]`).