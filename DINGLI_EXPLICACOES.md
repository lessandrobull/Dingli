# DINGLI_EXPLICACOES.md
**Documentação Operacional, Arquitetura do Motor e Diretrizes Pedagógicas por Par - Dìnglì**

---

## 1. Visão Geral e Arquitetura da Esteira

O ecossistema de geração de explicações pedagógicas do Dìnglì opera de forma 100% autônoma na nuvem via **Google Apps Script (GAS)**, integrado diretamente à API REST do **Supabase** e com gravação no **Google Drive** (`Explicacoes_Prontas/`), eliminando a necessidade de terminal local ou máquina ligada durante a produção em lote.

### 1.1 O Ciclo de Execução em Lote Único
1. **Lote de 30 Frases:** Cada tópico do curso (composto por exatamente 30 frases) é enviado em uma **única chamada** à API do Gemini (`TAMANHO_BLOCO = 30`). O modelo processa e devolve o JSON completo com as 30 explicações de uma só vez, eliminando o antigo fracionamento 6x5 e economizando chamadas de rede.
2. **Modelo Exclusivo:** O pipeline utiliza estritamente o modelo **`gemini-3.5-flash`** com saída estruturada forçada via `responseMimeType: "application/json"` e `temperature: 0.2`. Não há uso de fallbacks para modelos secundários.
3. **Resiliência e Tolerância a Falhas:**
   - **Alternância Imediata de Chaves (Multi-Key):** Suporte a um array de chaves (`GEMINI_API_KEYS`). Ao receber HTTP 429 (limite diário ou por minuto), o motor chaveia imediatamente para a chave seguinte em menos de 1 segundo sem esperas desnecessárias.
   - **Até 5 tentativas por lote:** O laço de repetição permite até 5 ciclos completos pelas chaves antes de declarar falha.
   - **Pausa Coordenada de 60 segundos:** Se todas as chaves configuradas retornarem HTTP 429 no mesmo ciclo, o script aguarda 60 segundos cravados para que a janela deslizante da API zere antes do próximo ciclo.
   - **Pausa de 20 segundos em instabilidades (HTTP 503 / erros de rede):** Em erros de servidor ou falhas temporárias de conexão, o motor aguarda 20 segundos antes de tentar novamente.
   - **Trava de Segurança do Apps Script:** Monitoramento do tempo limite de 6 minutos (`360000 ms`) para evitar interrupções forçadas pelo Google.
4. **Auto-Recuperação na Planilha:** Na inicialização de cada rodada, o script varre a planilha e resgata qualquer linha que tenha ficado travada em `Em Processamento` ou com erro, resetando seu status automaticamente para `Pendente` com preenchimento em vermelho claro (`#f4cccc`).

### 1.2 Dimensionamento de Frequência e Cotas
- **Tempo médio de processamento:** ~55 a 65 segundos por tópico (30 frases).
- **Gatilho de 15 minutos:** Processa ~96 tópicos/dia (~2.880 frases/dia). Atinge o teto diário de 90 minutos de execução de gatilhos do Apps Script (contas `@gmail.com`) no final da noite, entregando entre 85 e 90 tópicos concluídos diariamente.
- **Gatilho de 30 minutos:** Processa 48 tópicos/dia (~1.440 frases/dia), consumindo ~48 minutos diários do Apps Script e mantendo folga total de tokens para concorrência com processamentos paralelos de aulas.

---

## 2. Modelagem de Dados no Supabase

O motor não utiliza regras estáticas em arquivos `.gs`. Toda a inteligência pedagógica, regras fonéticas e exemplos mestres são consumidos dinamicamente do Supabase via REST API.

### 2.1 Tabela `sentences`
Armazena o acervo central de frases do aplicativo:
- `id`: Identificador numérico único da frase.
- `level`: Nível de proficiência CEFR (`A1`, `A2`, `B1`, `B2`).
- `topic_[origem]`: Nome do tópico na língua materna do aluno (ex: `topic_pt`).
- Colunas de idioma: `en`, `pt`, `es`, `fr`, `it`, `ge` (e colunas específicas `zh` e `pi` para mandarim).
- **Endpoint de consulta:**
  `GET /rest/v1/sentences?level=eq.{nivel}&topic_{origem}=eq.{topico}&order=id.asc`

### 2.2 Tabela `matriz_pares`
Centraliza a parametrização didática e fonética de cada par de idiomas:
- `par` (Chave Primária): Código do par no formato `estudo_origem` (ex: `en_pt`, `pi_pt`, `fr_pt`, `es_pt`, `it_pt`, `ge_pt`).
- `nome_estudo`: Nome por extenso do idioma que está sendo ensinado (ex: `Inglês`, `Mandarim (Pinyin)`).
- `nome_origem`: Nome por extenso do idioma nativo do aluno (ex: `Português`).
- `instrucao_geral`: Prompt base com a persona do professor, regras rígidas de formatação dos campos e proibições terminológicas.
- `regras_foneticas`: O compêndio numerado de regras fonéticas aplicáveis àquele idioma sob a perspectiva da L1.
- `exemplo_mestre` (JSONB): Objeto JSON contendo a Frase Mestra Universal (Frase 1171) resolvida no padrão ouro para o par.
- **Endpoint de consulta:**
  `GET /rest/v1/matriz_pares?par=eq.{par}&select=nome_estudo,nome_origem,instrucao_geral,regras_foneticas,exemplo_mestre`

---

## 3. Diretrizes Pedagógicas Universais

Toda explicação pedagógica gerada deve seguir o tom de um amigo professor experiente, claro, acolhedor e totalmente livre de academicismos.

### 3.1 Proibição Absoluta de Jargões
- **Termos Gramaticais Banidos:** canônica, sintagma, elisão, clítico, próclise, ênclise, anafórico, deítico, pretérito, acusativo, dativo, genitivo, declinação, desinência, partícula aspectual, classificador nominal, cópula, oração subordinada, particípio, transitividade, adjunto adverbial, phrasal verb, conector subordinativo.
- **Termos Fonéticos Banidos:** fricativa, oclusiva, bilabial, alveolar, velar, glotal, liaison, schwa, flap, apócope, fonema, alofone, IPA.

### 3.2 Estrutura Rigorosa dos 3 Campos Gerados
Cada objeto de frase no JSON final deve conter estritamente as três chaves:

1. **`explanation` (A Lógica Mental da Frase):**
   - Parágrafo único contínuo (estritamente sem quebras de linha `\n`).
   - Revela como o nativo da L2 pensa a ideia em comparação direta com a L1, explicando ordem das palavras, conexões naturais e o sentido prático real (evitando traduções literais truncadas).
2. **`breakdown` (O Raio-X do Vocabulário):**
   - Array de objetos `[{"word": "...", "meaning": "..."}]`.
   - O campo `word` **nunca** deve conter pontuação no final (`?`, `.`, `!`, `,`).
   - Decompõe blocos significativos, termos compostos e preposições, detalhando cada pedaço e seu papel no sentido geral.
3. **`pronuncia` (Instruções Físicas + Transcrição Imediata):**
   - Texto corrido orientando a mecânica física da fala através dos 4 passos táteis:
     1. Ponto de contato (onde posicionar língua, dentes e lábios).
     2. Saída do ar e da voz (ar livre, sopro morno, retenção ou vibração).
     3. Trava da L1 (qual vício automático da língua materna deve ser bloqueado).
     4. Analogia sensorial simples do cotidiano.
   - Fechamento obrigatório na última linha com o comando da língua nativa:
     `Leia: [transcrição fonética adaptada]`

### 3.3 A Frase Mestra Universal (Frase 1171)
Para garantir coerência analítica e comparabilidade entre todos os 42 pares do Dìnglì, a **Frase 1171** (*O conceito de globalização alterou fundamentalmente a maneira como vivemos*) é o padrão ouro oficial adotado no Supabase para todos os pares homologados.

---

## 4. Travas Fonéticas por Par Homologado (L1 Português)

### 4.1 Inglês (`en_pt`)
- **4 Símbolos Obrigatórios com Instrução Tátil:**
  - `ı` (I curto): Queixo solto, sem sorriso, som rápido e frouxo entre 'e' e 'i' (`ship`, `live`).
  - `æ` (A aberto rasgado): Mandíbula aberta na vertical em 'A', cantos dos lábios puxados para os lados em 'É' (`cat`, `apple`).
  - `ə` (Som neutro): Mandíbula caída e língua relaxada, sopro curtíssimo e sem força (`about`, `problem`).
  - `3r` (Vogal do R central): Língua curvada para trás no céu da boca sem tocar em nada (`bird`, `work`).
- **Pares TH:** `th` surdo (língua entre os dentes assoprando ar puro) vs `dh` sonoro (língua entre os dentes vibrando a voz).
- **Consoantes Finais e S Mudo:** Consoantes finais cortam a seco sem 'i' de apoio (`stop`, `book`). Palavras com S inicial seguido de consoante começam direto no silvo do S, sem 'is-' ou 'es-' (`speak`, `study`).
- **Dark L e M Final:** No L final, a ponta da língua cola no céu da boca sem virar som de 'U' (`milk`, `hotel`). No M final, os lábios selam juntos a seco (`time`, `room`).

### 4.2 Mandarim Pinyin (`pi_pt`)
- **Proibição Estrita de 'E/Ê' em Som Gutural e Tom Neutro:** É terminantemente proibido grafar o som gutural posterior (/ɤ/) ou o tom neutro com 'e' ou 'ê'. Grafa-se obrigatoriamente: `da`, `la`, `ga`, `ka`, `rra` e `chán-ma` (para *shénme*).
- **Oposição de Aspiração:** B, D, G, Z, ZH e J são estalos secos sem ar e sem voz (som de P, T, C/K secos). Já P, T, K, C, CH e Q disparam um sopro explosivo de ar quente.
- **Série Retroflexa vs Palatal:** ZH, CH, SH e R articulam com a ponta da língua curvada para trás no céu da boca. J, Q e X articulam com sorriso tenso e língua espalmada na frente.
- **Vogal Ü de Bico:** Em *ju*, *qu*, *xu*, *yu*, lábios em bico firme de 'U' emitindo som de 'I' agudo por dentro, grafado com trema: `djü`, `tchü`, `xü`, `yü`.
- **Rimas com Vogal Oculta:** `-IAN` fecha em `iên`; `-IU` carrega 'o' oculto (`iôu`); `-UI` carrega 'e' central (`uêi`); `-UN` soa `uên`; `BO/PO/MO/FO` soam com transição labial em `uô`.
- **Corte Nasal Dental (-n) vs Ressonância Velar (-ng):** Em `-n` a ponta da língua trava atrás dos dentes da frente; em `-ng` a língua repousa embaixo e o dorso veda o fundo do céu da boca mole.

### 4.3 Francês (`fr_pt`)
- **4 Símbolos Obrigatórios com Instrução Tátil:**
  - `ü` (U francês): Lábios em bico apertado de assobio dizendo 'I' por dentro (`tu`, `rue`).
  - `ø` (EU fechado): Lábios em bico redondo de 'Ô' dizendo 'Ê' fechado por dentro (`peu`, `deux`).
  - `œ` (EU aberto): Lábios arredondados em 'Ó' dizendo 'É' aberto por dentro (`peur`, `sœur`).
  - `ə` (E mudo/relaxado): Lábios levemente arredondados, boca solta e som curto (`le`, `de`).
- **R de Garganta:** Raspar suavemente o fundo da garganta, sem vibrar a ponta da língua e sem raspar áspero (`paris`, `rouge`).
- **Vogais Nasais Puras:** Proibição de bater a língua ou fechar os lábios no final. O ar sai 100% pelo nariz: `ón` (an/am/en/em), `on` (on/om), `in` (in/im/ain/ein).
- **Consoantes Finais Mudas:** As letras D, T, P, S, X e Z no final das palavras morrem silenciosas.

### 4.4 Espanhol (`es_pt`)
- **Vogais Finais Fechadas:** O 'E' final nunca vira 'I' e o 'O' final nunca vira 'U'. Sustentam-se cravados em `ê` e `ô` (`nô-tche`, `a-mí-go`).
- **Proibição Total do Som de 'Z' (Abelha):** A letra S entre vogais é sempre sibilante e seca (`ka-sa` soando "kássa"). As letras Z e C (antes de E/I) soam estritamente como S puro internacional (`sa-pa-tô`, `kô-ra-són`).
- **J e G (antes de E/I) como Suspiro Aspirado:** Suspiro suave e morno direto do peito pela boca aberta (baforar no espelho), grafado estritamente com `h` (`ha-món`, `hên-tê`, `í-hô`). Proibido usar 'j' ou raspar garganta.
- **RR Vibrante na Ponta da Língua:** Tremor mecânico da ponta da língua no céu da boca ("motorzinho: brrr"), proibindo raspar a garganta.
- **Fusão B/V:** B e V têm o mesmo som labial suave, sem encostar dentes no lábio inferior.
- **Voz 100% Oral:** Toda vogal antes de N/M sai totalmente limpa pela boca antes do toque consonantal (`pan` sai oral limpo antes do toque dental, nunca "pão").

### 4.5 Italiano (`it_pt`)
- **Consoantes Duplas / Geminadas:** Reter o ar e segurar a musculatura pelo dobro do tempo na consoante dobrada antes de liberar a vogal seguinte (`pál-la`, `nót-te`, `kôn-tchét-to`).
- **Família do C e G:** C antes de E/I tem estalo de `tch` (`tcháo`); CH antes de E/I é K duro (`per-kê`). G antes de E/I tem estalo de `dj` (`dje-lá-to`); GH antes de E/I é G duro de gato (`spa-guét-ti`).
- **Família do SC:** SC antes de E/I é chiado contínuo suave `ch` (`chê-na`); SCH antes de E/I quebra o chiado e vira `sk` duro (`brus-két-ta`).
- **Letra Z e ZZ Africadas:** Nunca tem som de abelha frouxo. É estalo seco `ts` (`pít-tsa`, `grát-tsie`) ou sonoro `dz` (`dzê-ro`).
- **Proibição de Redução Vocálica:** Vogais finais soam completas, abertas e firmes (`nót-te`, `a-mí-ko`), sem anasalar antes de N/M.
- **T e D Secos:** Ponta da língua reta atrás dos dentes sem chiar como 'tchi' ou 'dji' (`ti á-mo`, `mat-tí-na`).

### 4.6 Alemão (`ge_pt`)
- **Umlauts Ö e Ü:**
  - `ö` / `öö`: Língua posicionada para falar 'Ê' ou 'É', lábios projetados em bico redondo de 'Ô' ou 'Ó' (`schön`, `können`).
  - `ü` / `üü`: Lábios em bico fechado e firme de 'U', língua na frente para dizer 'I' agudo (`Tür`, `fünf`).
- **Inversão Crítica W vs V:** A letra W soa obrigatoriamente como 'V' do português (`Wasser` -> `vás-sa`). A letra V nativa soa como 'F' (`Vater` -> `fáa-ta`, `viel` -> `fíil`).
- **O 'R' Vocalizado:** No final `-er` e após vogais longas, não se raspa a garganta: morre como um 'a' curto e relaxado (`Wasser` -> `vás-sa`, `wir` -> `víia`).
- **Desvozeamento Final (Auslautverhärtung):** No final de palavras ou sílabas, B vira P seco, D vira T seco e G vira K seco (`ab` -> `ap`, `und` -> `unt`, `Tag` -> `táak`).
- **Golpe de Glote (Knacklaut):** Palavras iniciadas por vogal exigem um microbloqueio na laringe, nascendo com ataque seco independente, grafado com apóstrofo no *Leia::* (`ein Apfel` -> `áin 'áp-fel`).
- **Letra Z:** Soa estritamente como estalo seco `ts` colado (`Zeit` -> `tsáit`), sem vibrar como abelha.

---

## 5. Infraestrutura no Google Drive e Planilha de Controle

### 5.1 Estrutura de Pastas
```text
[Google Drive]
└── Dingli_Gerador_Explicacoes/
    ├── Explicacoes_Prontas/       # Arquivos finais gerados (ex: A1_Comida e Restaurantes.json)
    └── Controle_Geracao           # Planilha Google com a fila de execução e auditoria
```

### 5.2 Colunas da Planilha `Controle_Geracao`
- **Coluna A:** `ID_Lote` (Identificador numérico sequencial)
- **Coluna B:** `Par` (Código do par cadastrado no Supabase, ex: `en_pt`, `pi_pt`)
- **Coluna C:** `Nivel` (Nível CEFR: `A1`, `A2`, `B1`, `B2`)
- **Coluna D:** `Topico` (Nome do tópico a processar)
- **Coluna E:** `Status` (`Pendente`, `Em Processamento`, `Concluído`, `Pendente` [#f4cccc])
- **Coluna F:** `Data_Inicio` (Data e hora do disparo)
- **Coluna G:** `Duracao` (Tempo total gasto ou descrição do erro capturado)
- **Coluna H:** `Nome_Arquivo_Final` (Nome do JSON criado na pasta pronta)

---

## 6. Código Oficial de Produção

### 6.1 `Config.gs`
```javascript
const CONFIG = {
  GEMINI_API_KEYS: [
    "SUA_CHAVE_API_GEMINI_1",
    "SUA_CHAVE_API_GEMINI_2"
  ],
  GEMINI_MODELS: ["gemini-3.5-flash"],
  SUPABASE_URL: "https://SEU_PROJETO.supabase.co",
  SUPABASE_KEY: "SUA_SERVICE_ROLE_OU_ANON_KEY",
  ID_PLANILHA_CONTROLE: "ID_DA_PLANILHA_GOOGLE",
  ID_PASTA_PRONTAS: "ID_DA_PASTA_EXPLICACOES_PRONTAS_NO_DRIVE"
};
```

### 6.2 `Motor.gs`
```javascript
function chamarGeminiCascata(payload, tInicio) {
  const modelCandidate = CONFIG.GEMINI_MODELS[0];
  const chaves = CONFIG.GEMINI_API_KEYS || [CONFIG.GEMINI_API_KEY];
  const props = PropertiesService.getScriptProperties();

  // Alternância inicial: começa pela chave oposta à que teve sucesso na execução anterior
  let lastIndex = parseInt(props.getProperty("LAST_USED_KEY_INDEX") || "1", 10);
  let keyIndex = (lastIndex + 1) % chaves.length;

  const ultimosDisparos = {}; // Timestamp do último disparo de cada chave
  const ultimosStatus = {};   // Último HTTP code retornado por cada chave
  let tentativasRedeRestantes = 2;

  // Trava de segurança: limite rígido de 5 minutos (300s)
  while (Date.now() - tInicio < 300000) {
    const numChave = keyIndex + 1;
    const chaveAtual = chaves[keyIndex];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelCandidate}:generateContent?key=${encodeURIComponent(chaveAtual)}`;

    // 1. Checa o timer da chave que vai disparar agora (ancorado no último disparo dela)
    const agora = Date.now();
    const ultimoDisparo = ultimosDisparos[keyIndex] || 0;
    const decorrido = agora - ultimoDisparo;
    const statusAnterior = ultimosStatus[keyIndex];

    let tempoNecessario = 0;
    if (statusAnterior === 429) {
      tempoNecessario = 61000; // 61s se o último erro dela foi cota
    } else if (statusAnterior === 503) {
      tempoNecessario = 10000; // 10s se o último erro dela foi sobrecarga
    }

    // Se o intervalo da chave-alvo ainda não venceu, aguarda apenas a diferença restante
    if (decorrido < tempoNecessario) {
      const espera = tempoNecessario - decorrido;
      if ((Date.now() + espera) - tInicio > 300000) {
        Logger.log("[GAS] Limite de 5 minutos seria ultrapassado durante espera. Encerrando.");
        break;
      }
      Logger.log(`[TIMER] Aguardando ${Math.ceil(espera / 1000)}s para cumprir cooldown da Chave ${numChave}...`);
      Utilities.sleep(espera);
    }

    // Registra o disparo e executa a requisição
    ultimosDisparos[keyIndex] = Date.now();
    Logger.log(`[GEMINI] Disparando requisição com Chave ${numChave}/${chaves.length}...`);

    let response, code;

    try {
      response = UrlFetchApp.fetch(url, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
      code = response.getResponseCode();
    } catch (e) {
      Logger.log(`[REDE] Falha de conexão na Chave ${numChave}: ${e.message}`);
      tentativasRedeRestantes--;
      if (tentativasRedeRestantes <= 0) {
        Logger.log("[REDE] Falha persistente de rede. Mantendo tópico na fila.");
        return null;
      }
      Utilities.sleep(3000);
      keyIndex = (keyIndex + 1) % chaves.length;
      continue;
    }

    ultimosStatus[keyIndex] = code;

    // HTTP 200: Sucesso absoluto
    if (code === 200) {
      const json = JSON.parse(response.getContentText());
      let rawText = json.candidates[0].content.parts[0].text.trim();
      rawText = rawText.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
      rawText = rawText.replace(/,(\s*[\}\]])/g, "$1");

      Logger.log(`[GEMINI SUCESSO] Resposta gerada via Chave ${numChave}.`);
      props.setProperty("LAST_USED_KEY_INDEX", String(keyIndex));
      return JSON.parse(rawText);
    }

    // HTTP 429: Cota esgotada (pula imediatamente para a outra chave)
    if (code === 429) {
      Logger.log(`[GEMINI 429] Chave ${numChave} sem cota. Alternando para a outra chave...`);
      keyIndex = (keyIndex + 1) % chaves.length;
      continue;
    }

    // HTTP 503: Servidor do Google sobrecarregado
    if (code === 503) {
      Logger.log(`[GEMINI 503] Sobrecarga temporária na Chave ${numChave}.`);
      const outraChaveIndex = (keyIndex + 1) % chaves.length;
      const statusOutra = ultimosStatus[outraChaveIndex];
      const decorridoOutra = Date.now() - (ultimosDisparos[outraChaveIndex] || 0);

      // Se a outra chave tomou 429 e ainda não completou os 61s dela:
      if (statusOutra === 429 && decorridoOutra < 61000) {
        const restanteOutra = Math.ceil((61000 - decorridoOutra) / 1000);
        Logger.log(`[GEMINI 503] Outra chave presa no 429 (${restanteOutra}s restantes). Mantendo na Chave ${numChave} respeitando 10s...`);
        // Mantém keyIndex na mesma chave
      } else {
        // Se a outra chave não está presa em 429 (está livre ou com 503), alterna para ela
        Logger.log(`[GEMINI 503] Alternando para Chave ${outraChaveIndex + 1}...`);
        keyIndex = outraChaveIndex;
      }
      continue;
    }

    // HTTP 500 / Erro de servidor interno
    if (code >= 500) {
      Logger.log(`[GEMINI ${code}] Erro de servidor. Aguardando 3s antes de alternar...`);
      tentativasRedeRestantes--;
      if (tentativasRedeRestantes <= 0) {
        Logger.log("[GEMINI] Limite de tentativas de erro 500 esgotado. Mantendo tópico na fila.");
        return null;
      }
      Utilities.sleep(3000);
      keyIndex = (keyIndex + 1) % chaves.length;
      continue;
    }

    // Erros não recuperáveis (400, 403, etc.)
    Logger.log(`[GEMINI ERRO ${code}] Chave ${numChave} retornou erro não recuperável. Alternando.`);
    keyIndex = (keyIndex + 1) % chaves.length;
  }

  Logger.log(`[GEMINI ERRO CRÍTICO] Tempo limite de 5 minutos atingido sem sucesso.`);
  return null;
}

function obterFrasesSupabase(par, nivel, topico) {
  const partes = par.split("_");
  const estudo = partes[0];
  const origem = partes[1];
  const colTopicOrigem = `topic_${origem}`;

  const url = `${CONFIG.SUPABASE_URL}/rest/v1/sentences?level=eq.${encodeURIComponent(nivel)}&${colTopicOrigem}=eq.${encodeURIComponent(topico)}&order=id.asc`;
  const options = {
    method: "get",
    headers: {
      "apikey": CONFIG.SUPABASE_KEY,
      "Authorization": `Bearer ${CONFIG.SUPABASE_KEY}`,
      "Accept": "application/json"
    },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() !== 200) {
    throw new Error(`Falha ao consultar frases no Supabase: HTTP ${response.getResponseCode()}`);
  }

  const dados = JSON.parse(response.getContentText());
  const ehMandarim = (estudo === "zh" || estudo === "pi");

  return dados.map(f => {
    const item = {
      id: f.id,
      [origem]: f[origem]
    };
    if (ehMandarim) {
      item.zh = f.zh;
      item.pi = f.pi;
    } else {
      item[estudo] = f[estudo];
    }
    return item;
  });
}

function obterMatrizSupabase(par) {
  const url = `${CONFIG.SUPABASE_URL}/rest/v1/matriz_pares?par=eq.${encodeURIComponent(par)}&select=nome_estudo,nome_origem,instrucao_geral,regras_foneticas,exemplo_mestre`;
  const options = {
    method: "get",
    headers: {
      "apikey": CONFIG.SUPABASE_KEY,
      "Authorization": `Bearer ${CONFIG.SUPABASE_KEY}`,
      "Accept": "application/json"
    },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() !== 200) {
    throw new Error(`Falha ao consultar matriz no Supabase: HTTP ${response.getResponseCode()} - ${response.getContentText()}`);
  }

  const dados = JSON.parse(response.getContentText());
  if (!dados || dados.length === 0) {
    throw new Error(`Par '${par}' não encontrado na tabela matriz_pares do Supabase.`);
  }

  return dados[0];
}

function processarProximoTopico() {
  const planilha = SpreadsheetApp.openById(CONFIG.ID_PLANILHA_CONTROLE).getActiveSheet();
  const dados = planilha.getDataRange().getValues();

  // 1. Resgate no início: linhas que não sejam "Concluído" nem "Pendente" viram "Pendente" em vermelho (#f4cccc)
  for (let i = 1; i < dados.length; i++) {
    const statusAtual = String(dados[i][4]).trim();
    const statusLower = statusAtual.toLowerCase();

    if (statusAtual !== "" && statusLower !== "concluído" && statusLower !== "pendente") {
      planilha.getRange(i + 1, 5).setValue("Pendente").setBackground("#f4cccc");
      if (statusLower.includes("processamento")) {
        planilha.getRange(i + 1, 7).setValue("Interrompido / Timeout anterior");
      }
      dados[i][4] = "Pendente";
    }
  }

  // 2. Busca a próxima pendência
  let linhaAlvo = -1;
  let tarefa = null;

  for (let i = 1; i < dados.length; i++) {
    if (dados[i][4] === "Pendente") {
      linhaAlvo = i + 1;
      tarefa = {
        idLote: dados[i][0],
        par: dados[i][1],
        nivel: dados[i][2],
        topico: dados[i][3]
      };
      break;
    }
  }

  if (!tarefa) {
    Logger.log("Nenhuma tarefa com status 'Pendente' encontrada.");
    return;
  }

  const tInicio = new Date();
  const fInicio = Utilities.formatDate(tInicio, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");

  planilha.getRange(linhaAlvo, 5).setValue("Em Processamento").setBackground(null);
  planilha.getRange(linhaAlvo, 6).setValue(fInicio);
  planilha.getRange(linhaAlvo, 7).setValue("");

  try {
    Logger.log(`Buscando matriz de regras no Supabase para o par '${tarefa.par}'...`);
    const matriz = obterMatrizSupabase(tarefa.par);

    Logger.log(`Buscando frases do Supabase para [${tarefa.nivel}] ${tarefa.topico} (${tarefa.par})...`);
    const frasesLote = obterFrasesSupabase(tarefa.par, tarefa.nivel, tarefa.topico);

    if (!frasesLote || frasesLote.length === 0) {
      throw new Error("Nenhuma frase retornada pelo Supabase para este tópico.");
    }

    const TAMANHO_BLOCO = 30;
    let jsonFinal = {};

    for (let b = 0; b < frasesLote.length; b += TAMANHO_BLOCO) {
      if (new Date() - tInicio > 300000) {
        throw new Error("Tempo limite de segurança (5 minutos) atingido");
      }

      const blocoFrases = frasesLote.slice(b, b + TAMANHO_BLOCO);

      Logger.log(`Processando ${blocoFrases.length} frases do tópico (ID ${blocoFrases[0].id} a ${blocoFrases[blocoFrases.length - 1].id})...`);

      const prompt = `${matriz.instrucao_geral}

${matriz.regras_foneticas}

FORMATO DE RETORNO EXCLUSIVO (JSON puro):
{
  "ID_DA_FRASE": {
    "explanation": "...",
    "breakdown": [
      { "word": "...", "meaning": "..." }
    ],
    "pronuncia": "...\nLeia: ..."
  }
}

EXEMPLO DE PADRÃO OURO:
${JSON.stringify({ "1171": matriz.exemplo_mestre }, null, 2)}

LOTE DE FRASES DO TÓPICO A PROCESSAR:
${JSON.stringify(blocoFrases, null, 2)}`;

      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2
        }
      };

      const jsonResultado = chamarGeminiCascata(payload, tInicio);

      if (!jsonResultado) {
        throw new Error(`Falha na API no lote de frases.`);
      }

      let blocoNormalizado = jsonResultado;
      if (Array.isArray(jsonResultado)) {
        blocoNormalizado = {};
        jsonResultado.forEach(item => Object.assign(blocoNormalizado, item));
      } else if (typeof jsonResultado === 'object' && jsonResultado !== null) {
        const chaves = Object.keys(jsonResultado);
        if (chaves.length === 1 && typeof jsonResultado[chaves[0]] === 'object' && !jsonResultado[String(blocoFrases[0].id)]) {
          const primeiroValor = jsonResultado[chaves[0]];
          if (Array.isArray(primeiroValor)) {
            blocoNormalizado = {};
            primeiroValor.forEach(item => Object.assign(blocoNormalizado, item));
          } else {
            blocoNormalizado = primeiroValor;
          }
        }
      }

      Object.assign(jsonFinal, blocoNormalizado);

      if (b + TAMANHO_BLOCO < frasesLote.length) {
        Utilities.sleep(30000);
      }
    }

    const totalGeradas = Object.keys(jsonFinal).length;
    if (totalGeradas !== frasesLote.length) {
      throw new Error(`Inconsistência de frases: esperava ${frasesLote.length}, mas foram geradas ${totalGeradas}.`);
    }

    const nomeArquivoFinal = `${tarefa.nivel}_${tarefa.topico}.json`;
    const pastaProntas = DriveApp.getFolderById(CONFIG.ID_PASTA_PRONTAS);
    pastaProntas.createFile(nomeArquivoFinal, JSON.stringify(jsonFinal, null, 2), MimeType.PLAIN_TEXT);

    const duracaoSegundos = Math.round((new Date() - tInicio) / 1000);
    const min = Math.floor(duracaoSegundos / 60);
    const seg = duracaoSegundos % 60;
    const duracaoFormatada = min > 0 ? `${min}m ${seg}s` : `${seg}s`;

    planilha.getRange(linhaAlvo, 5).setValue("Concluído").setBackground(null);
    planilha.getRange(linhaAlvo, 7).setValue(duracaoFormatada);
    planilha.getRange(linhaAlvo, 8).setValue(nomeArquivoFinal);

    Logger.log(`✔ Tópico concluído com sucesso: ${nomeArquivoFinal} em ${duracaoFormatada}`);

  } catch (err) {
    Logger.log(`Falha ao processar: ${err.message}`);
    const duracaoSegundos = Math.round((new Date() - tInicio) / 1000);
    const min = Math.floor(duracaoSegundos / 60);
    const seg = duracaoSegundos % 60;
    const duracaoFormatada = min > 0 ? `${min}m ${seg}s` : `${seg}s`;

    planilha.getRange(linhaAlvo, 5).setValue("Pendente").setBackground("#f4cccc");
    planilha.getRange(linhaAlvo, 7).setValue(`Erro: ${err.message} (${duracaoFormatada})`);
  } finally {
    // 3. Checagem final garantida: qualquer status diferente de "Concluído" permanece como "Pendente" (#f4cccc)
    const statusFinal = planilha.getRange(linhaAlvo, 5).getValue();
    if (statusFinal !== "Concluído") {
      planilha.getRange(linhaAlvo, 5).setValue("Pendente").setBackground("#f4cccc");
    }
  }
}
```