import { useState, useEffect, useCallback } from 'react'

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
    
    // Subetapas 1 e 2: Varredura Global e Identificação de Urgência
    let recuperacao = [];
    let progresso30s = [];
    let progressoDias = [];

    Object.keys(frasesMaestria).forEach(idStr => {
      const id = Number(idStr);
      const maestria = frasesMaestria[idStr];
      
      if (typeof maestria === 'object' && maestria.rank > 0 && maestria.next_review <= agora) {
        if (maestria.status === 'recuperacao') {
          recuperacao.push({ ...maestria, id, tipo: 'recuperacao' });
        } else if (maestria.status === 'progresso') {
          progresso30s.push({ ...maestria, id, tipo: 'progresso' });
        } else if (maestria.status === 'macro') {
          progressoDias.push({ ...maestria, id, tipo: 'macro' });
        }
      }
    });

    const sortCronologico = (a, b) => a.last_attempt_at - b.last_attempt_at;
    recuperacao.sort(sortCronologico);
    progresso30s.sort(sortCronologico);
    progressoDias.sort((a, b) => (a.next_review - a.last_review) - (b.next_review - b.last_review));

    let escolhido = null;
    if (recuperacao.length > 0) escolhido = recuperacao[0];
    else if (progresso30s.length > 0) escolhido = progresso30s[0];
    else if (progressoDias.length > 0) escolhido = progressoDias[0];

    if (escolhido) {
      // Subetapa 3: O alvo pode não estar carregado. Passamos a resposta com nível e tópico para o App baixar os dados
      const indiceLocal = frasesAtuais ? frasesAtuais.findIndex(f => f.id === escolhido.id) : -1;
      return { ...escolhido, indice: indiceLocal };
    }

    // Preparação para Subetapa 4: Resgate de Inéditas no tópico atual (se houver algum carregado)
    if (frasesAtuais && frasesAtuais.length > 0) {
      let ineditas = [];
      frasesAtuais.forEach((f, index) => {
        const maestria = frasesMaestria[f.id];
        const rank = typeof maestria === 'object' ? maestria.rank : (maestria || 0);
        if (rank === 0) {
          ineditas.push({ id: f.id, rank: 0, tipo: 'inedita', indice: index, nivel: f.nivel, topico: f.topico });
        }
      });
      
      if (ineditas.length > 0) {
        ineditas.sort((a, b) => a.id - b.id);
        return ineditas[0];
      }
    }

    return null;
  }, [frasesMaestria]);

  return {
    indice, setIndice,
    mostrarTraducao, setMostrarTraducao,
    frasesMaestria, setFrasesMaestria,
    filaErros, setFilaErros,
    filaAcertos, setFilaAcertos,
    sessaoDominium, setSessaoDominium,
    avaliarProximoAlvo
  }
}