import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const explicacoes = {
  "1171": {
    "explanation": "A oração segue a ordem canônica: Sujeito + Modificador Circunstancial + Verbo com aspecto consumado + Objeto complexo. A estrutura '从...上' (cóng... shàng) funciona como uma moldura que significa 'sob a perspectiva de' ou 'no aspecto de'. O '了' imediatamente após o verbo '改变' (mudar) expressa que a alteração foi concretizada.",
    "breakdown": [
      { "word": "全球化 (quánqiúhuà)", "meaning": "globalização (sufixo 化 indica processo de transformação)" },
      { "word": "的 (de)", "meaning": "partícula atributiva que liga o adjetivo ao substantivo" },
      { "word": "概念 (gàiniàn)", "meaning": "conceito / noção teórica" },
      { "word": "从 (cóng)", "meaning": "a partir de / desde" },
      { "word": "根本 (gēnběn)", "meaning": "base / raiz / essência" },
      { "word": "上 (shàng)", "meaning": "em / sobre (fechando a estrutura '从...上' = no plano / no aspecto)" },
      { "word": "改变了 (gǎibiàn le)", "meaning": "alterou / modificou (verbo 改变 + partícula de aspecto completivo 了)" },
      { "word": "我们 (wǒmen)", "meaning": "nós" },
      { "word": "的 (de)", "meaning": "partícula de posse ('nosso / de nós')" },
      { "word": "生活方式 (shēnghuó fāngshì)", "meaning": "estilo de vida / modo de viver" }
    ]
  },
  "1172": {
    "explanation": "A frase emprega o verbo causativo '让' (ràng), onde o agente causador é a tecnologia e o paciente é 'nós'. A comparação é estruturada com a fórmula '比 + Ponto de Referência + 更加 + Adjetivo', indicando elevação de grau em relação a uma situação anterior. O '了' no fim da frase não indica tempo passado, mas a instauração de uma nova realidade no presente.",
    "breakdown": [
      { "word": "人们 (rénmen)", "meaning": "as pessoas / a sociedade em geral" },
      { "word": "常说 (cháng shuō)", "meaning": "costumam dizer / frequentemente afirmam" },
      { "word": "科技 (kējì)", "meaning": "ciência e tecnologia (abreviação de 科学技术)" },
      { "word": "让 (ràng)", "meaning": "fazer com que / tornar (verbo causativo)" },
      { "word": "我们 (wǒmen)", "meaning": "nós / a nós" },
      { "word": "比 (bǐ)", "meaning": "em comparação a / do que" },
      { "word": "以前 (yǐqián)", "meaning": "antes / o passado" },
      { "word": "更加 (gèngjiā)", "meaning": "ainda mais / em grau superior" },
      { "word": "孤立 (gūlì)", "meaning": "isolados / solitários" },
      { "word": "了 (le)", "meaning": "partícula modal indicando surgimento de uma nova situação" }
    ]
  },
  "1173": {
    "explanation": "A oração é nominalizada como sujeito ('proteger o meio ambiente') seguido pelo verbo modal de dever '应该', a cópula '是' e o chengyu formal '当务之急'. A partícula de ligação '之' atua aqui no padrão clássico chinês com valor atributivo idêntico a '的'.",
    "breakdown": [
      { "word": "保护 (bǎohù)", "meaning": "proteger / preservar" },
      { "word": "环境 (huánjìng)", "meaning": "meio ambiente / entorno" },
      { "word": "应该 (yīnggāi)", "meaning": "deve / deveria (verbo modal de obrigação moral)" },
      { "word": "是 (shì)", "meaning": "ser (verbo de ligação)" },
      { "word": "我们 (wǒmen)", "meaning": "nós" },
      { "word": "的 (de)", "meaning": "marcador de posse ('nosso')" },
      { "word": "当务之急 (dāngwùzhījí)", "meaning": "tarefa urgente inadiável / máxima prioridade (chengyu de 4 caracteres)" }
    ]
  },
  "1174": {
    "explanation": "Inicia-se com '我相信' introduzindo o objeto oracional. A busca pelo saber é caracterizada como '一生的旅程', onde o classificador e numeral '一生' expressa a extensão contínua de toda a existência biológica.",
    "breakdown": [
      { "word": "我 (wǒ)", "meaning": "eu" },
      { "word": "相信 (xiāngxìn)", "meaning": "acreditar / ter convicção" },
      { "word": "追求 (zhuīqiú)", "meaning": "perseguir / buscar ativamente" },
      { "word": "知识 (zhīshi)", "meaning": "conhecimento / sabedoria acumulada" },
      { "word": "是 (shì)", "meaning": "é (cópula)" },
      { "word": "一生 (yīshēng)", "meaning": "uma vida inteira / vitalício" },
      { "word": "的 (de)", "meaning": "partícula modificadora atributiva" },
      { "word": "旅程 (lǚchéng)", "meaning": "jornada / percurso de viagem" }
    ]
  },
  "1175": {
    "explanation": "O tópico é construído pela preposição de alvo '对' (em relação a), delimitando sobre o que recai a influência ('nossa saúde mental'). O verbo causativo formal '导致' (levar a) rege a expressão progressiva '越来越多' (cada vez mais).",
    "breakdown": [
      { "word": "社交媒体 (shèjiāo méitǐ)", "meaning": "mídias sociais / redes sociais" },
      { "word": "对 (duì)", "meaning": "sobre / em relação a (preposição diretiva)" },
      { "word": "我们 (wǒmen)", "meaning": "nossa / nós" },
      { "word": "心理健康 (xīnlǐ jiànkāng)", "meaning": "saúde psicológica / saúde mental" },
      { "word": "的 (de)", "meaning": "partícula atributiva ligando o modificador a 影响" },
      { "word": "影响 (yǐngxiǎng)", "meaning": "impacto / influência" },
      { "word": "导致了 (dǎozhì le)", "meaning": "provocou / acarretou (verbo 导致 + aspecto completivo 了)" },
      { "word": "越来越 (yuè lái yuè)", "meaning": "cada vez mais (locução progressiva)" },
      { "word": "多 (duō)", "meaning": "muito / abundante" },
      { "word": "的 (de)", "meaning": "partícula modificadora de substantivo" },
      { "word": "关注 (guānzhù)", "meaning": "atenção / foco de preocupação" }
    ]
  },
  "1176": {
    "explanation": "Interrogação direta de opinião com '你认为' e partícula final '吗'. O comparativo erudito '大于' (dà yú) utiliza a preposição clássica '于' para significar 'maior que / superior a', padrão típico de debates e textos argumentativos.",
    "breakdown": [
      { "word": "你 (nǐ)", "meaning": "você" },
      { "word": "认为 (rènwéi)", "meaning": "julgar / achar / considerar (opinião ponderada)" },
      { "word": "人工智能 (réngōng zhìnéng)", "meaning": "inteligência artificial" },
      { "word": "的 (de)", "meaning": "partícula de posse e relação" },
      { "word": "好处 (hǎochu)", "meaning": "benefícios / aspectos positivos" },
      { "word": "大于 (dà yú)", "meaning": "superar / ser maior do que (forma clássica)" },
      { "word": "风险 (fēngxiǎn)", "meaning": "riscos / ameaças" },
      { "word": "吗 (ma)", "meaning": "partícula interrogativa final de sim ou não" }
    ]
  },
  "1177": {
    "explanation": "A moldura prepositiva '在...之间' estabelece o espaço de mediação entre segurança e privacidade. O complemento de resultado '找到' (zhǎodào) indica que a ação de buscar obteve sucesso em encontrar o equilíbrio.",
    "breakdown": [
      { "word": "在 (zài)", "meaning": "em / no meio de" },
      { "word": "安全 (ānquán)", "meaning": "segurança" },
      { "word": "和 (hé)", "meaning": "e (conjunção coordenativa de nomes)" },
      { "word": "隐私 (yǐnsī)", "meaning": "privacidade" },
      { "word": "之间 (zhī jiān)", "meaning": "entre / no intervalo de (fecha a estrutura 在...之间)" },
      { "word": "找到 (zhǎodào)", "meaning": "encontrar / alcançar com êxito (verbo 找 + complemento 到)" },
      { "word": "平衡 (pínghéng)", "meaning": "equilíbrio" },
      { "word": "很 (hěn)", "meaning": "muito (advérbio de intensidade / ligação predicativa)" },
      { "word": "难 (nán)", "meaning": "difícil" }
    ]
  },
  "1178": {
    "explanation": "Estrutura fixa de interesse: '对...感兴趣' (ter interesse por algo). O advérbio '一直' sinaliza uma linha contínua desde o passado até o presente, e '背后' indica o alicerce conceitual implícito.",
    "breakdown": [
      { "word": "我 (wǒ)", "meaning": "eu" },
      { "word": "一直 (yīzhí)", "meaning": "sempre / ininterruptamente" },
      { "word": "对 (duì)", "meaning": "por / em relação a" },
      { "word": "现代 (xiàndài)", "meaning": "moderna / contemporânea" },
      { "word": "艺术 (yìshù)", "meaning": "arte" },
      { "word": "背后 (bèihòu)", "meaning": "por trás de / nos bastidores de" },
      { "word": "的 (de)", "meaning": "partícula atributiva" },
      { "word": "哲学 (zhéxué)", "meaning": "filosofia" },
      { "word": "很 (hěn)", "meaning": "muito" },
      { "word": "感 (gǎn)", "meaning": "sentir" },
      { "word": "兴趣 (xìngqù)", "meaning": "interesse (formando a locução 感兴趣)" }
    ]
  },
  "1179": {
    "explanation": "Construção de necessidade ativa com '我们需要' governando o verbo transitivo '解决' (solucionar). O objeto direto é qualificado pelo termo '根本' que atua como determinante essencial de '原因' (causas raízes).",
    "breakdown": [
      { "word": "我们 (wǒmen)", "meaning": "nós" },
      { "word": "需要 (xūyào)", "meaning": "precisar / ter necessidade de" },
      { "word": "解决 (jiějué)", "meaning": "resolver / solucionar / dirimir" },
      { "word": "社会 (shèhuì)", "meaning": "social / sociedade" },
      { "word": "不公 (bù gōng)", "meaning": "injustiça / desigualdade (não justo)" },
      { "word": "的 (de)", "meaning": "marcador modificador atributivo" },
      { "word": "根本原因 (gēnběn yuányīn)", "meaning": "causas primordiais / motivos essenciais na raiz" }
    ]
  },
  "1180": {
    "explanation": "Pergunta reflexiva profunda. A cadeia de partículas '的' empilha qualificadores: primeiro 'um país/sociedade verdadeiramente bem-sucedida' e em seguida extrai o seu núcleo abstrato: '本质' (essência).",
    "breakdown": [
      { "word": "你认为 (nǐ rènwéi)", "meaning": "o que você considera / na sua visão" },
      { "word": "一个 (yīgè)", "meaning": "uma / um" },
      { "word": "真正 (zhēnzhèng)", "meaning": "genuinamente / verdadeiramente" },
      { "word": "成功的 (chénggōng de)", "meaning": "bem-sucedida / que atingiu o êxito" },
      { "word": "社会 (shèhuì)", "meaning": "sociedade" },
      { "word": "的 (de)", "meaning": "marcador de relação/posse" },
      { "word": "本质 (běnzhì)", "meaning": "essência / natureza intrínseca fundamental" },
      { "word": "是 (shì)", "meaning": "é" },
      { "word": "什么 (shénme)", "meaning": "o que / qual" }
    ]
  },
  "1181": {
    "explanation": "O predicado expressa grau absoluto de necessidade através da expressão idiomática '至关重要' (de suma relevância). O '的' no fim atua conferindo tom afirmativo categórico.",
    "breakdown": [
      { "word": "尊重 (zūnzhòng)", "meaning": "respeitar / honrar" },
      { "word": "不同 (bùtóng)", "meaning": "diferentes / distintos" },
      { "word": "国家 (guójiā)", "meaning": "nações / países" },
      { "word": "的 (de)", "meaning": "partícula atributiva ligando ao patrimônio" },
      { "word": "文化遗产 (wénhuà yíchǎn)", "meaning": "patrimônio cultural / herança cultural" },
      { "word": "是 (shì)", "meaning": "é" },
      { "word": "至关重要 (zhìguān zhòngyào)", "meaning": "vital / crucial / de importância suprema" },
      { "word": "的 (de)", "meaning": "partícula modal de afirmação categórica" }
    ]
  },
  "1182": {
    "explanation": "A partícula enfática '并' (bìng) reforça a negação '不一定', com a função de rebater uma suposição prévia errônea de que dinheiro sempre garante contentamento.",
    "breakdown": [
      { "word": "财富 (cáifù)", "meaning": "riqueza / patrimônio financeiro" },
      { "word": "并 (bìng)", "meaning": "de modo algum / enfaticamente (reforça a negação)" },
      { "word": "不一定 (bù yīdìng)", "meaning": "não necessariamente" },
      { "word": "会 (huì)", "meaning": "irá / tem a probabilidade de" },
      { "word": "带来 (dàilái)", "meaning": "trazer consigo / acarretar" },
      { "word": "幸福 (xìngfú)", "meaning": "felicidade / plenitude de vida" }
    ]
  },
  "1183": {
    "explanation": "Define a criatividade através de uma oração atributiva longa terminada no substantivo '能力'. Os verbos de processo '培养' (educar/cultivar) e '发展' (expandir) mostram a dinamicidade da habilidade.",
    "breakdown": [
      { "word": "我相信 (wǒ xiāngxìn)", "meaning": "eu tenho fé / acredito plenamente que" },
      { "word": "创造力 (chuàngzàolì)", "meaning": "capacidade criativa / criatividade" },
      { "word": "是 (shì)", "meaning": "é" },
      { "word": "可以 (kěyǐ)", "meaning": "passível de / capaz de" },
      { "word": "培养 (péiyǎng)", "meaning": "ser nutrida / cultivada" },
      { "word": "和 (hé)", "meaning": "e" },
      { "word": "发展 (fāzhǎn)", "meaning": "desenvolver / progredir" },
      { "word": "的 (de)", "meaning": "partícula atributiva ligando os verbos à 能力" },
      { "word": "能力 (nénglì)", "meaning": "habilidade / competência individual" }
    ]
  },
  "1184": {
    "explanation": "Emprega a clássica estrutura passiva formal '由...所 + Verbo', onde '由' introduz o agente ('nossas decisões do presente') e a partícula gramatical '所' antecede o particípio funcional '塑造'.",
    "breakdown": [
      { "word": "未来 (wèilái)", "meaning": "o porvir / o futuro" },
      { "word": "是 (shì)", "meaning": "é" },
      { "word": "由 (yóu)", "meaning": "por / através de (marcador do agente causador)" },
      { "word": "我们 (wǒmen)", "meaning": "nós" },
      { "word": "现在 (xiànzài)", "meaning": "presente / atualidade" },
      { "word": "的 (de)", "meaning": "partícula de ligação atributiva" },
      { "word": "决策 (juécè)", "meaning": "decisões formais / resoluções estratégicas" },
      { "word": "所 (suǒ)", "meaning": "partícula formal que antecede o verbo na passiva clássica" },
      { "word": "塑造 (shùzào)", "meaning": "moldar / forjar / esculpir" },
      { "word": "的 (de)", "meaning": "partícula final que fecha a estrutura predicativa" }
    ]
  },
  "1185": {
    "explanation": "Pergunta sobre exequibilidade dentro de um contexto sócio-econômico determinado ('在...里'). O termo abstrato '可持续性' utiliza o sufixo morfológico '性' (-dade / -ismo) que cria substantivos conceituais.",
    "breakdown": [
      { "word": "在 (zài)", "meaning": "em" },
      { "word": "消费主义 (xiāofèi zhǔyì)", "meaning": "consumismo (consumo + sufixo de doutrina/ideologia 主义)" },
      { "word": "社会 (shèhuì)", "meaning": "sociedade" },
      { "word": "里 (lǐ)", "meaning": "dentro / no interior de" },
      { "word": "可能 (kěnéng)", "meaning": "é plausível / é possível" },
      { "word": "实现 (shíxiàn)", "meaning": "concretizar / tornar real" },
      { "word": "真正的 (zhēnzhèng de)", "meaning": "autêntica / verdadeira" },
      { "word": "可持续性 (kěchíxùxìng)", "meaning": "sustentabilidade" },
      { "word": "吗 (ma)", "meaning": "partícula interrogativa final" }
    ]
  },
  "1186": {
    "explanation": "O período combina o verbo modal '应该' (dever), o verbo de esforço '努力' e o chengyu de empatia psicológica '感同身受', que significa literalmente sentir a dor ou a situação alheia no próprio corpo.",
    "breakdown": [
      { "word": "我们 (wǒmen)", "meaning": "nós" },
      { "word": "应该 (yīnggāi)", "meaning": "devemos / é imperativo moral" },
      { "word": "努力 (nǔlì)", "meaning": "empenhar-se / fazer esforços" },
      { "word": "对 (duì)", "meaning": "com / em direção a (preposição diretiva de atitude)" },
      { "word": "不同 (bùtóng)", "meaning": "diferentes / plurais" },
      { "word": "背景 (bèijǐng)", "meaning": "origens / históricos de vida" },
      { "word": "的 (de)", "meaning": "partícula atributiva que liga ao substantivo 人" },
      { "word": "人 (rén)", "meaning": "pessoas" },
      { "word": "更加 (gèngjiā)", "meaning": "mais / em grau elevado" },
      { "word": "感同身受 (gǎntóngshēnshòu)", "meaning": "empáticos / sentir profundamente junto com o outro (chengyu)" }
    ]
  },
  "1187": {
    "explanation": "Apresentação de tese direta com '我认为'. A expressão sociológica '社会流动' (ascensão e mobilidade entre classes) é colocada como o objeto sobre o qual repousa o '关键' (eixo/fator decisivo).",
    "breakdown": [
      { "word": "我 (wǒ)", "meaning": "eu" },
      { "word": "认为 (rènwéi)", "meaning": "considero / sustento a opinião de que" },
      { "word": "教育 (jiàoyù)", "meaning": "a educação / escolarização" },
      { "word": "是 (shì)", "meaning": "é" },
      { "word": "社会流动 (shèhuì liúdòng)", "meaning": "mobilidade social" },
      { "word": "的 (de)", "meaning": "partícula de ligação" },
      { "word": "关键 (guānjiàn)", "meaning": "o ponto crucial / a chave motriz" }
    ]
  },
  "1188": {
    "explanation": "O sufixo agentivo '者' cria a classe 'detentores do poder'. O verbo composto '忘记' é modalizado pelo auxiliar de probabilidade habitual '会' combinado com o advérbio de frequência '经常'.",
    "breakdown": [
      { "word": "掌权者 (zhǎngquán zhě)", "meaning": "aqueles que detêm o poder / governantes (掌 empunhar + 权 poder + 者 sufixo de pessoa)" },
      { "word": "经常 (jīngcháng)", "meaning": "frequentemente / repetidamente" },
      { "word": "会 (huì)", "meaning": "costumam / tendem a" },
      { "word": "忘记 (wàngjì)", "meaning": "esquecer / relegar" },
      { "word": "历史 (lìshǐ)", "meaning": "da história" },
      { "word": "的 (de)", "meaning": "marcador genitivo/atributivo" },
      { "word": "教训 (jiàoxùn)", "meaning": "lições / advertências morais aprendidas com o erro" }
    ]
  },
  "1189": {
    "explanation": "A expressão oracional '起到...作用' (desempenhar papel) é o padrão sintático para discutir eficácia e utilidade prática. O pronome interrogativo '什么' se intercala entre o verbo e o substantivo de resultado.",
    "breakdown": [
      { "word": "伦理 (lúnlǐ)", "meaning": "a ética / a moralidade teórica" },
      { "word": "在 (zài)", "meaning": "no / durante" },
      { "word": "新科技 (xīn kējì)", "meaning": "das novas tecnologias" },
      { "word": "的 (de)", "meaning": "partícula de relação atributiva" },
      { "word": "发展 (fāzhǎn)", "meaning": "desenvolvimento / expansão" },
      { "word": "中 (zhōng)", "meaning": "em / no decurso de (fechando 在...中)" },
      { "word": "起到 (qǐ dào)", "meaning": "desempenhar / surtir" },
      { "word": "什么 (shénme)", "meaning": "qual / que tipo de" },
      { "word": "作用 (zuòyòng)", "meaning": "papel / influência / função" }
    ]
  },
  "1190": {
    "explanation": "Construção de origem abstrata com '来自于' (decorrer de / originar-se em). A preposição '为' indica dedicação em benefício de algo, acompanhada da estrutura de comparação '比...更' (maior do que a si próprio).",
    "breakdown": [
      { "word": "真正的 (zhēnzhèng de)", "meaning": "genuína / autêntica" },
      { "word": "成就感 (chéngjiù gǎn)", "meaning": "sensação de dever cumprido / realização pessoal" },
      { "word": "来自于 (láizì yú)", "meaning": "origina-se de / advém de (com preposição formal 于)" },
      { "word": "为 (wèi)", "meaning": "em prol de / em benefício de" },
      { "word": "比 (bǐ)", "meaning": "em comparação a" },
      { "word": "自己 (zìjǐ)", "meaning": "si próprio / a própria pessoa" },
      { "word": "更 (gèng)", "meaning": "mais" },
      { "word": "伟大 (wěidà)", "meaning": "grandioso / elevado" },
      { "word": "的 (de)", "meaning": "partícula atributiva ligada a 事业" },
      { "word": "事业 (shìyè)", "meaning": "causa / empreendimento humano" },
      { "word": "做 (zuò)", "meaning": "fazer / prestar" },
      { "word": "贡献 (gòngxiàn)", "meaning": "contribuição / serviço altruísta" }
    ]
  },
  "1191": {
    "explanation": "O chengyu de 4 caracteres '前所未有' (jamais visto no passado) funciona como um modificador de alto nível para qualificar a velocidade do progresso tecnológico dentro do substantivo de época '时代'.",
    "breakdown": [
      { "word": "我们 (wǒmen)", "meaning": "nós" },
      { "word": "生活 (shēnghuó)", "meaning": "vivemos / habitamos" },
      { "word": "在 (zài)", "meaning": "em" },
      { "word": "一个 (yīgè)", "meaning": "uma / um" },
      { "word": "科技 (kējì)", "meaning": "onde a tecnologia" },
      { "word": "前所未有 (qiánsuǒwèiyǒu)", "meaning": "sem paralelo no passado / sem precedentes (chengyu)" },
      { "word": "发展 (fāzhǎn)", "meaning": "se desenvolve / avança" },
      { "word": "的 (de)", "meaning": "partícula atributiva que fecha a oração sobre 时代" },
      { "word": "时代 (shídài)", "meaning": "era / época histórica" }
    ]
  },
  "1192": {
    "explanation": "Emprega a célebre fórmula de retórica enfática '怎么...都不过分', significando textualmente 'não importa quão intensamente se afirme ou destaque, nunca será excessivo', denotando importância suprema.",
    "breakdown": [
      { "word": "我 (wǒ)", "meaning": "eu" },
      { "word": "觉得 (juéde)", "meaning": "acho / sinto intimamente que" },
      { "word": "社区 (shèqū)", "meaning": "da comunidade / do senso coletivo" },
      { "word": "的 (de)", "meaning": "marcador atributivo ligado a 重要性" },
      { "word": "重要性 (zhòngyàoxìng)", "meaning": "importância / relevância de peso" },
      { "word": "怎么 (zěnme)", "meaning": "não importa como / por mais que" },
      { "word": "强调 (qiángdiào)", "meaning": "se enfatize / se coloque em evidência" },
      { "word": "都 (dōu)", "meaning": "ainda assim (advérbio de totalidade correlativo)" },
      { "word": "不过分 (bù guòfèn)", "meaning": "não é exagero / não passa da medida" }
    ]
  },
  "1193": {
    "explanation": "Sentença condicional clássica de ação necessária: '如果...就必须' (se quisermos tal condição, então temos obrigatoriamente que agir assim). O verbo '拥抱' é usado metaforicamente para recepcionar o novo sem medo.",
    "breakdown": [
      { "word": "如果 (rúguǒ)", "meaning": "se (conjunção condicional)" },
      { "word": "我们 (wǒmen)", "meaning": "nós" },
      { "word": "想 (xiǎng)", "meaning": "almejarmos / desejarmos" },
      { "word": "个人 (gèrén)", "meaning": "individual / pessoal" },
      { "word": "成长 (chéngzhǎng)", "meaning": "amadurecer / crescer" },
      { "word": "就 (jiù)", "meaning": "então (conector lógico obrigatório)" },
      { "word": "必须 (bìxū)", "meaning": "é indispensável / torna-se compulsório" },
      { "word": "拥抱 (yǒngbào)", "meaning": "abraçar / aceitar de braços abertos" },
      { "word": "变化 (biànhuà)", "meaning": "as mudanças / a impermanência" }
    ]
  },
  "1194": {
    "explanation": "Pergunta reflexiva global. O superlativo relativo '最' se acopla ao adjetivo urgente '紧迫', enquanto o verbo '面临' (estar face a face com) define os obstáculos imediatos postos diante da civilização.",
    "breakdown": [
      { "word": "你认为 (nǐ rènwéi)", "meaning": "na sua apreciação / você julga" },
      { "word": "当今 (dāngjīn)", "meaning": "atual / contemporâneo" },
      { "word": "世界 (shìjiè)", "meaning": "o mundo" },
      { "word": "面临 (miànlín)", "meaning": "enfrenta / depara-se frontalmente com" },
      { "word": "的 (de)", "meaning": "partícula atributiva qualificadora" },
      { "word": "最 (zuì)", "meaning": "o mais (marcador de superlativo absoluto)" },
      { "word": "紧迫 (jǐnpò)", "meaning": "urgente / premente / crítico" },
      { "word": "的 (de)", "meaning": "partícula atributiva ligada ao substantivo 问题" },
      { "word": "问题 (wèntí)", "meaning": "problema / desafio estrutural" },
      { "word": "是 (shì)", "meaning": "é" },
      { "word": "什么 (shénme)", "meaning": "o quê" }
    ]
  },
  "1195": {
    "explanation": "O substantivo abstrato '大局观' refere-se ao entendimento amplo do conjunto e das prioridades maiores (a perspectiva panorâmica). O verbo modal '能' expressa essa capacidade natural concedida pelo meio ambiente.",
    "breakdown": [
      { "word": "我 (wǒ)", "meaning": "eu" },
      { "word": "总是 (zǒng shì)", "meaning": "sempre / invariavelmente" },
      { "word": "认为 (rènwéi)", "meaning": "sustento o ponto de vista de que" },
      { "word": "大自然 (dà zìrán)", "meaning": "a mãe natureza / o mundo natural" },
      { "word": "能 (néng)", "meaning": "é capaz de / tem o dom de" },
      { "word": "给 (gěi)", "meaning": "conceder / dar a" },
      { "word": "我们 (wǒmen)", "meaning": "nós" },
      { "word": "一种 (yī zhǒng)", "meaning": "uma espécie de / um tipo de" },
      { "word": "大局观 (dàjúguān)", "meaning": "visão do panorama geral / senso de perspectiva cósmica" }
    ]
  },
  "1196": {
    "explanation": "Coordenação balanceada '在 A 和 B 中' abrangendo a esfera íntima e a esfera do trabalho. O advérbio '都' sintetiza que em ambas as esferas a retidão interior ('正直') é indispensável.",
    "breakdown": [
      { "word": "在 (zài)", "meaning": "em / tanto em" },
      { "word": "私人 (sīrén)", "meaning": "privada / pessoal" },
      { "word": "和 (hé)", "meaning": "quanto em / e" },
      { "word": "职业 (zhíyè)", "meaning": "profissional / carreira" },
      { "word": "生活 (shēnghuó)", "meaning": "vida" },
      { "word": "中 (zhōng)", "meaning": "no âmbito de (fechando 在...中)" },
      { "word": "保持 (bǎochí)", "meaning": "preservar / sustentar intacta" },
      { "word": "正直 (zhèngzhí)", "meaning": "a retidão / a integridade de caráter" },
      { "word": "都 (dōu)", "meaning": "ambas / todas (advérbio totalizador)" },
      { "word": "非常 (fēicháng)", "meaning": "extraordinariamente / muito" },
      { "word": "重要 (zhòngyào)", "meaning": "importante" }
    ]
  },
  "1197": {
    "explanation": "Construção de meta social coletiva: '我们应该努力' (devemos nos esforçar). A preposição '为' demarca os beneficiários finais ('para a totalidade das pessoas') e '创造' rege os atributos de inclusão e pluralismo.",
    "breakdown": [
      { "word": "我们 (wǒmen)", "meaning": "nós" },
      { "word": "应该 (yīnggāi)", "meaning": "devemos" },
      { "word": "努力 (nǔlì)", "meaning": "empenhar esforços" },
      { "word": "为 (wèi)", "meaning": "em benefício de / para" },
      { "word": "所有人 (suǒyǒurén)", "meaning": "todas as pessoas sem exceção" },
      { "word": "创造 (chuàngzào)", "meaning": "edificar / criar" },
      { "word": "一个 (yīgè)", "meaning": "uma" },
      { "word": "更加 (gèngjiā)", "meaning": "mais / ainda mais" },
      { "word": "包容 (bāoróng)", "meaning": "inclusiva / acolhedora" },
      { "word": "和 (hé)", "meaning": "e" },
      { "word": "多样化 (duōyànghuà)", "meaning": "diversificada (sufixo 化 indica transformação plural)" },
      { "word": "的 (de)", "meaning": "partícula atributiva qualificadora" },
      { "word": "社会 (shèhuì)", "meaning": "sociedade" }
    ]
  },
  "1198": {
    "explanation": "Caracterização filosófica do tempo. O advérbio de modo '明智地' utiliza a partícula '地' (de), que em mandarim transforma adjetivos em advérbios correspondentes ao sufixo '-mente' em português.",
    "breakdown": [
      { "word": "我相信 (wǒ xiāngxìn)", "meaning": "creio convictamente que" },
      { "word": "时间 (shíjiān)", "meaning": "o tempo" },
      { "word": "是 (shì)", "meaning": "é" },
      { "word": "有限的 (yǒuxiàn de)", "meaning": "finito / delimitado" },
      { "word": "资源 (zīyuán)", "meaning": "recurso" },
      { "word": "应该 (yīnggāi)", "meaning": "e deve" },
      { "word": "明智地 (míngzhì de)", "meaning": "sabiamente / com prudência (地 cria o advérbio)" },
      { "word": "利用 (lǐyòng)", "meaning": "ser aproveitado / empregado" }
    ]
  },
  "1199": {
    "explanation": "Interrogação formal construída com a partícula '是否' (se porventura sim ou não), recurso clássico do chinês para interrogações indiretas sem precisar da partícula final '吗'. O complemento de resultado '到了' aponta o alcance do perigo.",
    "breakdown": [
      { "word": "你认为 (nǐ rènwéi)", "meaning": "você avalia que" },
      { "word": "互联网 (hùliánwǎng)", "meaning": "a internet" },
      { "word": "的 (de)", "meaning": "marcador atributivo ligado a 兴起" },
      { "word": "兴起 (xīngqǐ)", "meaning": "a ascensão / o despontar vigoroso" },
      { "word": "是否 (shìfǒu)", "meaning": "se / porventura sim ou não (marcador formal interrogativo)" },
      { "word": "威胁到了 (wēixié dào le)", "meaning": "atingiu com ameaças / pôs em xeque (verbo + 到 + aspecto 了)" },
      { "word": "传统 (chuántǒng)", "meaning": "tradicional" },
      { "word": "媒体 (méitǐ)", "meaning": "meios de comunicação / imprensa" }
    ]
  },
  "1200": {
    "explanation": "Sentença hipotética de causa e efeito: '如果...会' (se assim for feito... o mundo se tornará). O complemento de grau '好的多' (hǎo de duō) intensifica o adjetivo 'bom', traduzindo-se por 'muito melhor' de modo enfático.",
    "breakdown": [
      { "word": "如果 (rúguǒ)", "meaning": "se" },
      { "word": "我们 (wǒmen)", "meaning": "nós" },
      { "word": "都 (dōu)", "meaning": "todos nós (advérbio totalizador)" },
      { "word": "能 (néng)", "meaning": "pudermos / formos capazes de" },
      { "word": "更 (gèng)", "meaning": "mais" },
      { "word": "有 (yǒu)", "meaning": "ter / possuir" },
      { "word": "同情心 (tóngqíngxīn)", "meaning": "compaixão / empatia pelo sofrimento alheio" },
      { "word": "世界 (shìjiè)", "meaning": "o mundo" },
      { "word": "会 (huì)", "meaning": "irá certamente" },
      { "word": "变得 (biànde)", "meaning": "tornar-se / ficar (verbo 变 + partícula de grau 得)" },
      { "word": "好的多 (hǎo de duō)", "meaning": "muito melhor / incomensuravelmente superior" }
    ]
  }
};

const pastas = [
  path.resolve(__dirname, '../public/explicacoes/pi_pt'),
  path.resolve(__dirname, '../public/explicacoes/zh_pt')
];

for (const pasta of pastas) {
  if (!fs.existsSync(pasta)) {
    fs.mkdirSync(pasta, { recursive: true });
  }
  const arq = path.join(pasta, 'B2_Conceitos Abstratos.json');
  fs.writeFileSync(arq, JSON.stringify(explicacoes, null, 2), 'utf-8');
  console.log(`Mandarim B2 gerado em: ${arq}`);
}