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
  const [indice, setIndice] = useState(0);
  const [mostrarTraducao, setMostrarTraducao] = useState(() => {
    const salvo = localStorage.getItem('pref_mostrar_traducao');
    return salvo !== null ? JSON.parse(salvo) : false;
  });
  const [frasesMaestria, setFrasesMaestria] = useState({});
  const [filaErros, setFilaErros] = useState([]);
  const [filaAcertos, setFilaAcertos] = useState([]);
  const [sessaoDominium, setSessaoDominium] = useState({ primeira: [], recuperadas: [], acertosTempo: [], falhas: [] });

  const taskIdsRef = useRef([]);
  const LIMITE_BANDEJA = 5;

  const chaveBandeja = (idiomaOrigem && idiomaEstudo) ? `bandeja_${idiomaOrigem}_${idiomaEstudo}` : null;
  const chaveDinglab = (idiomaOrigem && idiomaEstudo) ? `dinglab_${idiomaOrigem}_${idiomaEstudo}` : null;
  const chaveBandejaFechada = (idiomaOrigem && idiomaEstudo) ? `bandeja_fechada_${idiomaOrigem}_${idiomaEstudo}` : null;

  const resetarTimerTask = useCallback(() => {
    taskIdsRef.current = [];
    if (chaveBandejaFechada) {
      try { localStorage.removeItem(chaveBandejaFechada); } catch (e) { }
    }
  }, [chaveBandejaFechada]);

  // Persiste no localStorage as cartas ativas na bandeja
  const sincronizarPersistenciaBandeja = useCallback((fila) => {
    if (!chaveBandeja) return;
    if (!fila || fila.length === 0) {
      try { localStorage.removeItem(chaveBandeja); } catch (e) { }
      return;
    }

    const listaRef = frasesFiltradas || [];
    const payload = fila.map(id => {
      const m = frasesMaestria[id];
      const fObj = listaRef.find(f => Number(f.id) === id);
      const texto = (typeof m === 'object' && m.texto) ? m.texto : (fObj ? (fObj[idiomaEstudo] || fObj.texto) : "");
      return { id, texto };
    });
    try { localStorage.setItem(chaveBandeja, JSON.stringify(payload)); } catch (e) { }
  }, [chaveBandeja, frasesMaestria, frasesFiltradas, idiomaEstudo]);

  // ROTAÇÃO FIFO PURA DA BANDEJA
  const rotacionarBandeja = useCallback((idAlvo, foiConcluido = false) => {
    if (!idAlvo) return;
    const idNum = Number(idAlvo);
    let fila = (taskIdsRef.current && taskIdsRef.current.length > 0)
      ? [...taskIdsRef.current]
      : [];

    if (fila.length === 0 && chaveBandeja) {
      try {
        const salvoB = localStorage.getItem(chaveBandeja);
        if (salvoB) {
          const arrB = JSON.parse(salvoB);
          if (Array.isArray(arrB)) {
            fila = arrB.map(item => typeof item === 'object' && item !== null ? Number(item.id) : Number(item)).filter(Boolean);
          }
        }
      } catch (e) { }
    }

    if (foiConcluido) {
      // Formatura macro (R5->R6 descanso de 1 dia, etc): sai da bandeja
      fila = fila.filter(id => id !== idNum);
    } else {
      const jaEstavaNaBandeja = fila.includes(idNum);

      if (jaEstavaNaBandeja) {
        // Carta já pertencia à bandeja: gira para o final da fila (FIFO)
        fila = [...fila.filter(id => id !== idNum), idNum];
      } else {
        // Carta recém-iniciada:
        // Se a bandeja tiver vagas (< 5), entra em ÚLTIMO LUGAR na bandeja.
        // Se a bandeja já estiver com 5, não entra na bandeja (fica ao final de Próximas).
        if (fila.length < LIMITE_BANDEJA) {
          fila = [...fila, idNum];
        }
      }
    }

    taskIdsRef.current = fila;
    sincronizarPersistenciaBandeja(fila);
  }, [chaveBandeja, sincronizarPersistenciaBandeja]);

  const postergarParaFimDaTask = useCallback((idAlvo) => {
    rotacionarBandeja(idAlvo, false);
  }, [rotacionarBandeja]);

  // Carga e saneamento inicial de maestria
  useEffect(() => {
    if (!idiomaOrigem || !idiomaEstudo) return;
    const chaveMaestria = `maestria_${idiomaOrigem}_${idiomaEstudo}`;
    const salvoMaestria = localStorage.getItem(chaveMaestria);
    let dadosMaestria = salvoMaestria ? JSON.parse(salvoMaestria) : {};
    const agora = Date.now();
    let houveDegradacao = false;

    // Regra anti-stale de 30 minutos apenas para microciclos abandonados por longo tempo
    Object.keys(dadosMaestria).forEach(id => {
      const item = dadosMaestria[id];
      if (typeof item === 'object' && item.last_review && item.next_review) {
        if (agora >= item.next_review && item.status !== 'macro') {
          const tempo = agora - item.last_review;
          const r = item.rank;
          if (r >= 1 && r <= 5 && tempo > 1800000) {
            dadosMaestria[id] = { ...item, rank: 0, status: 'inedita', next_review: agora };
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

  // INICIALIZAÇÃO CONTROLADA DA BANDEJA (Carrega estritamente cartas ativas abandonadas)
  const inicializarBandeja = useCallback(async () => {
    // Se a Task já está ativa na memória, preserva a fila atual
    if (taskIdsRef.current && taskIdsRef.current.length > 0) {
      return taskIdsRef.current;
    }

    const agora = Date.now();
    let idsNoDinglab = [];
    if (chaveDinglab) {
      try {
        const salvoD = localStorage.getItem(chaveDinglab);
        if (salvoD) idsNoDinglab = JSON.parse(salvoD).map(item => Number(item.id));
      } catch (e) { }
    }

    // Carrega estritamente cartas com Rank > 0 que foram abandonadas na bandeja
    let idsAbandonadas = [];
    if (chaveBandeja) {
      try {
        const salvoB = localStorage.getItem(chaveBandeja);
        if (salvoB) {
          const arrB = JSON.parse(salvoB);
          if (Array.isArray(arrB)) {
            idsAbandonadas = arrB
              .map(item => (typeof item === 'object' && item !== null ? Number(item.id) : Number(item)))
              .filter(id => {
                if (!id || idsNoDinglab.includes(id)) return false;
                const m = frasesMaestria[id];
                const rank = typeof m === 'object' ? (m.rank || 0) : (m || 0);
                const estaEmRepouso = typeof m === 'object' && m.status === 'macro' && m.next_review > agora;
                return rank > 0 && !estaEmRepouso;
              });
          }
        }
      } catch (e) { }
    }

    const novaBandeja = idsAbandonadas.slice(0, LIMITE_BANDEJA);
    taskIdsRef.current = novaBandeja;
    sincronizarPersistenciaBandeja(novaBandeja);
    return novaBandeja;
  }, [chaveBandeja, chaveDinglab, frasesMaestria, sincronizarPersistenciaBandeja]);

  // AVALIADOR DETERMINÍSTICO FIFO
  const avaliarProximoAlvo = useCallback((frasesAtuais = frasesFiltradas) => {
    const agora = Date.now();
    let idsNoDinglab = [];
    if (chaveDinglab) {
      try {
        const salvoD = localStorage.getItem(chaveDinglab);
        if (salvoD) idsNoDinglab = JSON.parse(salvoD).map(item => Number(item.id));
      } catch (e) { }
    }

    // 1. Filtra cartas ativas na bandeja (remove Dìnglab e repousos macro)
    let idsPendentes = (taskIdsRef.current || []).filter(id => {
      if (!id || idsNoDinglab.includes(id)) return false;
      const m = frasesMaestria[id];
      const estaEmRepouso = m && typeof m === 'object' && m.status === 'macro' && m.next_review > agora;
      return !estaEmRepouso;
    });

    taskIdsRef.current = idsPendentes;
    sincronizarPersistenciaBandeja(idsPendentes);

    // Se atingiu o teto de 5, fecha a admissão da bandeja
    if (idsPendentes.length >= LIMITE_BANDEJA && chaveBandejaFechada) {
      try { localStorage.setItem(chaveBandejaFechada, 'true'); } catch (e) { }
    }

    const bandejaJaFechou = chaveBandejaFechada
      ? (localStorage.getItem(chaveBandejaFechada) === 'true')
      : false;

    // 2. Admissão de cartas até completar 5 (se a bandeja ainda não fechou)
    if (!bandejaJaFechou && idsPendentes.length < LIMITE_BANDEJA) {
      // 2a. Busca a mais antiga pronta na lista de Próximas
      let proximaPronta = null;
      let menorTempo = Infinity;

      Object.keys(frasesMaestria).forEach(idStr => {
        const id = Number(idStr);
        const m = frasesMaestria[idStr];
        if (
          typeof m === 'object' &&
          m.rank > 0 &&
          !idsPendentes.includes(id) &&
          !idsNoDinglab.includes(id) &&
          m.next_review <= agora
        ) {
          const tempo = m.last_attempt_at || 0;
          if (tempo < menorTempo) {
            menorTempo = tempo;
            proximaPronta = { id, ...m };
          }
        }
      });

      if (proximaPronta) {
        const novaFila = [...idsPendentes, proximaPronta.id];
        taskIdsRef.current = novaFila;
        sincronizarPersistenciaBandeja(novaFila);
        if (novaFila.length >= LIMITE_BANDEJA && chaveBandejaFechada) {
          try { localStorage.setItem(chaveBandejaFechada, 'true'); } catch (e) { }
        }

        return {
          tipo: "revisao",
          dados: {
            ...proximaPronta,
            id: proximaPronta.id,
            rank: proximaPronta.rank,
            texto: proximaPronta.texto || "",
            traducao: proximaPronta.traducao || "",
            texto_zh: proximaPronta.texto_zh || "",
            nivel: proximaPronta.nivel || nivelAtivo || "A1",
            topico: proximaPronta.topico || topicoAtivo || ""
          }
        };
      }

      // 2b. Se Próximas está vazia, sugere a inédita de menor ID no nível
      const listaRef = frasesAtuais || frasesFiltradas || [];
      const ineditas = (Array.isArray(listaRef) ? listaRef : [])
        .filter(f => {
          const fid = Number(f.id);
          const m = frasesMaestria[fid];
          const rank = typeof m === 'object' ? m.rank : (m || 0);
          return rank === 0 && !idsPendentes.includes(fid) && !idsNoDinglab.includes(fid);
        })
        .sort((a, b) => Number(a.id) - Number(b.id));

      if (ineditas.length > 0) {
        const fInedita = ineditas[0];
        const colTopicOrigem = idiomaOrigem ? `topic_${idiomaOrigem}` : 'topic_pt';
        const nomeTopico = fInedita[colTopicOrigem] || fInedita.topico || fInedita.topic || topicoAtivo || "";
        const idxNoTopico = listaRef.findIndex(f => Number(f.id) === Number(fInedita.id));

        return {
          id: Number(fInedita.id),
          rank: 0,
          tipo: "inedita",
          indice: idxNoTopico !== -1 ? idxNoTopico : 0,
          nivel: fInedita.level || fInedita.nivel || nivelAtivo || "A1",
          topico: nomeTopico,
          dados: fInedita
        };
      }

      // 2c. Não há Próximas nem Inéditas no nível: fecha a bandeja com as cartas restantes
      if (chaveBandejaFechada) {
        try { localStorage.setItem(chaveBandejaFechada, 'true'); } catch (e) { }
      }
    }

    // 3. Fila FIFO pura da bandeja
    if (idsPendentes.length > 0) {
      const idAlvo = idsPendentes[0];
      const maestriaAlvo = frasesMaestria[idAlvo];
      const rankAlvo = typeof maestriaAlvo === 'object' ? (maestriaAlvo.rank || 0) : (maestriaAlvo || 0);

      const listaRef = frasesAtuais || frasesFiltradas || [];
      const fObj = listaRef.find(f => Number(f.id) === idAlvo);

      const textoAlvo = (typeof maestriaAlvo === 'object' && maestriaAlvo.texto) ? maestriaAlvo.texto : (fObj ? (fObj[idiomaEstudo] || fObj.texto) : "");
      const traducaoAlvo = (typeof maestriaAlvo === 'object' && maestriaAlvo.traducao) ? maestriaAlvo.traducao : (fObj ? (fObj[idiomaOrigem] || fObj.traducao || "") : "");
      const zhAlvo = (typeof maestriaAlvo === 'object' && maestriaAlvo.texto_zh) ? maestriaAlvo.texto_zh : (fObj ? (fObj.zh || fObj.texto_zh || "") : "");

      return {
        tipo: "revisao",
        dados: {
          ...(typeof maestriaAlvo === 'object' ? maestriaAlvo : {}),
          id: idAlvo,
          rank: rankAlvo,
          texto: textoAlvo,
          traducao: traducaoAlvo,
          texto_zh: zhAlvo,
          nivel: (typeof maestriaAlvo === 'object' && maestriaAlvo.nivel) || fObj?.level || fObj?.nivel || nivelAtivo || "A1",
          topico: (typeof maestriaAlvo === 'object' && maestriaAlvo.topico) || fObj?.topico || fObj?.topic || topicoAtivo || ""
        }
      };
    }

    // 4. Bandeja vazia e sem novas cartas: encerra a Task
    if (chaveBandeja) {
      try { localStorage.removeItem(chaveBandeja); } catch (e) { }
    }
    if (chaveBandejaFechada) {
      try { localStorage.removeItem(chaveBandejaFechada); } catch (e) { }
    }
    return { resetarTimerTask, tipo: "concluido" };
  }, [frasesMaestria, frasesFiltradas, chaveDinglab, chaveBandeja, chaveBandejaFechada, resetarTimerTask, sincronizarPersistenciaBandeja, idiomaEstudo, idiomaOrigem, nivelAtivo, topicoAtivo]);

  return {
    indice, setIndice,
    mostrarTraducao, setMostrarTraducao,
    frasesMaestria, setFrasesMaestria,
    filaErros, setFilaErros,
    filaAcertos, setFilaAcertos,
    sessaoDominium, setSessaoDominium,
    avaliarProximoAlvo,
    resetarTimerTask,
    postergarParaFimDaTask,
    inicializarBandeja,
    rotacionarBandeja,
    taskIdsRef
  };
}
