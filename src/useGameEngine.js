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
  const aguardandoExpansaoAvulsoRef = useRef(false);

  const chaveBandeja = (idiomaOrigem && idiomaEstudo) ? `bandeja_${idiomaOrigem}_${idiomaEstudo}` : null;
  const chaveDinglab = (idiomaOrigem && idiomaEstudo) ? `dinglab_${idiomaOrigem}_${idiomaEstudo}` : null;

  const resetarTimerTask = useCallback(() => {
    taskIdsRef.current = [];
    aguardandoExpansaoAvulsoRef.current = false;
  }, []);

  // Persiste no localStorage EXCLUSIVAMENTE cartas iniciadas (rank > 0)
  const sincronizarPersistenciaBandeja = useCallback((fila) => {
    if (!chaveBandeja) return;
    if (!fila || fila.length === 0) {
      try { localStorage.removeItem(chaveBandeja); } catch (e) {}
      return;
    }

    const listaRef = frasesFiltradas || [];
    const iniciadas = fila.filter(id => {
      const m = frasesMaestria[id];
      const r = typeof m === 'object' ? m.rank : (m || 0);
      return r > 0;
    });

    if (iniciadas.length > 0) {
      const payload = iniciadas.map(id => {
        const m = frasesMaestria[id];
        const fObj = listaRef.find(f => Number(f.id) === id);
        const texto = (typeof m === 'object' && m.texto) ? m.texto : (fObj ? (fObj[idiomaEstudo] || fObj.texto) : "");
        return { id, texto };
      });
      try { localStorage.setItem(chaveBandeja, JSON.stringify(payload)); } catch (e) {}
    } else {
      try { localStorage.removeItem(chaveBandeja); } catch (e) {}
    }
  }, [chaveBandeja, frasesMaestria, frasesFiltradas, idiomaEstudo]);

  // ROTAÇÃO FIFO PURA DA BANDEJA
  const rotacionarBandeja = useCallback((idAlvo, foiConcluido = false) => {
    if (!idAlvo) return;
    const idNum = Number(idAlvo);
    let fila = taskIdsRef.current || [];

    if (foiConcluido) {
      fila = fila.filter(id => id !== idNum);
    } else {
      if (fila.includes(idNum)) {
        fila = [...fila.filter(id => id !== idNum), idNum];
      }
    }

    taskIdsRef.current = fila;
    sincronizarPersistenciaBandeja(fila);
  }, [sincronizarPersistenciaBandeja]);

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

  // INICIALIZAÇÃO CONTROLADA DA BANDEJA
  const inicializarBandeja = useCallback(async ({ idCardEscolhido = null, frasesTopico = null, frasesNivel = null } = {}) => {
    // Trava Hermética: se a Task já está em andamento, nunca admite cartas novas
    if (taskIdsRef.current && taskIdsRef.current.length > 0) {
      return;
    }

    const agora = Date.now();
    let idsNoDinglab = [];
    if (chaveDinglab) {
      try {
        const salvoD = localStorage.getItem(chaveDinglab);
        if (salvoD) idsNoDinglab = JSON.parse(salvoD).map(item => Number(item.id));
      } catch (e) {}
    }

    // 1. Obter cartas de bandeja abandonada
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
                if (idsNoDinglab.includes(id)) return false;
                const m = frasesMaestria[id];
                const estaEmRepouso = m && typeof m === 'object' && m.status === 'macro' && m.next_review > agora;
                return !estaEmRepouso;
              });
          }
        }
      } catch (e) {}
    }

    // 2. Obter cartas prontas de 'Próximas' (repousos macro vencidos + recém-saídas do Dìnglab)
    let proximasProntas = [];
    Object.keys(frasesMaestria).forEach(idStr => {
      const id = Number(idStr);
      const m = frasesMaestria[idStr];
      if (typeof m === 'object' && m.rank > 0 && !idsNoDinglab.includes(id) && m.next_review <= agora) {
        proximasProntas.push({ id, ...m });
      }
    });
    proximasProntas.sort((a, b) => (a.last_attempt_at || 0) - (b.last_attempt_at || 0));

    const novaBandeja = [];

    if (idCardEscolhido) {
      // CENÁRIO 2: Card Avulso
      const idNum = Number(idCardEscolhido);
      if (!idsNoDinglab.includes(idNum)) {
        novaBandeja.push(idNum); // Vaga 1
      }
      taskIdsRef.current = novaBandeja;
      aguardandoExpansaoAvulsoRef.current = true;
      sincronizarPersistenciaBandeja(novaBandeja);
      return novaBandeja;
    }

    // CENÁRIO 1: Botão GAME
    // Prioridade 1: Abandonadas
    idsAbandonadas.forEach(id => {
      if (novaBandeja.length < LIMITE_BANDEJA && !novaBandeja.includes(id) && !idsNoDinglab.includes(id)) {
        novaBandeja.push(id);
      }
    });

    // Prioridade 2: Próximas
    proximasProntas.forEach(item => {
      if (novaBandeja.length < LIMITE_BANDEJA && !novaBandeja.includes(item.id) && !idsNoDinglab.includes(item.id)) {
        novaBandeja.push(item.id);
      }
    });

    // Prioridade 3: Inéditas de menor ID global do nível
    const listaRef = frasesNivel || frasesTopico || frasesFiltradas || [];
    if (novaBandeja.length < LIMITE_BANDEJA && Array.isArray(listaRef)) {
      const ineditas = listaRef
        .filter(f => {
          const fid = Number(f.id);
          const m = frasesMaestria[fid];
          const rank = typeof m === 'object' ? m.rank : (m || 0);
          return rank === 0 && !idsNoDinglab.includes(fid);
        })
        .map(f => Number(f.id))
        .sort((a, b) => a - b);

      ineditas.forEach(id => {
        if (novaBandeja.length < LIMITE_BANDEJA && !novaBandeja.includes(id)) {
          novaBandeja.push(id);
        }
      });
    }

    taskIdsRef.current = novaBandeja;
    sincronizarPersistenciaBandeja(novaBandeja);
    return novaBandeja;
  }, [chaveBandeja, chaveDinglab, frasesMaestria, frasesFiltradas, sincronizarPersistenciaBandeja]);

  // Expansão das Vagas 2 a 5 para Card Avulso após responder à Vaga 1
  const expandirBandejaAvulsoSeNecessario = useCallback((frasesTopico, frasesNivel) => {
    if (!aguardandoExpansaoAvulsoRef.current) return;
    aguardandoExpansaoAvulsoRef.current = false;

    let fila = [...taskIdsRef.current];
    const agora = Date.now();

    let idsNoDinglab = [];
    if (chaveDinglab) {
      try {
        const salvoD = localStorage.getItem(chaveDinglab);
        if (salvoD) idsNoDinglab = JSON.parse(salvoD).map(item => Number(item.id));
      } catch (e) {}
    }

    // 1ª Prioridade: Abandonadas anteriores
    if (chaveBandeja) {
      try {
        const salvoB = localStorage.getItem(chaveBandeja);
        if (salvoB) {
          const arrB = JSON.parse(salvoB);
          if (Array.isArray(arrB)) {
            arrB.forEach(item => {
              const id = typeof item === 'object' && item !== null ? Number(item.id) : Number(item);
              if (fila.length < LIMITE_BANDEJA && !fila.includes(id) && !idsNoDinglab.includes(id)) {
                fila.push(id);
              }
            });
          }
        }
      } catch (e) {}
    }

    // 2ª Prioridade: Próximas
    Object.keys(frasesMaestria).forEach(idStr => {
      const id = Number(idStr);
      const m = frasesMaestria[idStr];
      if (fila.length < LIMITE_BANDEJA && typeof m === 'object' && m.rank > 0 && !idsNoDinglab.includes(id) && m.next_review <= agora) {
        if (!fila.includes(id)) fila.push(id);
      }
    });

    // 3ª Prioridade: Inéditas do mesmo tópico
    if (fila.length < LIMITE_BANDEJA && Array.isArray(frasesTopico)) {
      const ineditasTopico = frasesTopico
        .filter(f => {
          const fid = Number(f.id);
          const m = frasesMaestria[fid];
          const rank = typeof m === 'object' ? m.rank : (m || 0);
          return rank === 0 && !idsNoDinglab.includes(fid);
        })
        .map(f => Number(f.id))
        .sort((a, b) => a - b);

      ineditasTopico.forEach(id => {
        if (fila.length < LIMITE_BANDEJA && !fila.includes(id)) {
          fila.push(id);
        }
      });
    }

    // 4ª Prioridade: Inéditas de menor ID do nível
    if (fila.length < LIMITE_BANDEJA && Array.isArray(frasesNivel)) {
      const ineditasNivel = frasesNivel
        .filter(f => {
          const fid = Number(f.id);
          const m = frasesMaestria[fid];
          const rank = typeof m === 'object' ? m.rank : (m || 0);
          return rank === 0 && !idsNoDinglab.includes(fid);
        })
        .map(f => Number(f.id))
        .sort((a, b) => a - b);

      ineditasNivel.forEach(id => {
        if (fila.length < LIMITE_BANDEJA && !fila.includes(id)) {
          fila.push(id);
        }
      });
    }

    // A carta avulsa que acabou de ser praticada deve ir para o FINAL da fila
    const idCartaAvulsa = taskIdsRef.current.length > 0 ? taskIdsRef.current[0] : null;
    let filaOrdenada = fila;
    if (idCartaAvulsa && fila.includes(idCartaAvulsa)) {
      filaOrdenada = [...fila.filter(id => id !== idCartaAvulsa), idCartaAvulsa];
    }

    taskIdsRef.current = filaOrdenada;
    sincronizarPersistenciaBandeja(filaOrdenada);
  }, [chaveBandeja, chaveDinglab, frasesMaestria, sincronizarPersistenciaBandeja]);

  // AVALIADOR DETERMINÍSTICO FIFO
  const avaliarProximoAlvo = useCallback((frasesAtuais = frasesFiltradas) => {
    const agora = Date.now();
    let idsNoDinglab = [];
    if (chaveDinglab) {
      try {
        const salvoD = localStorage.getItem(chaveDinglab);
        if (salvoD) idsNoDinglab = JSON.parse(salvoD).map(item => Number(item.id));
      } catch (e) {}
    }

    // Filtra quem de fato ainda está pendente nesta rodada
    const idsPendentes = (taskIdsRef.current || []).filter(id => {
      if (idsNoDinglab.includes(id)) return false;
      const m = frasesMaestria[id];
      const estaEmRepouso = m && typeof m === 'object' && m.status === 'macro' && m.next_review > agora;
      return !estaEmRepouso;
    });

    taskIdsRef.current = idsPendentes;
    sincronizarPersistenciaBandeja(idsPendentes);

    // Conclusão Natural: se não há mais cartas na fila, encerra a Task
    if (idsPendentes.length === 0) {
      if (chaveBandeja) {
        try { localStorage.removeItem(chaveBandeja); } catch (e) {}
      }
      return { resetarTimerTask, tipo: "concluido" };
    }

    // Carrossel FIFO: pega rigorosamente o primeiro ID da fila
    const idAlvo = idsPendentes[0];
    const maestriaAlvo = frasesMaestria[idAlvo];
    const rankAlvo = typeof maestriaAlvo === 'object' ? (maestriaAlvo.rank || 0) : (maestriaAlvo || 0);

    const listaRef = frasesAtuais || frasesFiltradas || [];
    const fObj = listaRef.find(f => Number(f.id) === idAlvo);
    const idxNoTopico = listaRef.findIndex(f => Number(f.id) === idAlvo);

    if (rankAlvo > 0) {
      return {
        tipo: "revisao",
        dados: {
          ...(typeof maestriaAlvo === 'object' ? maestriaAlvo : {}),
          id: idAlvo,
          rank: rankAlvo,
          texto: (typeof maestriaAlvo === 'object' && maestriaAlvo.texto) ? maestriaAlvo.texto : (fObj ? (fObj[idiomaEstudo] || fObj.texto) : "")
        }
      };
    }

    // Inédita (Rank 0)
    return {
      id: idAlvo,
      rank: 0,
      tipo: "inedita",
      indice: idxNoTopico !== -1 ? idxNoTopico : 0,
      nivel: fObj?.level || fObj?.nivel || nivelAtivo || "A1",
      topico: fObj?.topico || fObj?.topic || topicoAtivo || "",
      dados: fObj
    };
  }, [frasesMaestria, frasesFiltradas, chaveDinglab, chaveBandeja, resetarTimerTask, sincronizarPersistenciaBandeja, idiomaEstudo, nivelAtivo, topicoAtivo]);

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
    expandirBandejaAvulsoSeNecessario,
    taskIdsRef
  };
}
