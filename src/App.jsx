import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import {
  RANKS_SELECT, RANKS_WRITE, RANKS_VOICE, NOMES_RANKS,
  temas, interfaceTraducoes
} from './constant'
import { styles } from './styles'
import { useGameEngine } from './useGameEngine'
import { useSpeech } from './useSpeech'
import Perfil from './Components/Perfil'
import { EscolherOrigem, EscolherEstudo } from './Components/EscolhaIdiomas'
import Hub from './Components/Hub'
import TelaEstudo from './Components/TelaEstudo' 
import { EscolherNivel, EscolherTopic, SelecaoExercicio, Adm } from './Components/Navegacao'
import { ExplicacaoIA, DominiumStats } from './Components/Relatorios'
import MenuCartoes from './Components/MenuCartoes'
import { useAI } from './hooks/useAI'
import { dataService } from './dataService'
import { calcularProximoRank } from './useSRSLogic'
import { precarregarAudios } from './services/audioCacheService'
import { DingliProvider } from './DingliContext'

function App() {
  const [tela, setTela] = useState(() => sessionStorage.getItem('app_tela') || 'perfil');
  const [mensagemOrientacao, setMensagemOrientacao] = useState("");
  const [idiomaOrigem, setIdiomaOrigem] = useState(() => sessionStorage.getItem('app_origem') || 'pt');
  const [idiomaEstudo, setIdiomaEstudo] = useState(() => sessionStorage.getItem('app_estudo') || '');
  const [nivelAtivo, setNivelAtivo] = useState(() => sessionStorage.getItem('app_nivel') || '');
  const [topicoAtivo, setTopicoAtivo] = useState(() => sessionStorage.getItem('app_topico') || '');
  const [frasesFiltradas, setFrasesFiltradas] = useState([]);
  const [listaTopicos, setListaTopicos] = useState([]);
  const [fraseTeorica, setFraseTeorica] = useState("Carregando inspiração...");
  const [nomeAluno, setNomeAluno] = useState("Estudante");
  const apiKey = "AIzaSyAv_65bjZGGtUDJugC_GtTQoMmXrFw1XtY";
  const [userRole, setUserRole] = useState(() => localStorage.getItem('app_role') || null);
  const [sessaoIniciada, setSessaoIniciada] = useState(false);
  const [carregandoDados, setCarregandoDados] = useState(false);
  const [user, setUser] = useState(null);
  const [modoJogo, setModoJogo] = useState(false);
  const [modoExercicio, setModoExercicio] = useState(false);
  const [resultadoFeedback, setResultadoFeedback] = useState(null);
  const [exercicioNivel, setExercicioNivel] = useState(0);

  // Novo estado para segurar a Revisão Global do "Saque Rápido"
  const [fraseAtivaGlobal, setFraseAtivaGlobal] = useState(null);

  // Estados voláteis migrados para TelaEstudo
  const processandoAcertoRef = useRef(false);
  const [cursosInscritos, setCursosInscritos] = useState(() => {
    const salvo = localStorage.getItem('cursos_salvos');
    return salvo ? JSON.parse(salvo) : [];
  });
  const ultimoAudioID = useRef("");

  const mudarTela = useCallback((novaTela) => {
    window.history.pushState({ tela: novaTela }, "");
    setTela(novaTela);
  }, []);

  const {
    indice, setIndice,
    mostrarTraducao, setMostrarTraducao,
    frasesMaestria, setFrasesMaestria,
    filaErros, setFilaErros,
    filaAcertos, setFilaAcertos,
    sessaoDominium, setSessaoDominium,
    avaliarProximoAlvo
  } = useGameEngine({
    frasesFiltradas, setFrasesFiltradas,
    idiomaOrigem, idiomaEstudo, nivelAtivo, topicoAtivo,
    mudarTela, iniciarExercicio, limparEstadoExercicio,
    setModoJogo, setSessaoIniciada, setModoExercicio
  });

  const limparEstadoExercicioRef = useRef(limparEstadoExercicio);
  const jogarDominiumInteligenteRef = useRef(null);

  useEffect(() => {
    limparEstadoExercicioRef.current = limparEstadoExercicio;
  }, [limparEstadoExercicio]);

  const falarRef = useRef(null);

  const processarResultadoVoz = useCallback(({ resultado, tentativas, fraseOriginal }) => {
    const idAtual = fraseAtivaGlobal ? fraseAtivaGlobal.id : frasesFiltradas[indice]?.id;
    if (!idAtual) return;
    const zhSalvar = fraseAtivaGlobal ? fraseAtivaGlobal.texto_zh : (frasesFiltradas[indice]?.zh || "");
    const nivelSalvar = fraseAtivaGlobal ? fraseAtivaGlobal.nivel : nivelAtivo;
    const topicoSalvar = fraseAtivaGlobal ? fraseAtivaGlobal.topico : topicoAtivo;
    const traducaoSalvar = fraseAtivaGlobal ? (fraseAtivaGlobal.traducao || "") : (frasesFiltradas[indice]?.[idiomaOrigem] || "");
    const rankObj = frasesMaestria[idAtual];
    const rankAtual = typeof rankObj === 'object' ? rankObj.rank : (rankObj || 0);
    const cursoKey = `${idiomaOrigem}_${idiomaEstudo}`;

    if (resultado === 'acerto') {
      setResultadoFeedback('acerto');
      processandoAcertoRef.current = true;

      if (true) {
        const highestRank = typeof rankObj === 'object' ? (rankObj.highest_rank || rankAtual) : rankAtual;
        const inRecuperacao = typeof rankObj === 'object' && rankObj.status === 'recuperacao';
        const calc = calcularProximoRank(rankAtual, true, highestRank, inRecuperacao);
        const novoObjeto = {
          rank: calc.novoRank,
          status: calc.lista,
          next_review: Date.now() + calc.espera,
          last_review: Date.now(),
          last_attempt_at: Date.now(),
          highest_rank: Math.max(highestRank, calc.novoRank),
          texto: fraseOriginal,
          traducao: traducaoSalvar,
          texto_zh: zhSalvar,
          nivel: nivelSalvar,
          topico: topicoSalvar
        };
        setFrasesMaestria(prev => ({ ...prev, [idAtual]: novoObjeto }));
        setSessaoDominium(prev => ({
          ...prev,
          primeira: (prev.primeira || []).filter(f => (f.frase || f) !== fraseOriginal),
          recuperadas: (prev.recuperadas || []).filter(f => (f.frase || f) !== fraseOriginal),
          acertosTempo: (prev.acertosTempo || []).filter(a => (a.frase || a) !== fraseOriginal),
          falhas: (prev.falhas || []).filter(f => (f.frase || f) !== fraseOriginal)
        }));
        setTimeout(() => {
          setSessaoDominium(prev => ({
            ...prev,
            recuperadas: [
              ...(prev.recuperadas || []).filter(f => (f.frase || f) !== fraseOriginal),
              { frase: fraseOriginal, id: idAtual, curso: cursoKey, nivel: nivelAtivo, topico: topicoAtivo }
            ]
          }));
        }, 30000);
      }

      setFilaErros(prev => prev.filter(item => item.indice !== indice));
      setFilaAcertos(prev => {
        const existe = prev.some(item => item.indice === indice);
        return existe ? prev : [...prev, { indice }];
      });
      const textoFinal = (idiomaEstudo === 'pi' && zhSalvar)
        ? zhSalvar
        : fraseOriginal;
      const tempoAudio = Math.max(fraseOriginal.split(" ").length * 600, 1500);
      if (falarRef.current) falarRef.current(textoFinal, false);
      setTimeout(() => {
        setResultadoFeedback(null);
        setTranscricaoAoVivo("");
        setModoExercicio(false);
        processandoAcertoRef.current = false;
        if (jogarDominiumInteligenteRef.current) {
          jogarDominiumInteligenteRef.current();
        }
      }, tempoAudio);
    } else if (resultado === 'erro') {
      setResultadoFeedback('erro');
      processandoAcertoRef.current = true;
      const highestRank = typeof rankObj === 'object' ? (rankObj.highest_rank || rankAtual) : rankAtual;
      const inRecuperacao = typeof rankObj === 'object' && rankObj.status === 'recuperacao';
      const calc = calcularProximoRank(rankAtual, false, highestRank, inRecuperacao);
      const novoObjeto = {
        rank: calc.novoRank,
        status: calc.lista,
        next_review: Date.now() + calc.espera,
        last_review: Date.now(),
        last_attempt_at: Date.now(),
        highest_rank: Math.max(highestRank, calc.novoRank),
        texto: fraseOriginal,
        traducao: traducaoSalvar,
        texto_zh: zhSalvar,
        nivel: nivelSalvar,
        topico: topicoSalvar
      };
      setFrasesMaestria(prev => ({ ...prev, [idAtual]: novoObjeto }));
      setSessaoDominium(prev => ({
        ...prev,
        falhas: [...(prev.falhas || []).filter(f => (f.frase || f) !== fraseOriginal), { frase: fraseOriginal, id: idAtual, curso: cursoKey }],
        primeira: (prev.primeira || []).filter(f => (f.frase || f) !== fraseOriginal)
      }));
      setFilaAcertos(prev => prev.filter(item => item.indice !== indice));
      setFilaErros(prev => {
        const existe = prev.some(item => item.indice === indice);
        if (existe) return prev;
        return [...prev, { indice, rank: calc.novoRank }];
      });
      const textoFinalErro = (idiomaEstudo === 'pi' && zhSalvar)
        ? zhSalvar
        : fraseOriginal;
      const tempoAudioErro = Math.max((idiomaEstudo === 'pi' ? textoFinalErro.split("").length : fraseOriginal.split(" ").length) * 600, 1000);

      if (falarRef.current) falarRef.current(textoFinalErro, false);
      setTimeout(() => {
        setResultadoFeedback(null);
        setTranscricaoAoVivo("");
        processandoAcertoRef.current = false;
      }, tempoAudioErro);
    }
  }, [indice, frasesFiltradas, idiomaEstudo, idiomaOrigem, frasesMaestria, nivelAtivo, topicoAtivo, modoJogo, setResultadoFeedback, setSessaoDominium, setFrasesMaestria, setFilaErros, setFilaAcertos, setIndice, fraseAtivaGlobal]);

  const jogarDominiumInteligente = useCallback(async () => {
    // Pre-carrega frases ativas da sessao Dominium em segundo plano
    const filaDominium = [
      ...(sessaoDominium?.recuperadas || []),
      ...(sessaoDominium?.primeira || []),
      ...(sessaoDominium?.acertosTempo || [])
    ];
    if (filaDominium.length > 0) precarregarAudios(filaDominium, idiomaEstudo);

    let proximo = avaliarProximoAlvo(frasesFiltradas);
    if (proximo?.dados) precarregarAudios([proximo.dados], idiomaEstudo);

    if (!proximo) {
      limparEstadoExercicio();
      mudarTela('escolherTopic');
      return;
    }

    if (proximo.tipo === 'revisao') {
      setFraseAtivaGlobal(proximo.dados);
      setModoJogo(true);
      setSessaoIniciada(true);
      iniciarExercicio(proximo.dados.rank || 1);
      return;
    }

    if (proximo.tipo === 'inedita') {
      setFraseAtivaGlobal(null);
      if (proximo.indice !== -1 && proximo.indice !== undefined) {
        limparEstadoExercicio();
        setIndice(proximo.indice);
        setModoJogo(false);
        setSessaoIniciada(false);
        setModoExercicio(false);
        mudarTela('estudo');
      } else {
        limparEstadoExercicio();
        mudarTela('escolherTopic');
      }
    }
  }, [frasesFiltradas, avaliarProximoAlvo, setIndice, setModoJogo, setSessaoIniciada, mudarTela, iniciarExercicio, limparEstadoExercicio]);

  useEffect(() => {
    jogarDominiumInteligenteRef.current = jogarDominiumInteligente;
  }, [jogarDominiumInteligente]);

  const {
    estaOuvindo, statusVoz, transcricaoAoVivo, volume,
    falar, iniciarReconhecimentoVoz, pararMonitoramentoAudio,
    setEstaOuvindo, setStatusVoz, setTranscricaoAoVivo
  } = useSpeech({
    idiomaEstudo, temas, frasesFiltradas, indice,
    fraseAtiva: fraseAtivaGlobal,
    onAvaliacaoConcluida: processarResultadoVoz
  });

  useEffect(() => {
    falarRef.current = falar;
  }, [falar]);

  const { aiLoading, aiExplanation, explicarFraseIA } = useAI({
    idiomaOrigem,
    idiomaEstudo,
    nivelAtivo,
    temas,
    apiKey,
    mudarTela
  });

  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    if (['perfil', 'escolherOrigem', 'escolherIdioma', 'menuCurso'].includes(tela)) {
      setTopicoAtivo('');
      setNivelAtivo('');
      setFrasesFiltradas([]);
    }
  }, [idiomaOrigem, idiomaEstudo, tela]);

  useEffect(() => {
    const bootRecuperacao = async () => {
      if (tela !== 'perfil' && tela !== 'escolherOrigem' && tela !== 'escolherIdioma') {
        if (!idiomaOrigem || !idiomaEstudo) {
          mudarTela('perfil');
          return;
        }
      }
      if (tela === 'estudo' && frasesFiltradas.length === 0 && !fraseAtivaGlobal) {
        limparEstadoExercicioRef.current();
        mudarTela('escolherTopic');
      } else if (tela === 'selecaoExercicio' && frasesFiltradas.length === 0) {
        mudarTela('escolherTopic');
      } else if (tela === 'escolherTopic') {
        if (!nivelAtivo) {
          mudarTela('escolherNivel');
        } else if (listaTopicos.length === 0) {
          setCarregandoDados(true);
          const { data } = await dataService.getTopicsByLevel(nivelAtivo, idiomaOrigem, idiomaEstudo);
          if (data) {
            const colTopicOrigem = `topic_${idiomaOrigem}`;
            const topicosUnicos = [...new Set(data.map(f => f[colTopicOrigem]))].filter(Boolean);
            setListaTopicos(topicosUnicos);
          }
          setCarregandoDados(false);
        }
      }
    };
    bootRecuperacao();
  }, [tela, nivelAtivo, topicoAtivo, idiomaOrigem, idiomaEstudo, frasesFiltradas.length, listaTopicos.length, setIndice]);

  useEffect(() => {
    if (idiomaEstudo && temas[idiomaEstudo]) {
      document.body.style.backgroundColor = temas[idiomaEstudo].bg;
    } else {
      document.body.style.backgroundColor = '#000';
    }
  }, [idiomaEstudo, temas]);

  useEffect(() => {
    sessionStorage.setItem('app_tela', tela);
    sessionStorage.setItem('app_origem', idiomaOrigem);
    sessionStorage.setItem('app_estudo', idiomaEstudo);
    sessionStorage.setItem('app_nivel', nivelAtivo);
    sessionStorage.setItem('app_topico', topicoAtivo);
    if (userRole) localStorage.setItem('app_role', userRole);
  }, [tela, idiomaOrigem, idiomaEstudo, nivelAtivo, topicoAtivo, userRole]);

  useEffect(() => {
    if (tela === 'menuCurso' && idiomaEstudo && idiomaOrigem && userRole !== 'adm') {
      setCursosInscritos(prev => {
        const listaSemAtual = prev.filter(c => !(c.origem === idiomaOrigem && c.estudo === idiomaEstudo));
        const cursoAtual = { origem: idiomaOrigem, estudo: idiomaEstudo, nomeEstudo: temas[idiomaOrigem]?.nomes?.[idiomaEstudo] || idiomaEstudo };
        const novaLista = [cursoAtual, ...listaSemAtual];
        localStorage.setItem('cursos_salvos', JSON.stringify(novaLista));
        return novaLista;
      });
    }
  }, [tela, idiomaEstudo, idiomaOrigem, temas, userRole]);

  const selecionarNivel = useCallback(async (n) => {
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
    setNivelAtivo(n);
    setCarregandoDados(true);
    const colTopicOrigem = `topic_${idiomaOrigem}`;
    const { data } = await dataService.getTopicsByLevel(n, idiomaOrigem, idiomaEstudo);
    if (data) {
      const topicosUnicos = [...new Set(data.map(f => f[colTopicOrigem]))].filter(Boolean);
      setListaTopicos(topicosUnicos);
      setCarregandoDados(false);
      mudarTela('escolherTopic');
    } else {
      setCarregandoDados(false);
    }
  }, [idiomaOrigem, idiomaEstudo, mudarTela]);

  const selecionarTopico = useCallback(async (nomeTopico) => {
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
    const colTopicOrigem = `topic_${idiomaOrigem}`;
    setCarregandoDados(true);
    setFrasesFiltradas([]);
    setIndice(0);
    const { data } = await dataService.getSentencesByTopic(nivelAtivo, idiomaEstudo, colTopicOrigem, nomeTopico);
    if (data) {
      precarregarAudios(data, idiomaEstudo);
      setFrasesFiltradas(data);
      setTopicoAtivo(nomeTopico);
      let indexAlvo = 0;
      let menorIdInedito = Infinity;
      let menorIdAbsoluto = Infinity;
      let indexAbsoluto = 0;

      for (let i = 0; i < data.length; i++) {
        const fId = data[i].id;
        const rankObj = frasesMaestria[fId];
        const rank = typeof rankObj === 'object' ? rankObj.rank : (rankObj || 0);

        if (fId < menorIdAbsoluto) {
          menorIdAbsoluto = fId;
          indexAbsoluto = i;
        }

        if (rank === 0 && fId < menorIdInedito) {
          menorIdInedito = fId;
          indexAlvo = i;
        }
      }
      setIndice(menorIdInedito !== Infinity ? indexAlvo : indexAbsoluto);
      setFilaErros([]);
      setFilaAcertos([]);
      setCarregandoDados(false);
      setTimeout(() => mudarTela('estudo'), 50);
    } else {
      setCarregandoDados(false);
    }
  }, [idiomaOrigem, idiomaEstudo, nivelAtivo, mudarTela, frasesMaestria]);

  function iniciarExercicio(numNivel, indiceForcado, arrayFornecido) {
    setExercicioNivel(numNivel);
    if (indiceForcado !== undefined) setIndice(indiceForcado);
    setModoExercicio(true);
    mudarTela('estudo');
  }

  function limparEstadoExercicio() {
    setFraseAtivaGlobal(null);
    setModoExercicio(false);
    setSessaoIniciada(false);
    setExercicioNivel(0);
    setResultadoFeedback(null);
    setTranscricaoAoVivo("");
    setEstaOuvindo(false);
    setStatusVoz('IDLE');
    processandoAcertoRef.current = false;
    if (window.recognitionInstance) {
      try { window.recognitionInstance.abort(); } catch (e) { }
    }
    pararMonitoramentoAudio();
  }

  const resetarProgressoIdioma = useCallback(async () => {
    setFrasesMaestria({});

    setSessaoDominium(prev => ({
      ...prev,
      primeira: (prev.primeira || []).filter(f => f.curso !== `${idiomaOrigem}_${idiomaEstudo}`),
      recuperadas: (prev.recuperadas || []).filter(f => f.curso !== `${idiomaOrigem}_${idiomaEstudo}`),
      acertosTempo: (prev.acertosTempo || []).filter(a => a.curso !== `${idiomaOrigem}_${idiomaEstudo}`),
      falhas: (prev.falhas || []).filter(f => f.curso !== `${idiomaOrigem}_${idiomaEstudo}`)
    }));

    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(`progresso_${idiomaOrigem}_${idiomaEstudo}_`)) {
        localStorage.removeItem(key);
      }
    });

    if (user) {
      const cursoKey = `${idiomaOrigem}_${idiomaEstudo}`;
      await dataService.saveUserProgress(user.id, cursoKey, {});
    }

    mudarTela('perfil');
  }, [idiomaOrigem, idiomaEstudo, user, mudarTela, setFrasesMaestria, setSessaoDominium]);

  const removerCursoIdioma = useCallback(async () => {
    setCursosInscritos(prev => {
      const novaLista = prev.filter(c => !(c.origem === idiomaOrigem && c.estudo === idiomaEstudo));
      localStorage.setItem('cursos_salvos', JSON.stringify(novaLista));
      return novaLista;
    });
    resetarProgressoIdioma();
  }, [idiomaOrigem, idiomaEstudo, resetarProgressoIdioma]);

  useEffect(() => {
    let montado = true;
    let sub = null;
    const inicializarAuth = async () => {
      try {
        const { data: listenerData } = dataService.onAuthChange((_event, session) => {
          if (montado) setUser(session?.user ?? null);
        });
        sub = listenerData?.subscription;
        const { data: authData } = await dataService.signInAnonymously();
        if (montado && authData?.user) setUser(authData.user);
      } catch (err) {
        console.warn("Auth silenciosa indisponível, operando em modo local.");
      }
    };

    inicializarAuth();

    return () => {
      montado = false;
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (!user || !idiomaOrigem || !idiomaEstudo) return;
    const carregarProgressoNuvem = async () => {
      try {
        const cursoKey = `${idiomaOrigem}_${idiomaEstudo}`;
        const { data, error } = await dataService.getUserProgress(user.id, cursoKey);
        if (error) throw error;
        if (data && data.maestria) {
          const agora = Date.now();
          const maestriaNuvem = { ...data.maestria };
          Object.keys(maestriaNuvem).forEach(id => {
            const item = maestriaNuvem[id];
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
                if (nR !== r) maestriaNuvem[id] = { ...item, rank: nR, status: nR === 0 ? 'inedita' : 'recuperacao', next_review: agora };
              }
            }
          });

          setFrasesMaestria(prev => {
            const novaMaestria = { ...prev };
            let houveMudanca = false;
            Object.keys(maestriaNuvem).forEach(id => {
              const objNuvem = maestriaNuvem[id];
              const rankNuvem = typeof objNuvem === 'object' ? objNuvem.rank : (objNuvem || 0);
              const objLocal = novaMaestria[id];
              const rankLocal = typeof objLocal === 'object' ? objLocal.rank : (objLocal || 0);
              if (rankNuvem > rankLocal) {
                novaMaestria[id] = objNuvem;
                houveMudanca = true;
              }
            });
            return houveMudanca ? novaMaestria : prev;
          });
        }
      } catch (err) {
        console.warn("Sincronização de entrada falhou. Usando dados locais.");
      }
    };
    carregarProgressoNuvem();
  }, [user, idiomaOrigem, idiomaEstudo, setFrasesMaestria]);

  useEffect(() => {
    if (!user || !idiomaOrigem || !idiomaEstudo || Object.keys(frasesMaestria).length === 0) return;
    const sincronizarComNuvem = async () => {
      try {
        const cursoKey = `${idiomaOrigem}_${idiomaEstudo}`;
        await dataService.saveUserProgress(user.id, cursoKey, frasesMaestria);
      } catch (err) {
        console.warn("Backup na nuvem falhou. Dados mantidos localmente.");
      }
    };
    const timer = setTimeout(sincronizarComNuvem, 2000);
    return () => clearTimeout(timer);
  }, [frasesMaestria, user, idiomaOrigem, idiomaEstudo]);

  useEffect(() => {
    if (tela !== 'estudo' || !modoExercicio) {
      processandoAcertoRef.current = false;
      if (window.recognitionInstance) {
        try { window.recognitionInstance.abort(); } catch (e) { }
      }
      pararMonitoramentoAudio();
      setEstaOuvindo(false);
      setTranscricaoAoVivo("");
      setStatusVoz('IDLE');
    }
  }, [tela, modoExercicio, indice, exercicioNivel]);

  useEffect(() => {
    const styleTag = document.createElement("style");
    styleTag.innerHTML = `
      * { -ms-overflow-style: none; scrollbar-width: none; }
      *::-webkit-scrollbar { display: none; }
      body { margin: 0; padding: 0; }
    `;
    document.head.appendChild(styleTag);
    const carregarFraseInspiracional = async () => {
      const { data } = await dataService.getInspirationalQuotes();
      if (data && data.length > 0) {
        const salvo = localStorage.getItem('ultimoIndiceInspiracional');
        let proximoIndice = salvo ? (parseInt(salvo, 10) + 1) : 0;
        if (proximoIndice >= data.length) proximoIndice = 0;
        setFraseTeorica(data[proximoIndice].inspirational);
        localStorage.setItem('ultimoIndiceInspiracional', proximoIndice.toString());
      }
    };
    carregarFraseInspiracional();
    const handlePopState = (event) => {
      limparEstadoExercicio();
      if (event.state && event.state.tela) setTela(event.state.tela);
      else setTela('perfil');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (tela === 'estudo' && frasesFiltradas[indice]) {
      const progressoChave = `progresso_${idiomaOrigem}_${idiomaEstudo}_${nivelAtivo}_${topicoAtivo}`;
      localStorage.setItem(progressoChave, indice.toString());
      const currentId = `${indice}_${topicoAtivo}_${idiomaOrigem}_${idiomaEstudo}`;
      if (!modoExercicio && !processandoAcertoRef.current && ultimoAudioID.current !== currentId) {
        const rankObj = frasesMaestria[frasesFiltradas[indice]?.id];
        const rankAtual = typeof rankObj === 'object' ? rankObj.rank : (rankObj || 0);
        if (rankAtual > 0) {
          const textoParaFalar = (idiomaEstudo === 'pi' && frasesFiltradas[indice].zh)
            ? frasesFiltradas[indice].zh
            : frasesFiltradas[indice][idiomaEstudo];
          falar(textoParaFalar, false);
        }
        ultimoAudioID.current = currentId;
      }
    }
  }, [indice, tela, frasesFiltradas]);

  const renderTela = () => {
    if (tela === 'perfil') return (
      <Perfil
        styles={styles} nomeAluno={nomeAluno} fraseTeorica={fraseTeorica}
        setFrasesMaestria={setFrasesMaestria} setSessaoDominium={setSessaoDominium}
        cursosInscritos={cursosInscritos}
      />
    );
    if (tela === 'escolherOrigem') return (
      <EscolherOrigem styles={styles} setIdiomaOrigem={setIdiomaOrigem} />
    );
    if (tela === 'escolherIdioma') return (
      <EscolherEstudo
        styles={styles} setFilaErros={setFilaErros} setFilaAcertos={setFilaAcertos}
      />
    );
    if (tela === 'menuCurso') return (
      <Hub
        styles={styles} acionarFilaJogo={jogarDominiumInteligente}
        resetarProgressoIdioma={resetarProgressoIdioma} removerCursoIdioma={removerCursoIdioma}
      />
    );
    if (tela === 'menuCartoes') return (
      <MenuCartoes styles={styles} acionarFilaJogo={jogarDominiumInteligente} />
    );
    if (tela === 'escolherNivel') return (
      <EscolherNivel
        styles={styles} selecionarNivel={selecionarNivel}
        sessaoDominium={sessaoDominium} frasesMaestria={frasesMaestria}
      />
    );
    if (tela === 'escolherTopic') return (
      <EscolherTopic styles={styles} listaTopicos={listaTopicos} selecionarTopico={selecionarTopico} />
    );
    if (tela === 'selecaoExercicio') return (
      <SelecaoExercicio styles={styles} iniciarExercicio={iniciarExercicio} />
    );
    if (tela === 'adm') return (
      <Adm styles={styles} />
    );
    if (tela === 'explicacaoIA') return (
      <ExplicacaoIA
        styles={styles} aiLoading={aiLoading} aiExplanation={aiExplanation}
        frasesFiltradas={frasesFiltradas} indice={indice} explicarFraseIA={explicarFraseIA}
      />
    );
    if (tela === 'dominiumStats') return (
      <DominiumStats
        styles={styles} sessaoDominium={sessaoDominium}
        frasesFiltradas={frasesFiltradas} frasesMaestria={frasesMaestria}
      />
    );
    if (tela === 'estudo') return (
      <TelaEstudo
        fraseAtivaGlobal={fraseAtivaGlobal}
        frasesFiltradas={frasesFiltradas} indice={indice} nivelAtivo={nivelAtivo} topicoAtivo={topicoAtivo}
        modoExercicio={modoExercicio} exercicioNivel={exercicioNivel} styles={styles}
        carregandoDados={carregandoDados} mostrarTraducao={mostrarTraducao}
        setMostrarTraducao={setMostrarTraducao} falar={falar} explicarFraseIA={explicarFraseIA}
        frasesMaestria={frasesMaestria} setFrasesMaestria={setFrasesMaestria} setModoJogo={setModoJogo}
        setSessaoIniciada={setSessaoIniciada} limparEstadoExercicio={limparEstadoExercicio} statusVoz={statusVoz}
        volume={volume} iniciarReconhecimentoVoz={iniciarReconhecimentoVoz}
        setIndice={setIndice} transcricaoAoVivo={transcricaoAoVivo} iniciarExercicio={iniciarExercicio}
        aiExplanation={aiExplanation} aiLoading={aiLoading} setModoExercicio={setModoExercicio}
        filaErros={filaErros} setFilaErros={setFilaErros} filaAcertos={filaAcertos} setFilaAcertos={setFilaAcertos}
        sessaoDominium={sessaoDominium} setSessaoDominium={setSessaoDominium} jogarDominiumInteligente={jogarDominiumInteligente}
      />
    );
    return null;
  };

  return (
    <DingliProvider
      idiomaOrigem={idiomaOrigem}
      setIdiomaOrigem={setIdiomaOrigem}
      idiomaEstudo={idiomaEstudo}
      setIdiomaEstudo={setIdiomaEstudo}
      userRole={userRole}
      setUserRole={setUserRole}
      mudarTela={mudarTela}
      tela={tela}
    >
      {renderTela()}
    </DingliProvider>
  );
}

export default App;