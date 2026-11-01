# DINGLI_EXPLICACOES.md
**Documentação Operacional e Arquitetura do Gerador de Explicações Didáticas - Dìnglì**

---

## 1. Visão Geral e Fluxo Operacional
O ecossistema de geração de explicações pedagógicas do Dìnglì opera de forma 100% autônoma e em nuvem via **Google Apps Script (GAS)** integrado ao **Google Drive**, eliminando necessidade de terminal local, máquina ligada ou intervenção manual durante a produção em lote.

### O Fluxo em 4 Passos
1. **Alimentação da Fila:** O usuário registra a linha na planilha de controle informando o par (ex: `pi_pt`), nível (ex: `B2`), tópico e o status `Pendente`.
2. **Disparo Programado:** Em intervalos fixos (ou execução manual), o gatilho automático (*time-driven trigger*) do GAS executa o script na nuvem sem depender de máquina local ligada.
3. **Processamento Especializado:** O motor lê a tarefa pendente, busca as 30 frases diretamente na tabela `sentences` do Supabase via REST API, carrega as regras e o padrão ouro da `MatrizPares.gs` e aciona a API do Gemini em cascata com retentativas.
4. **Finalização e Arquivamento:** O script valida a estrutura do JSON (garantindo formato de objeto plano), grava o arquivo final diretamente na pasta de destino no Google Drive e atualiza a planilha de controle para `Concluído` com timestamp e nome do arquivo gerado.

---

## 2. Componentes no Google Apps Script (GAS)

O projeto no GAS é dividido em 3 arquivos com responsabilidades estritamente isoladas:

### A. `Config.gs`
Centraliza as credenciais de acesso, modelos de IA e identificadores de ambiente:
- Chave de API do Gemini (`GEMINI_API_KEY`) e lista de modelos em cascata (`GEMINI_MODELS`).
- Credenciais da REST API do Supabase (`SUPABASE_URL` e `SUPABASE_KEY`).
- ID da Planilha Google de Controle (`ID_PLANILHA_CONTROLE`).
- ID da pasta de destino no Google Drive (`ID_PASTA_PRONTAS`).

### B. `MatrizPares.gs`
Manual isolado de cada um dos 42 pares de idiomas do ecossistema. Nenhum par interfere no outro. Cada entrada contém:
- Idioma de estudo e idioma de origem.
- Regras de tom, didática e proibições de jargões técnicos.
- Diretriz específica de pronúncia adaptada à fonética do idioma de origem.
- Exemplo mestre completo com o padrão ouro validado de saída (`explanation`, `breakdown`, `pronuncia`).

### C. `Motor.gs`
O executor universal do pipeline. A lógica permanece fixa e idêntica para qualquer par:
- Consulta a planilha de controle e puxa a primeira tarefa com status `Pendente`.
- Consulta a API do Supabase via `UrlFetchApp` e busca as 30 frases do tópico em tempo real.
- Monta o prompt dinâmico usando a instrução e o padrão ouro cadastrados na `MatrizPares.gs`.
- Executa a cascata Gemini com retentativa dupla e normaliza a resposta (achatando para objeto direto).
- Grava o JSON final pronto (`Nivel_Topico.json`) diretamente na pasta configurada no Drive.
- Atualiza status, timestamps e nome do arquivo na planilha de controle.

---

## 3. Infraestrutura no Google Drive

A estrutura no Drive é simplificada e padronizada da seguinte forma:

```text
[Pasta Raiz: Dingli_Gerador_Explicacoes]
├── Explicacoes_Prontas/       # JSONs finais estruturados consumidos pelo app
└── Controle_Geracao           # Planilha Google de auditoria e status da esteira
```

### Colunas da Planilha `Controle_Geracao`
- **Coluna A:** `ID_Lote` (Identificador sequencial)
- **Coluna B:** `Par` (ex: `pi_pt`, `en_pt`, `es_pt`)
- **Coluna C:** `Nivel` (ex: `A1`, `A2`, `B1`, `B2`)
- **Coluna D:** `Topico` (ex: `Conceitos Abstratos`)
- **Coluna E:** `Status` (`Pendente`, `Em Processamento`, `Concluído`, `Erro`)
- **Coluna F:** `Data_Inicio` (Timestamp do início da geração)
- **Coluna G:** `Data_Conclusao` (Timestamp do término)
- **Coluna H:** `Nome_Arquivo_Final` (ex: `B2_Conceitos Abstratos.json`)

---

## 4. Matriz Piloto: Mandarim Pinyin para Português (`pi_pt`)

### 4.1 Proibição Absoluta de Jargões
- **Termos gramaticais proibidos:** canônica, sintagma, elisão, clítico, próclise, ênclise, anafórico, deítico, pretérito, acusativo, dativo, genitivo, declinação, desinência, partícula aspectual, classificador nominal, cópula, oração subordinada.
- **Termos fonéticos proibidos:** fricativa, oclusiva, bilabial, alveolar, velar, glotal, liaison, schwa, flap, apócope, fonema, alofone, IPA.

### 4.2 Diretrizes por Campo

#### 1. `explanation`
- Texto corrido em **parágrafo único** (sem quebras de linha).
- Mapeamento direto de cada bloco de significado: termo em português $\rightarrow$ correspondente em `Hanzi (Pinyin)` $\rightarrow$ explicação direta do sentido prático e literal.

#### 2. `breakdown`
- Decomposição exaustiva de todos os blocos significativos da frase.
- Formato do item:
  - `word`: `"Bloco em Hanzi (Pinyin)"`
  - `meaning`: `"Tradução — Caractere 1 (pinyin): significado; Caractere 2 (pinyin): significado. Sentido literal: '...'."`

#### 3. `pronuncia`
- Texto corrido explicando a pronúncia de **todas as partes da frase** de maneira simples e próxima.
- Comparações com sons reais do português e referências físicas diretas (posição dos lábios, língua no céu da boca, ar soprado).
- Fechamento obrigatório na última linha com a frase transcrita do jeito que se lê em português:  
  `Leia: [transcrição adaptada ao português]`

---

### 4.3 Exemplo Padrão Ouro (`pi_pt` - Frase 1171)

```json
{
  "1171": {
    "explanation": "Para \"a globalização\", o mandarim vai direto ao ponto com 全球化 (Quánqiúhuà), sem precisar da palavra \"conceito\". O nosso \"fundamentalmente\" vira 从根本上 (cóng gēnběn shàng), que significa ao pé da letra \"a partir da raiz\". O verbo \"alterou\" vem logo em seguida com 改变了 (gǎibiàn le), onde a partícula \"le\" crava que a mudança já se consolidou na realidade. Por fim, \"a maneira como vivemos\" é expressa por 人类的生活方式 (rénlèi de shēnghuó fāngshì), que ao pé da letra é \"o estilo de vida da humanidade\".",
    "breakdown": [
      {
        "word": "全球化 (Quánqiúhuà)",
        "meaning": "Globalização — 全 (quán): todo / inteiro; 球 (qiú): globo / esfera (o planeta Terra); 化 (huà): sufixo de transformação (-ização). Sentido literal: 'tornar o globo um só'."
      },
      {
        "word": "从根本上 (cóng gēnběn shàng)",
        "meaning": "Pela raiz / Fundamentalmente — 从 (cóng): a partir de / desde; 根本 (gēnběn): raiz, base; 上 (shàng): no plano de / no aspecto de. Sentido literal: 'a partir do plano da raiz'."
      },
      {
        "word": "改变了 (gǎibiàn le)",
        "meaning": "Alterou / Mudou — 改 (gǎi): mudar / alterar; 变 (biàn): transformar-se; 了 (le): marca que a transformação se consolidou na realidade."
      },
      {
        "word": "人类的 (rénlèi de)",
        "meaning": "Da humanidade — 人 (rén): pessoa / humano; 类 (lèi): tipo / espécie / categoria; 的 (de): conector de posse equivalente ao 'de'."
      },
      {
        "word": "生活方式 (shēnghuó fāngshì)",
        "meaning": "Modo de vida — 生活 (shēnghuó): vida / viver no dia a dia; 方式 (fāngshì): método / formato / jeito de fazer. Sentido literal: 'o formato de vida'."
      }
    ],
    "pronuncia": "Comece em 全球化 (Quánqiúhuà) fazendo o \"qu\" e o \"qi\" com som de \"tch\" bem soprado soltando bastante ar (\"tchiuán-tchiôu\") e descendo firme a voz no \"rruá\". Em 从 (cóng), ataque com som de \"ts\" como em pizza subindo o tom (\"tsông\"), e passe por 根本 (gēnběn) dizendo um \"guên\" plano e reto e um \"bên\" que desce e sobe a entonação, travando em 上 (shàng) com a língua virada para trás num \"châng\" que cai com força. Em 改变了 (gǎibiàn le), o \"gái\" desce e sobe a voz, o \"biên\" cai seco e o \"le\" morre rápido e sem peso como um \"lê\" murcho. Para 人类的 (rénlèi de), enrole a ponta da língua em direção ao céu da boca para o \"r\" soar como uma mistura suave de \"j\" com \"r\" em \"jên\", desça o tom firme em \"lêi\" e solte o \"de\" bem apagado. Feche com 生活方式 (shēnghuó fāngshì) mantendo o \"chêng\" reto e alto, o \"rruó\" subindo a voz como quem faz uma pergunta, o \"fāng\" aberto e longo, e curve a ponta da língua no céu da boca em \"shì\" para soltar um \"chí\" seco e firme.\nLeia: Tchiuán-tchiôu-rruá tsông guên-bên châng, gái-biên-lê jên-lêi-dê chêng-rruó fāng-chí."
  }
}
```

---

## 5. Diretrizes de Governança para Novos Pares

1. **Escala:** Serão contemplados 42 pares de idiomas, totalizando 1.680 tópicos e 50.400 frases explicadas.
2. **Isolamento de Código:** A adição de novos pares deve ser feita **estritamente em `MatrizPares.gs`**, sem modificar o motor `Motor.gs` nem as configurações centrais em `Config.gs`.
3. **Padrão Obrigatório:** Cada par adicionado deve ter 1 tópico testado e validado visualmente antes de ser inserido na rotina automática de execução periódica.

---

## 6. Template Oficial de Código (`MatrizPares.gs`)

Toda nova entrada adicionada ao arquivo `MatrizPares.gs` DEVE seguir estritamente este esqueleto de chaves:

```javascript
const MATRIZ_PARES = {
  // Substitua [par_estudo_origem] pela chave oficial (ex: fr_pt, en_pt, es_pt, it_pt)
  par_estudo_origem: {
    nomeEstudo: "Nome do Idioma de Estudo",
    nomeOrigem: "Nome do Idioma Nativo do Aluno",
    instrucaoGeral: `Você é um professor fluente em [Idioma Origem] e nativo em [Idioma Estudo].
Seu papel é explicar frases em [Idioma Estudo] para alunos que falam [Idioma Origem] de forma simples, direta e sem nenhum termo técnico de gramática ou fonética.

PROIBIÇÃO ABSOLUTA DE JARGÕES:
- Gramática: canônica, sintagma, elisão, clítico, próclise, ênclise, anafórico, deítico, pretérito, acusativo, dativo, genitivo, declinação, desinência, partícula aspectual, classificador nominal, cópula, oração subordinada.
- Fonética: fricativa, oclusiva, bilabial, alveolar, velar, glotal, liaison, schwa, flap, apócope, fonema, alofone, IPA.

REGRAS OBRIGATÓRIAS POR CAMPO:
1. "explanation": Parágrafo único contínuo (sem quebras de linha). Mapeie os blocos principais: termo nativo -> correspondente na língua de estudo -> lógica prática e sentido real.
2. "breakdown": Array com cada bloco significativo e vocabulário, explicando pedaço por pedaço e sentido literal.
3. "pronuncia": Texto corrido com referências físicas (boca, língua, ar) comparando com sons conhecidos do aluno. Na última linha, transcrição adaptada obrigatória:
Leia: [transcrição adaptada]`,
    exemploMestre: {
      explanation: "Texto do padrão ouro...",
      breakdown: [
        { "word": "Termo", "meaning": "Significado e sentido literal" }
      ],
      pronuncia: "Dicas práticas...\nLeia: Transcricao aproximada"
    }
  }
};
```

---

## 7. Arquivos no GAS

### A. Motor.gs

```javascript
function chamarGeminiCascata(payload) {
  for (let m = 0; m < CONFIG.GEMINI_MODELS.length; m++) {
    const modelCandidate = CONFIG.GEMINI_MODELS[m];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelCandidate}:generateContent?key=${encodeURIComponent(CONFIG.GEMINI_API_KEY)}`;

    Logger.log(`[GEMINI] Tentando modelo: ${modelCandidate}...`);

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = UrlFetchApp.fetch(url, {
          method: "post",
          contentType: "application/json",
          payload: JSON.stringify(payload),
          muteHttpExceptions: true
        });

        const code = response.getResponseCode();
        if (code === 200) {
          const json = JSON.parse(response.getContentText());
          let rawText = json.candidates[0].content.parts[0].text.trim();
          rawText = rawText.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
          Logger.log(`[GEMINI SUCESSO] Resposta gerada via ${modelCandidate}.`);
          return JSON.parse(rawText);
        } else {
          Logger.log(`[GEMINI] ${modelCandidate} retornou HTTP ${code} na tentativa ${attempt}.`);
        }
      } catch (e) {
        Logger.log(`[GEMINI] Falha no ${modelCandidate} (Tentativa ${attempt}): ${e.message}`);
      }
      Utilities.sleep(1500);
    }

    Logger.log(`[GEMINI FALLBACK] ${modelCandidate} esgotou tentativas. Pulando para o próximo...`);
  }

  Logger.log(`[GEMINI ERRO CRÍTICO] Nenhum modelo da cascata respondeu.`);
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
    throw new Error(`Falha ao consultar Supabase: HTTP ${response.getResponseCode()}`);
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

function processarProximoTopico() {
  const planilha = SpreadsheetApp.openById(CONFIG.ID_PLANILHA_CONTROLE).getActiveSheet();
  const dados = planilha.getDataRange().getValues();

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

  const matriz = MATRIZ_PARES[tarefa.par];
  if (!matriz) {
    Logger.log(`Erro: Par '${tarefa.par}' não cadastrado na MatrizPares.`);
    planilha.getRange(linhaAlvo, 5).setValue("Erro: Matriz Inexistente");
    return;
  }

  planilha.getRange(linhaAlvo, 5).setValue("Em Processamento");
  planilha.getRange(linhaAlvo, 6).setValue(new Date());

  try {
    Logger.log(`Buscando frases do Supabase para [${tarefa.nivel}] ${tarefa.topico} (${tarefa.par})...`);
    const frasesLote = obterFrasesSupabase(tarefa.par, tarefa.nivel, tarefa.topico);

    if (!frasesLote || frasesLote.length === 0) {
      throw new Error("Nenhuma frase retornada pelo Supabase para este tópico.");
    }

    const prompt = `${matriz.instrucaoGeral}

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
${JSON.stringify({ "1171": matriz.exemploMestre }, null, 2)}

LOTE DE FRASES DO TÓPICO A PROCESSAR:
${JSON.stringify(frasesLote, null, 2)}`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    };

    const jsonResultado = chamarGeminiCascata(payload);

    if (!jsonResultado) {
      planilha.getRange(linhaAlvo, 5).setValue("Erro: Falha na API");
      return;
    }

    // Blindagem de formato: achata se for array ou desempacota chave externa caso a IA envolva o retorno
    let jsonFinal = jsonResultado;
    if (Array.isArray(jsonResultado)) {
      jsonFinal = {};
      jsonResultado.forEach(item => {
        Object.assign(jsonFinal, item);
      });
    } else if (typeof jsonResultado === 'object' && jsonResultado !== null) {
      const chaves = Object.keys(jsonResultado);
      if (chaves.length === 1 && typeof jsonResultado[chaves[0]] === 'object' && !jsonResultado[String(frasesLote[0].id)]) {
        const primeiroValor = jsonResultado[chaves[0]];
        if (Array.isArray(primeiroValor)) {
          jsonFinal = {};
          primeiroValor.forEach(item => Object.assign(jsonFinal, item));
        } else {
          jsonFinal = primeiroValor;
        }
      }
    }

    const nomeArquivoFinal = `${tarefa.nivel}_${tarefa.topico}.json`;
    const pastaProntas = DriveApp.getFolderById(CONFIG.ID_PASTA_PRONTAS);
    pastaProntas.createFile(nomeArquivoFinal, JSON.stringify(jsonFinal, null, 2), MimeType.PLAIN_TEXT);

    planilha.getRange(linhaAlvo, 5).setValue("Concluído");
    planilha.getRange(linhaAlvo, 7).setValue(new Date());
    planilha.getRange(linhaAlvo, 8).setValue(nomeArquivoFinal);

    Logger.log(`✔ Tópico concluído com sucesso: ${nomeArquivoFinal}`);

  } catch (err) {
    Logger.log(`Falha ao processar: ${err.message}`);
    planilha.getRange(linhaAlvo, 5).setValue(`Erro: ${err.message}`);
  }
}
```

### B. MatrizPares.gs

```javascript
const MATRIZ_PARES = {
  pi_pt: {
    nomeEstudo: "Mandarim (Pinyin)",
    nomeOrigem: "Português",
    instrucaoGeral: `Você é um professor fluente em Português e com pronúncia de nativo em Mandarim (Pinyin).
Seu papel é explicar frases em Mandarim para alunos que falam Português de forma simples, direta e sem nenhum termo técnico de gramática ou fonética.

PROIBIÇÃO ABSOLUTA DE JARGÕES:
- Gramática: canônica, sintagma, elisão, clítico, próclise, ênclise, anafórico, deítico, pretérito, acusativo, dativo, genitivo, declinação, desinência, partícula aspectual, classificador nominal, cópula, oração subordinada.
- Fonética: fricativa, oclusiva, bilabial, alveolar, velar, glotal, liaison, schwa, flap, apócope, fonema, alofone, IPA.

REGRAS OBRIGATÓRIAS POR CAMPO:
1. "explanation": Parágrafo único contínuo (sem quebras de linha). Mapeie os blocos: termo em português -> correspondente em Hanzi (Pinyin) -> sentido prático/literal.
2. "breakdown": Array com cada bloco significativo, decompondo cada caractere individual com seu significado, e finalizando com o sentido literal do bloco.
3. "pronuncia": Texto corrido explicando a pronúncia de TODAS as partes da frase com referências a sons do português e posições físicas (língua, lábios, ar). Na última linha, coloque obrigatoriamente a frase completa para leitura fonética direta no formato:
Leia: [transcrição adaptada ao português]`,
    exemploMestre: {
      explanation: "Para \"a globalização\", o mandarim vai direto ao ponto com 全球化 (Quánqiúhuà), sem precisar da palavra \"conceito\". O nosso \"fundamentalmente\" vira 从根本上 (cóng gēnběn shàng), que significa ao pé da letra \"a partir da raiz\". O verbo \"alterou\" vem logo em seguida com 改变了 (gǎibiàn le), onde a partícula \"le\" crava que a mudança já se consolidou na realidade. Por fim, \"a maneira como vivemos\" é expressa por 人类的生活方式 (rénlèi de shēnghuó fāngshì), que ao pé da letra é \"o estilo de vida da humanidade\".",
      breakdown: [
        {
          word: "全球化 (Quánqiúhuà)",
          meaning: "Globalização — 全 (quán): todo / inteiro; 球 (qiú): globo / esfera (o planeta Terra); 化 (huà): sufixo de transformação (-ização). Sentido literal: 'tornar o globo um só'."
        },
        {
          word: "从根本上 (cóng gēnběn shàng)",
          meaning: "Pela raiz / Fundamentalmente — 从 (cóng): a partir de / desde; 根本 (gēnběn): raiz, base; 上 (shàng): no plano de / no aspecto de. Sentido literal: 'a partir do plano da raiz'."
        },
        {
          word: "改变了 (gǎibiàn le)",
          meaning: "Alterou / Mudou — 改 (gǎi): mudar / alterar; 变 (biàn): transformar-se; 了 (le): marca que a transformação se consolidou na realidade."
        },
        {
          word: "人类的 (rénlèi de)",
          meaning: "Da humanidade — 人 (rén): pessoa / humano; 类 (lèi): tipo / espécie / categoria; 的 (de): conector de posse equivalente ao 'de'."
        },
        {
          word: "生活方式 (shēnghuó fāngshì)",
          meaning: "Modo de vida — 生活 (shēnghuó): vida / viver no dia a dia; 方式 (fāngshì): método / formato / jeito de fazer. Sentido literal: 'o formato de vida'."
        }
      ],
      pronuncia: "Comece em 全球化 (Quánqiúhuà) fazendo o \"qu\" e o \"qi\" com som de \"tch\" bem soprado soltando bastante ar (\"tchiuán-tchiôu\") e descendo firme a voz no \"rruá\". Em 从 (cóng), ataque com som de \"ts\" como em pizza subindo o tom (\"tsông\"), e passe por 根本 (gēnběn) dizendo um \"guên\" plano e reto e um \"bên\" que desce e sobe a entonação, travando em 上 (shàng) com a língua virada para trás num \"châng\" que cai com força. Em 改变了 (gǎibiàn le), o \"gái\" desce e sobe a voz, o \"biên\" cai seco e o \"le\" morre rápido e sem peso como um \"lê\" murcho. Para 人类的 (rénlèi de), enrole a ponta da língua em direção ao céu da boca para o \"r\" soar como uma mistura suave de \"j\" com \"r\" em \"jên\", desça o tom firme em \"lêi\" e solte o \"de\" bem apagado. Feche com 生活方式 (shēnghuó fāngshì) mantendo o \"chêng\" reto e alto, o \"rruó\" subindo a voz como quem faz uma pergunta, o \"fāng\" aberto e longo, e curve a ponta da língua no céu da boca em \"shì\" para soltar um \"chí\" seco e firme.\nLeia: Tchiuán-tchiôu-rruá tsông guên-bên châng, gái-biên-lê jên-lêi-dê chêng-rruó fāng-chí."
    }
  },

  en_pt: {
    nomeEstudo: "Inglês",
    nomeOrigem: "Português",
    instrucaoGeral: `Você é um professor fluente em Português e com pronúncia de nativo em Inglês.
Seu papel é explicar frases em Inglês para alunos que falam Português de forma simples, direta, acolhedora e sem nenhum termo técnico de gramática ou fonética.

PROIBIÇÃO ABSOLUTA DE JARGÕES:
- Gramática: canônica, sintagma, elisão, clítico, próclise, ênclise, anafórico, deítico, pretérito, acusativo, dativo, genitivo, declinação, desinência, partícula aspectual, oração subordinada, particípio, transitividade, adjunto adverbial.
- Fonética: fricativa, oclusiva, bilabial, alveolar, velar, glotal, liaison, schwa, flap, apócope, fonema, alofone, IPA.

REGRAS OBRIGATÓRIAS POR CAMPO:
1. "explanation": Parágrafo único contínuo (sem quebras de linha). Explique o raciocínio prático de como nativos do inglês pensam a frase em comparação com o português, destacando a ordem natural das palavras, contrações e sentido real.
2. "breakdown": Array com cada bloco significativo e vocabulário da frase (incluindo preposições, phrasal verbs e conectores). Mostre a tradução direta e o sentido prático/literal de cada pedaço.
3. "pronuncia": Texto corrido explicando a pronúncia de TODAS as partes da frase com referências físicas diretas (posição da língua entre os dentes para o "th", língua curvada no céu da boca para o "r", letras finais que morrem sem soltar vogal e como juntar o final de uma palavra com o início da outra). Na última linha, coloque obrigatoriamente a frase completa para leitura fonética direta no formato:
Leia: [transcrição adaptada ao português]`,
    exemploMestre: {
      explanation: "Para 'o conceito de globalização', o inglês usa 'The concept of globalization', ligando as palavras em um fluxo contínuo. O nosso 'fundamentalmente' vira 'fundamentally', que vem logo antes da ação para enfatizar o verbo. A alteração no passado é marcada por 'altered', mostrando que a estrutura das coisas mudou. Por fim, 'a maneira como vivemos' é expressa de forma muito mais enxuta por 'the way we live', sem precisar colocar palavras extras como 'como' ou 'na qual'.",
      breakdown: [
        {
          word: "The concept of",
          meaning: "O conceito de — The: o; concept: conceito / ideia estruturada; of: de."
        },
        {
          word: "globalization",
          meaning: "Globalização — global: mundial / relativo ao planeta todo; -ization: terminação que equivale ao nosso '-ização'."
        },
        {
          word: "fundamentally",
          meaning: "Fundamentalmente / Na raiz — fundamental: essencial / base de algo; -ly: terminação que equivale ao nosso '-mente'."
        },
        {
          word: "altered",
          meaning: "Alterou / Modificou — forma no passado do verbo to alter (mudar)."
        },
        {
          word: "the way",
          meaning: "A maneira / O jeito — literalmente 'o caminho' ou 'a forma'."
        },
        {
          word: "we live",
          meaning: "Nós vivemos — we: nós; live: viver / ter o dia a dia."
        }
      ],
      pronuncia: "Comece em 'The' colocando a pontinha da língua levemente entre os dentes da frente para soltar um som de 'D' vibrado com ar ('dhê'). Em 'concept of', emende o 't' final direto no 'of', falando tudo junto como 'kón-sép-tóv', com som de 'v' suave no fim. Na palavra 'globalization', marque o ritmo com 'glôu-bê-lai-ZÊI-chân', caprichando no 'zêi' mais forte e fechando o final com a boca relaxada num 'chân' curto. Em 'fundamentally', solte o início pelo nariz ('fan-dê-MÊN-tê-li'). Em 'altered', curve a ponta da língua em direção ao céu da boca para fazer o 'r' típico americano ('ÓL-têrd'), sem pronunciar nenhum 'e' no final. Conclua grudando 'the way we live' como um bloco só: faça o 'th' com a língua nos dentes ('dhê'), o 'uei' aberto e feche com 'uí lív', travando a voz seco no 'v'.\nLeia: Dhê kón-sép-tóv glôu-bê-lai-zêi-chân fan-dê-mên-tê-li ól-têrd dhê uêi uí lív."
    }
  }
};
```