import { useState, useEffect, useCallback, useRef } from 'react'

export function useGameEngine({
  frasesFiltradas,
  setFrasesFiltradas,
  idiomaOrigem,
  idiomaEstudo,
  nivelAtivo,
  topicoAtivo,
  mudarTela,
  iniciarExercicio,
  limparEstadoExercicio,
  supabase,
  setModoJogo,
  setSessaoIniciada,
  setModoExercicio,
}) {
  const [indice, setIndice] = useState(0)
  const [mostrarTraducao, setMostrarTraducao] = useState(() => {
    const salvo = localStorage.getItem('pref_mostrar_traducao');
    return salvo !== null ? JSON.parse(salvo) : false;
  });
  const [frasesMaestria, setFrasesMaestria] = useState({});
  const [filaErros, setFilaErros] = useState([]);
  const [filaAcertos, setFilaAcertos] = useState([]);
  const [sessaoDominium, setSessaoDominium] = useState({ primeira: [], recuperadas: [], acertosTempo: [], falhas: [] });

  // Registro fixo dos IDs admitidos na Task atual (limite de 5 frases)
  const taskIdsRef = useRef([]);
  const LIMITE_BANDEJA = 5;

  const resetarTimerTask = useCallback(() => {
    taskIdsRef.current = [];
  }, []);

  // ETAPA 2: Move a frase para o final da fila da bandeja atual da Task
  const postergarParaFimDaTask = useCallback((idAlvo) => {
    if (!idAlvo) return;
    
    // 1. Move para a última posição de taskIdsRef.current
    if (taskIdsRef.current && taskIdsRef.current.includes(idAlvo)) {
      taskIdsRef.current = [...taskIdsRef.current.filter(id => id !== idAlvo), idAlvo];
    } else if (taskIdsRef.current) {
      taskIdsRef.current.push(idAlvo);
    }

    // 2. Registra timestamp recente para que a ordenação cronológica a posicione por último
    const agora = Date.now();
    setFrasesMaestria(prev => {
      const item = prev[idAlvo];
      if (!item) return prev;
      const rankAtual = typeof item === 'object' ? item.rank : (item || 0);
      return {
        ...prev,
        [idAlvo]: {
          ...(typeof item === 'object' ? item : {}),
          rank: rankAtual,
          status: 'recuperacao',
          last_attempt_at: agora,
          next_review: agora + 30000 // Cooldown de 30s para dar vez às outras pendentes
        }
      };
    });
  }, []);

  // Carregamento dinâmico baseado no curso atual (L1_L2)
  useEffect(() => {
    if (!idiomaOrigem || !idiomaEstudo) return;
    const chaveMaestria = `maestria_${idiomaOrigem}_${idiomaEstudo}`;
    const salvoMaestria = localStorage.getItem(chaveMaestria);
    let dadosMaestria = salvoMaestria ? JSON.parse(salvoMaestria) : {};

    const agora = Date.now();
    let houveDegradacao = false;
    Object.keys(dadosMaestria).forEach(id => {
      const item = dadosMaestria[id];
      if (typeof item === 'object' && item.last_review && item.next_review) {
        if (agora >= item.next_review) {
          const tempo = agora - item.last_review;
          const r = item.rank;
          let nR = r;
          if (r >= 1 && r <= 5 && tempo > 1800000) nR = 0;
          else if (r >= 6 && r <= 9 && tempo > 172800000) nR = 0;
          else if (r >= 10 && r <= 14 && tempo > 345600000) nR = 6;
          else if (r >= 15 && r <= 18 && tempo > 691200000) nR = 10;
          else if (r >= 19 && r <= 23 && tempo > 1382400000) nR = 15;
          else if (r >= 24 && r <= 26 && tempo > 2764800000) nR = 19;
          else if (r === 27 && tempo > 5529600000) nR = 19;

          if (nR !== r) {
            dadosMaestria[id] = { ...item, rank: nR, status: nR === 0 ? 'inedita' : 'recuperacao', next_review: agora };
            houveDegradacao = true;
          }
        }
      }
    });

    if (houveDegradacao) localStorage.setItem(chaveMaestria, JSON.stringify(dadosMaestria));
    setFrasesMaestria(dadosMaestria);

    const chaveSessao = `sessao_dominium_${idiomaOrigem}_${idiomaEstudo}`;
    const salvoSessao = localStorage.getItem(chaveSessao);
    try {
      setSessaoDominium(salvoSessao ? JSON.parse(salvoSessao) : { primeira: [], recuperadas: [], acertosTempo: [], falhas: [] });
    } catch (e) {
      setSessaoDominium({ primeira: [], recuperadas: [], acertosTempo: [], falhas: [] });
    }
  }, [idiomaOrigem, idiomaEstudo]);

  // Persistência automática
  useEffect(() => {
    if (!idiomaOrigem || !idiomaEstudo) return;
    if (Object.keys(frasesMaestria).length > 0) {
      localStorage.setItem(`maestria_${idiomaOrigem}_${idiomaEstudo}`, JSON.stringify(frasesMaestria));
    }
  }, [frasesMaestria, idiomaOrigem, idiomaEstudo]);

  useEffect(() => {
    if (!idiomaOrigem || !idiomaEstudo) return;
    localStorage.setItem(`sessao_dominium_${idiomaOrigem}_${idiomaEstudo}`, JSON.stringify(sessaoDominium));
  }, [sessaoDominium, idiomaOrigem, idiomaEstudo]);

  useEffect(() => {
    localStorage.setItem('pref_mostrar_traducao', JSON.stringify(mostrarTraducao));
  }, [mostrarTraducao]);

  const avaliarProximoAlvo = useCallback((frasesAtuais = frasesFiltradas) => {
    const agora = Date.now();
    const temTopicoCarregado = Boolean(frasesAtuais && frasesAtuais.length > 0);

    // 1. Mapeamento das listas globais do sistema
    let emTransitoGlobal = [];
    let recuperacaoGlobal = [];
    let progresso30sGlobal = [];
    let progressoDiasGlobal = [];

    Object.keys(frasesMaestria).forEach(idStr => {
      const id = Number(idStr);
      const maestria = frasesMaestria[idStr];

      if (typeof maestria === "object" && maestria.rank > 0) {
        if (maestria.status === "progresso" || maestria.status === "recuperacao") {
          emTransitoGlobal.push({ ...maestria, id });
        }

        if (maestria.next_review <= agora) {
          if (maestria.status === "recuperacao") {
            recuperacaoGlobal.push({ ...maestria, id, tipo: "recuperacao" });
          } else if (maestria.status === "progresso") {
            progresso30sGlobal.push({ ...maestria, id, tipo: "progresso" });
          } else if (maestria.status === "macro") {
            progressoDiasGlobal.push({ ...maestria, id, tipo: "macro" });
          }
        }
      }
    });

    const sortCronologico = (a, b) => (a.last_attempt_at || 0) - (b.last_attempt_at || 0);
    recuperacaoGlobal.sort(sortCronologico);
    progresso30sGlobal.sort(sortCronologico);
    progressoDiasGlobal.sort((a, b) => (a.next_review - a.last_review) - (b.next_review - b.last_review));

    // Mapeamento de inéditas do tópico
    let ineditasGlobal = [];
    if (temTopicoCarregado) {
      frasesAtuais.forEach((f, index) => {
        const maestria = frasesMaestria[f.id];
        const rank = typeof maestria === "object" ? maestria.rank : (maestria || 0);
        if (rank === 0) {
          ineditasGlobal.push({ id: f.id, rank: 0, tipo: "inedita", indice: index, nivel: f.nivel, topico: f.topico });
        }
      });
      ineditasGlobal.sort((a, b) => a.id - b.id);
    }

    // 2. Admissão inicial da Task (fixa até 5 frases na sessão)
    if (taskIdsRef.current.length === 0) {
      const novaBandeja = [];

      // A) Cartas em trânsito abertas na mesa
      emTransitoGlobal.forEach(item => {
        if (novaBandeja.length < LIMITE_BANDEJA && !novaBandeja.includes(item.id)) {
          novaBandeja.push(item.id);
        }
      });

      // B) Revisões liberadas de dias anteriores (Rank 6+)
      progressoDiasGlobal.forEach(item => {
        if (novaBandeja.length < LIMITE_BANDEJA && !novaBandeja.includes(item.id)) {
          novaBandeja.push(item.id);
        }
      });

      // C) Inéditas do tópico ativo
      ineditasGlobal.forEach(item => {
        if (novaBandeja.length < LIMITE_BANDEJA && !novaBandeja.includes(item.id)) {
          novaBandeja.push(item.id);
        }
      });

      taskIdsRef.current = novaBandeja;
    }

    if (taskIdsRef.current.length === 0) {
      return null;
    }

    const idsBandeja = taskIdsRef.current;

    // 3. Identificar quais frases da Task AINDA NÃO CONCLUÍRAM (não atingiram repouso de dias)
    const idsPendentes = idsBandeja.filter(id => {
      const m = frasesMaestria[id];
      const estaEmRepouso = m && typeof m === "object" && m.status === "macro" && m.next_review > agora;
      return !estaEmRepouso;
    });

    // 4. Se todas as frases da Task atingiram o repouso -> Fim da Task!
    if (idsPendentes.length === 0) {
      taskIdsRef.current = [];
      return { resetarTimerTask, tipo: "concluido" };
    }

    // 5. Seleção restrita estritamente entre as frases pendentes da Task
    const recuperacaoBandeja = recuperacaoGlobal.filter(item => idsPendentes.includes(item.id));
    const progresso30sBandeja = progresso30sGlobal.filter(item => idsPendentes.includes(item.id));
    const progressoDiasBandeja = progressoDiasGlobal.filter(item => idsPendentes.includes(item.id));
    const ineditasBandeja = ineditasGlobal.filter(item => idsPendentes.includes(item.id));
    const emTransitoBandeja = emTransitoGlobal.filter(item => idsPendentes.includes(item.id));

    // 1º: Erros recentes prontos (30s cumpridos)
    if (recuperacaoBandeja.length > 0) return { tipo: "revisao", dados: recuperacaoBandeja[0] };

    // 2º: Micro-ciclos normais prontos (30s cumpridos)
    if (progresso30sBandeja.length > 0) return { tipo: "revisao", dados: progresso30sBandeja[0] };

    // 3º: Revisões de dias aguardando a primeira rodada
    if (progressoDiasBandeja.length > 0) return { tipo: "revisao", dados: progressoDiasBandeja[0] };

    // 4º: Inéditas que ainda não foram praticadas
    if (ineditasBandeja.length > 0) return ineditasBandeja[0];

    // 5º: Bypass de Cooldown Ocioso (se todas aguardam tempo, entrega a que espera há mais tempo)
    if (emTransitoBandeja.length > 0) {
      emTransitoBandeja.sort(sortCronologico);
      return { tipo: "revisao", dados: emTransitoBandeja[0] };
    }

    taskIdsRef.current = [];
    return { resetarTimerTask, tipo: "concluido" };
  }, [frasesMaestria, frasesFiltradas, resetarTimerTask]);

  return {
    indice, setIndice,
    mostrarTraducao, setMostrarTraducao,
    frasesMaestria, setFrasesMaestria,
    filaErros, setFilaErros,
    filaAcertos, setFilaAcertos,
    sessaoDominium, setSessaoDominium,
    avaliarProximoAlvo,
    resetarTimerTask,
    postergarParaFimDaTask
  }
}