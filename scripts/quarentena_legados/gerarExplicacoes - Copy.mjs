import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from '../src/supabaseClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = "SUA_CHAVE_GEMINI_AQUI";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

// Parâmetros de idioma e filtro via linha de comando (padrão: fr e pt)
const IDIOMA_ESTUDO = process.argv[2] || 'fr';
const IDIOMA_ORIGEM = process.argv[3] || 'pt';
const FILTRO_TOPICO = process.argv[4] || null;

const NOMES_IDIOMAS = {
  fr: 'Francês', en: 'Inglês', es: 'Espanhol',
  it: 'Italiano', ge: 'Alemão', pt: 'Português',
  zh: 'Mandarim', pi: 'Mandarim (Pinyin)'
};

// Lista de termos acadêmicos e fonéticos estritamente proibidos
const PALAVRAS_PROIBIDAS = [
  "canônica", "canônico", "causativo", "sintagma", "elidido", "elisão",
  "clítico", "próclise", "ênclise", "anafórico", "deítico", "pretérito",
  "inversão interrogativa", "particípio adjetivado", "oração subordinada",
  "apresentativo", "descontínua", "eufônica", "eufônico", "locução adverbial",
  "acusativo", "dativo", "genitivo", "declinação", "desinência",
  "partícula aspectual", "classificador nominal", "cópula",
  "fricativa", "oclusiva", "bilabial", "alveolar", "velar", "glotal",
  "liaison", "schwa", "flap", "apócope", "fonema", "alofone", "ipa"
];

// Exemplos que servem de modelo obrigatório de tom e profundidade
const EXEMPLOS_PADRAO_OURO = `
Exemplo 1:
Frase: "S'il te plaît, parle lentement."
Tradução: "Por favor, fale devagar."
Saída:
{
  "explanation": "O clássico 'por favor' do francês (s'il te plaît) significa ao pé da letra 'se isso te agrada'. Como a conversa é informal, o verbo falar (parle) entra no modo de pedido, e a letra 's' do final é descartada. A palavra 'lentement' junta 'lente' com o sufixo '-ment' (o nosso '-mente').",
  "breakdown": [
    { "word": "S'il te plaît", "meaning": "por favor (jeito informal usado com amigos e conhecidos)" },
    { "word": "parle", "meaning": "fale / fala (pedido direto, sem o 's' no final)" },
    { "word": "lentement", "meaning": "devagar / lentamente" }
  ],
  "pronuncia": "Em 's'il te plaît', o som sai direto como 'sil-te-plê' (o 't' final morre e o 'aît' vira som de 'ê'). Em 'parle', o 'R' arranha leve no fundo da garganta e o 'e' final não se fala ('parl'). Feche com 'lan-te-man', com o som saindo pelo nariz e sem pronunciar o último 't'."
}

Exemplo 2:
Frase: "Il n'est pas mon frère."
Tradução: "Ele não é meu irmão."
Saída:
{
  "explanation": "Para dizer 'não' com verbos em francês, a língua abraça a ação com duas peças: o 'n'' vem antes (encurtado porque 'est' começa com vogal) e o 'pas' vem logo em seguida. O 'mon' funciona exatamente como o nosso 'meu'.",
  "breakdown": [
    { "word": "Il", "meaning": "Ele" },
    { "word": "n'", "meaning": "primeira parte do 'não' (encurtada antes de vogal)" },
    { "word": "est", "meaning": "é (do verbo être)" },
    { "word": "pas", "meaning": "segunda parte que fecha a negação" },
    { "word": "mon", "meaning": "meu" },
    { "word": "frère", "meaning": "irmão" }
  ],
  "pronuncia": "Aqui você gruda as palavras: 'Il n'est pas' soa tudo junto como 'il-né-pá' (o 's' de 'est' e o 's' de 'pas' são mudos). Em 'mon', faça a boca redonda para o som nasal. E em 'frère', capriche no 'R' arranhado e pare direto na consoante: fale 'frér', sem soltar nenhum 'i' no final."
}
`;

function aguardar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function validarTextoSemJargao(texto) {
  const textoMin = texto.toLowerCase();
  for (const termo of PALAVRAS_PROIBIDAS) {
    // Procura o termo como palavra isolada para não travar em palavras como "principal"
    const regex = new RegExp(`\\b${termo.toLowerCase()}\\b`, 'i');
    if (regex.test(textoMin)) {
      return { valido: false, termo };
    }
  }
  return { valido: true };
}

async function chamarGemini(blocoFrases, tentativa = 1) {
  const nomeAlvo = NOMES_IDIOMAS[IDIOMA_ESTUDO] || IDIOMA_ESTUDO;
  const nomeBase = NOMES_IDIOMAS[IDIOMA_ORIGEM] || IDIOMA_ORIGEM;

  const regraMandarim = (IDIOMA_ESTUDO === 'zh' || IDIOMA_ESTUDO === 'pi')
    ? '\n   - Para o mandarim, no campo "word" do breakdown, coloque SEMPRE o caractere seguido do pinyin com tons entre parênteses. Exemplo: "保护 (bǎohù)".'
    : '';

  const prompt = `
Você é um mentor experiente e muito didático, fluente em ${nomeBase} e com pronúncia e ritmo de nativo em ${nomeAlvo}.
Seu papel é explicar frases em ${nomeAlvo} para alunos que falam ${nomeBase}, de forma prática, direta e acolhedora — como um amigo ensinando ao lado da mesa a lógica do dia a dia e o "bizu" real da pronúncia.

IMPORTANTE: Toda a sua resposta (explicações, vocabulário e pronúncia) deve ser redigida estritamente em ${nomeBase}.
PROIBIÇÃO ABSOLUTA DE JARGÕES TÉCNICOS: ${PALAVRAS_PROIBIDAS.join(', ')}.

Regras obrigatórias:
1. explanation: Curta e direta (2 a 4 linhas), explicando o raciocínio real de como ${nomeAlvo} monta a ideia em comparação com a lógica de ${nomeBase}, sem termos teóricos.
2. breakdown: Decomposição EXAUSTIVA de 100% das palavras e partículas da frase. Nenhuma palavra ou elemento gramatical pode ficar de fora (array de objetos com "word" e "meaning").${regraMandarim}
3. pronuncia: Um parágrafo curto e fluido (2 a 4 linhas) com dicas práticas de fala:
   - Destaque letras que não são faladas (letras mudas).
   - Mostre como emendar os sons entre palavras vizinhas para a frase fluir em um bloco só.
   - Use referências físicas diretas (posição dos lábios, língua nos dentes, ar na garganta) comparando com sons conhecidos de ${nomeBase}.
   - Proibido usar símbolos do alfabeto fonético (IPA); use aproximações sonoras intuitivas adaptadas para quem lê em ${nomeBase}.
4. Formato: Retorne ESTRITAMENTE um objeto JSON onde cada chave é o ID da frase (como string) contendo "explanation", "breakdown" e "pronuncia".

${EXEMPLOS_PADRAO_OURO}

Gere agora para este lote:
${JSON.stringify(blocoFrases, null, 2)}
`;

  try {
    const resposta = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
      })
    });

    if (!resposta.ok) {
      throw new Error(`HTTP ${resposta.status}: ${await resposta.text()}`);
    }

    const data = await resposta.json();
    const textoGerado = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const jsonParsed = JSON.parse(textoGerado);

    // Auditoria para barrar jargão
    const auditoria = validarTextoSemJargao(textoGerado);
    if (!auditoria.valido) {
      if (tentativa <= 3) {
        console.warn(`[Auditoria] Jargão encontrado ('${auditoria.termo}'). Repetindo lote (tentativa ${tentativa + 1})...`);
        await aguardar(2000);
        return await chamarGemini(blocoFrases, tentativa + 1);
      }
    }

    return jsonParsed;
  } catch (err) {
    if (tentativa <= 4) {
      const is429 = err.message.includes('429');
      const tempoEspera = is429 ? 50000 : 4000;
      console.warn(`[API] ${is429 ? 'Limite de requisições atingido (429).' : 'Erro na chamada:'} Aguardando ${tempoEspera / 1000}s para retentar (tentativa ${tentativa + 1})...`);
      await aguardar(tempoEspera);
      return await chamarGemini(blocoFrases, tentativa + 1);
    }
    throw err;
  }
}

async function processarTopico(nivel, nomeTopico, frasesTopico, pastaDestino) {
  const nomeArquivo = `${nivel}_${nomeTopico}.json`;
  const caminhoArquivo = path.join(pastaDestino, nomeArquivo);

  // Checkpoint: pula arquivos já gerados com todas as frases (a menos que um tópico específico tenha sido solicitado)
  if (!FILTRO_TOPICO && fs.existsSync(caminhoArquivo)) {
    try {
      const conteudo = JSON.parse(fs.readFileSync(caminhoArquivo, 'utf-8'));
      if (Object.keys(conteudo).length >= frasesTopico.length) {
        console.log(`[Checkpoint] Pulando '${nomeArquivo}' (já completo com ${frasesTopico.length} frases).`);
        return;
      }
    } catch (e) { }
  }

  console.log(`\n======================================================`);
  console.log(`Iniciando Tópico: [${nivel}] ${nomeTopico} (${frasesTopico.length} frases)`);
  console.log(`======================================================`);

  const resultadoTopico = {};
  const TAMANHO_LOTE = 6;

  for (let i = 0; i < frasesTopico.length; i += TAMANHO_LOTE) {
    const lote = frasesTopico.slice(i, i + TAMANHO_LOTE).map(f => {
      const item = {
        id: f.id,
        [IDIOMA_ORIGEM]: f[IDIOMA_ORIGEM]
      };
      if (IDIOMA_ESTUDO === 'zh' || IDIOMA_ESTUDO === 'pi') {
        item.zh = f.zh;
        item.pi = f.pi;
      } else {
        item[IDIOMA_ESTUDO] = f[IDIOMA_ESTUDO];
      }
      return item;
    });

    const loteNum = Math.floor(i / TAMANHO_LOTE) + 1;
    const totalLotes = Math.ceil(frasesTopico.length / TAMANHO_LOTE);
    console.log(`  -> Processando lote ${loteNum}/${totalLotes} (frases ${i + 1} a ${Math.min(i + TAMANHO_LOTE, frasesTopico.length)})...`);

    const resultadoLote = await chamarGemini(lote);
    Object.assign(resultadoTopico, resultadoLote);

    // Pausa preventiva de 6 segundos entre lotes para respeitar a cota de 10 RPM
    await aguardar(6000);
  }

  fs.writeFileSync(caminhoArquivo, JSON.stringify(resultadoTopico, null, 2), 'utf-8');
  console.log(`✔ Arquivo salvo com sucesso: ${nomeArquivo}`);
}

async function iniciarEsteira() {
  const parIdiomas = `${IDIOMA_ESTUDO}_${IDIOMA_ORIGEM}`;
  const pastaDestino = path.resolve(__dirname, `../public/explicacoes/${parIdiomas}`);
  if (!fs.existsSync(pastaDestino)) {
    fs.mkdirSync(pastaDestino, { recursive: true });
  }

  const colTopicOrigem = `topic_${IDIOMA_ORIGEM}`;
  const NIVEIS = ['A1', 'A2', 'B1', 'B2'];
  const colunasAlvo = (IDIOMA_ESTUDO === 'zh' || IDIOMA_ESTUDO === 'pi') ? 'zh, pi' : IDIOMA_ESTUDO;
  const colunaFiltro = (IDIOMA_ESTUDO === 'zh' || IDIOMA_ESTUDO === 'pi') ? 'zh' : IDIOMA_ESTUDO;

  for (const nivel of NIVEIS) {
    console.log(`\n>>> Carregando frases do nível ${nivel} (${parIdiomas}) do Supabase...`);

    const colunas = `id, ${colunasAlvo}, ${IDIOMA_ORIGEM}, level, ${colTopicOrigem}`;
    const { data, error } = await supabase
      .from('sentences')
      .select(colunas)
      .eq('level', nivel)
      .not(colunaFiltro, 'is', null)
      .order('id', { ascending: true });

    if (error) {
      console.error(`Erro ao buscar dados do nível ${nivel}:`, error);
      continue;
    }

    // Agrupa as frases nos tópicos da língua nativa do aluno
    const topicosDoNivel = {};
    for (const f of data) {
      const tp = f[colTopicOrigem];
      if (!tp) continue;
      if (!topicosDoNivel[tp]) topicosDoNivel[tp] = [];
      topicosDoNivel[tp].push(f);
    }

    for (const [nomeTopico, frases] of Object.entries(topicosDoNivel)) {
      if (FILTRO_TOPICO && !nomeTopico.toLowerCase().includes(FILTRO_TOPICO.toLowerCase())) {
        continue;
      }
      await processarTopico(nivel, nomeTopico, frases, pastaDestino);
    }
  }

  console.log('\n======================================================');
  console.log('ESTEIRA CONCLUÍDA: Todos os tópicos foram processados!');
  console.log('======================================================');
}

iniciarEsteira();