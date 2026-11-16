import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDingli } from '../DingliContext';
import { supabase } from '../supabaseClient';
import { COR_ACERTO, COR_TOM_CLARO, COR_SUPERFICIE_DIGITACAO } from '../themeColors';
import { calcularProximoRank } from '../useSRSLogic';
import {
  tocarAudioPalavra,
  tocarAudioPalavraComControle,
  tocarAudioPalavraMetronomo,
  precarregarPalavras
} from '../services/audioCacheService';

const normalizarFrase = (str) => (str || "").replace(/\s+([?!:;.,，。！？；：、])/g, "$1").trim();

// Cor de erro exclusiva do Dìnglab (ajuste manual aqui)
const COR_ERRO_DINGLAB = '#ef4444';

const obterOpcoesReporte = (t) => [
  t?.reportAudio || "Áudio",
  t?.reportSentence || "Frase do exercício",
  t?.reportTranslation || "Tradução",
  t?.reportTypingDiff || "Dificuldade para digitar",
  t?.reportVoiceDiff || "Dificuldade para gravação da fala"
];

export default function Dinglab({
  styles,
  falar,
  iniciarReconhecimentoVoz,
  pararEAvaliarVoz,
  statusVoz,
  setStatusVoz,
  transcricaoAoVivo,
  setTranscricaoAoVivo,
  volume,
  explicarFraseIA,
  frasesMaestria = {},
  setFrasesMaestria,
  user,
  onAvaliacaoDinglabRef,
  indice: indiceProp = 0,
  setIndice: setIndiceProp,
  jogarDominiumInteligente,
  rotacionarBandeja
}) {
  const { temas, t, navStyle, idiomaEstudo, idiomaOrigem, mudarTela, getCorFonteDinamica } = useDingli();

  const [modoPitstop, setModoPitstop] = useState(() => {
    return sessionStorage.getItem('dinglab_modo_pitstop') === 'true';
  });
  const [lista, setLista] = useState([]);
  const [indiceLocal, setIndiceLocal] = useState(indiceProp);
  const indice = indiceProp !== undefined ? indiceProp : indiceLocal;
  const indiceRef = useRef(indice);
  useEffect(() => {
    indiceRef.current = indice;
  }, [indice]);

  const setIndice = useCallback((val) => {
    const novo = typeof val === 'function' ? val(indiceRef.current) : val;
    setIndiceLocal(novo);
    if (setIndiceProp) setIndiceProp(novo);
  }, [setIndiceProp]);

  const [alturaTela, setAlturaTela] = useState(window.innerHeight);
  const [audioLento, setAudioLento] = useState(false);
  const [resultadoFeedback, setResultadoFeedback] = useState(null);
  const [feedbackMensagem, setFeedbackMensagem] = useState("");
  const [transcricaoFixa, setTranscricaoFixa] = useState("");

  // ESCALA 5: Estados da Prova de Fogo
  const [modoProva, setModoProva] = useState(false);
  const modoProvaRef = useRef(false);
  modoProvaRef.current = modoProva;
  const [toastVisible, setToastVisible] = useState(false);

  // Gravação da própria voz para o Modo Espelho Real
  const [audioGravadoUrl, setAudioGravadoUrl] = useState(null);
  const [tocandoMinhaVoz, setTocandoMinhaVoz] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioMinhaVozRef = useRef(null);

  // Praticar repetição palavra por palavra
  const [tocandoRepeticao, setTocandoRepeticao] = useState(false);
  const [palavraAtivaRepeticao, setPalavraAtivaRepeticao] = useState(null);
  const [faseRepeticao, setFaseRepeticao] = useState(null);
  const abortarAudioAtivoRef = useRef(null);
  const timerEsperaRef = useRef(null);
  const repeticaoAtivaRef = useRef(false);
  const resolverEsperaRef = useRef(null);

  // Modal de Reporte
  const [modalReporteAberto, setModalReporteAberto] = useState(false);
  const [opcoesSelecionadas, setOpcoesSelecionadas] = useState([]);
  const [outroTexto, setOutroTexto] = useState("");
  const [enviandoReporte, setEnviandoReporte] = useState(false);
  const [reporteEnviado, setReporteEnviado] = useState(false);

  const chaveDinglab = `dinglab_${idiomaOrigem}_${idiomaEstudo}`;

  // 1. Carrega frases retidas no Dìnglab
  useEffect(() => {
    if (!idiomaOrigem || !idiomaEstudo) return;
    try {
      const salvo = localStorage.getItem(chaveDinglab);
      if (salvo) {
        const arr = JSON.parse(salvo);
        const listaCarregada = Array.isArray(arr) ? arr : [];
        setLista(listaCarregada);

        const targetId = sessionStorage.getItem('dinglab_card_id');
        if (targetId) {
          sessionStorage.removeItem('dinglab_card_id');
          const idx = listaCarregada.findIndex(item => Number(item.id) === Number(targetId));
          if (idx !== -1) {
            setIndice(idx + 1);
          } else {
            setIndice(listaCarregada.length > 0 ? 1 : 0);
          }
        } else {
          setIndice(listaCarregada.length > 0 ? 1 : 0);
        }
      } else {
        setLista([]);
      }
    } catch (e) {
      setLista([]);
    }
  }, [chaveDinglab, idiomaOrigem, idiomaEstudo, setIndice]);

  // Trava contra índices superiores ao tamanho real da lista
  useEffect(() => {
    if (lista.length > 0 && indice > lista.length) {
      setIndice(lista.length);
    }
  }, [lista.length, indice, setIndice]);

  // 2. Altura dinâmica da viewport
  useEffect(() => {
    const handleResize = () => setAlturaTela(window.visualViewport?.height || window.innerHeight);
    window.visualViewport?.addEventListener('resize', handleResize);
    window.addEventListener('resize', handleResize);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const ehCardZero = indice === 0;
  const fraseAtual = !ehCardZero ? (lista[indice - 1] || null) : null;
  const textoEstudo = fraseAtual ? normalizarFrase(fraseAtual[idiomaEstudo] || fraseAtual.texto || fraseAtual.en || "") : "";
  const traducaoTexto = fraseAtual ? (fraseAtual[idiomaOrigem] || fraseAtual.traducao || "") : "";

  // Pré-aquecimento das palavras do card ativo na RAM
  useEffect(() => {
    if (!textoEstudo) return;
    const pws = textoEstudo.split(/\s+/).map(w => w.replace(/[.,!?;:¿¡"“”`{}()[\]\-—…，。！？；：、«»/\\~*]/g, "").trim()).filter(Boolean);
    if (pws.length > 0) precarregarPalavras(pws, idiomaEstudo);
  }, [textoEstudo, idiomaEstudo]);

  // 3. Callback de conclusão de fala: MODO ESPELHO vs PROVA DE FOGO (ESCALA 5)
  const timerFeedbackRef = useRef(null);

  // Limpa o timer de transição estritamente ao desmontar o componente Dìnglab
  useEffect(() => {
    return () => {
      if (timerFeedbackRef.current) clearTimeout(timerFeedbackRef.current);
    };
  }, []);
  useEffect(() => {
    if (onAvaliacaoDinglabRef) {
      onAvaliacaoDinglabRef.current = ({ resultado }) => {
        if (!fraseAtual) return;
        if (timerFeedbackRef.current) clearTimeout(timerFeedbackRef.current);

        if (!modoProvaRef.current) {
          // ==================== MODO ESPELHO (TREINO LIVRE) ====================
          setResultadoFeedback(resultado);
          setFeedbackMensagem("");

          timerFeedbackRef.current = setTimeout(() => {
            setResultadoFeedback(null);
            setTranscricaoFixa("");
            if (setTranscricaoAoVivo) setTranscricaoAoVivo("");
            if (setStatusVoz) setStatusVoz('IDLE');
          }, 3000);

        } else {
          // ==================== PROVA DE FOGO (DECISÃO FINAL) ====================
          if (resultado === 'acerto') {
            setResultadoFeedback('acerto');
            setFeedbackMensagem(t?.dinglabRetornoDingloop || "Boa pronúncia! A frase voltou para o Dìngloop.");

            const idAtual = fraseAtual.id;
            const rankObj = frasesMaestria[idAtual];
            const rankAtual = Number(fraseAtual.rank) || (typeof rankObj === 'object' ? rankObj.rank : (rankObj || 0)) || 1;
            const highestRank = Math.max((typeof rankObj === 'object' ? (rankObj.highest_rank || rankAtual) : rankAtual), rankAtual);

            // Mantém estritamente o rank atual (sem evoluir nem regredir) e define next_review para agora
            const novoObjeto = {
              ...(typeof rankObj === 'object' ? rankObj : {}),
              rank: rankAtual,
              status: (typeof rankObj === 'object' && rankObj.status) ? rankObj.status : 'recuperacao',
              next_review: Date.now(),
              last_review: Date.now(),
              last_attempt_at: Date.now(),
              highest_rank: highestRank,
              texto: textoEstudo,
              traducao: traducaoTexto,
              texto_zh: fraseAtual?.zh || "",
              nivel: fraseAtual?.nivel || "A1",
              topico: fraseAtual?.topico || ""
            };

            // Atualiza Maestria e persiste localmente
            if (setFrasesMaestria) {
              setFrasesMaestria(prev => {
                const nova = { ...prev, [idAtual]: novoObjeto };
                try {
                  const chaveMaestria = `maestria_${idiomaOrigem}_${idiomaEstudo}`;
                  localStorage.setItem(chaveMaestria, JSON.stringify(nova));
                } catch (e) { }
                return nova;
              });
            }

            // Remove a frase superada do Dìnglab localmente
            let novaLista = [];
            try {
              const salvo = localStorage.getItem(chaveDinglab);
              if (salvo) {
                const arr = JSON.parse(salvo);
                novaLista = arr.filter(item => item.id !== idAtual);
                localStorage.setItem(chaveDinglab, JSON.stringify(novaLista));
              }
            } catch (e) { }

            // Emite reporte silencioso ao Supabase
            supabase.from("reports_frases").insert([{
              frase_id: idAtual,
              idioma_estudo: idiomaEstudo,
              idioma_origem: idiomaOrigem,
              voz: "v1",
              tipo_problema: "Dìnglab (Superada na Prova de Fogo)",
              observacao: `Retornou ao Dìngloop no Rank ${rankAtual} pelo aluno`,
              resolvido: true
            }]).then(() => { }).catch(err => console.warn('[Dìnglab] Erro 2o reporte:', err));

            // Toca o áudio da frase mais uma vez em velocidade normal (idêntico ao Dìngloop)
            const alvoAudio = {
              id: idAtual,
              texto: (idiomaEstudo === 'pi' && fraseAtual.zh) ? fraseAtual.zh : textoEstudo,
              dinglab: true
            };
            if (falar) {
              falar(alvoAudio, false);
            }

            if (setStatusVoz) setStatusVoz('IDLE');

          } else {
            // Reprovação na Prova de Fogo: ZERO punição (toca correção e retorna ao neutro após 3s)
            setResultadoFeedback('erro');
            setFeedbackMensagem("");
            setModoProva(false);
            if (setStatusVoz) setStatusVoz('IDLE');
            if (setTranscricaoAoVivo) setTranscricaoAoVivo("");

            if (falar) {
              falar({
                id: fraseAtual.id,
                texto: (idiomaEstudo === 'pi' && fraseAtual.zh) ? fraseAtual.zh : textoEstudo,
                dinglab: true,
                sortearDiferente: true
              }, false);
            }

            timerFeedbackRef.current = setTimeout(() => {
              setResultadoFeedback(null);
              setTranscricaoFixa("");
            }, 3000);
          }
        }
      };
    }
    return () => {
      if (onAvaliacaoDinglabRef) onAvaliacaoDinglabRef.current = null;
    };
  }, [
    onAvaliacaoDinglabRef, fraseAtual, textoEstudo, traducaoTexto, frasesMaestria,
    setFrasesMaestria, idiomaOrigem, idiomaEstudo, chaveDinglab, indice, setIndice,
    t, setStatusVoz, setTranscricaoAoVivo, falar
  ]);

  useEffect(() => {
    if (transcricaoAoVivo) {
      setTranscricaoFixa(transcricaoAoVivo);
    }
  }, [transcricaoAoVivo]);

  useEffect(() => {
    if (statusVoz !== 'RECORDING') {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try { mediaRecorderRef.current.stop(); } catch (e) { }
      }
    }
  }, [statusVoz]);

  const pararTodaRepeticao = useCallback(() => {
    repeticaoAtivaRef.current = false;
    if (abortarAudioAtivoRef.current) {
      abortarAudioAtivoRef.current();
      abortarAudioAtivoRef.current = null;
    }
    if (timerEsperaRef.current) {
      clearTimeout(timerEsperaRef.current);
      timerEsperaRef.current = null;
    }
    if (resolverEsperaRef.current) {
      resolverEsperaRef.current();
      resolverEsperaRef.current = null;
    }
    setTocandoRepeticao(false);
    setPalavraAtivaRepeticao(null);
    setFaseRepeticao(null);
  }, []);

  const esperarMs = useCallback((ms) => {
    return new Promise((resolve) => {
      resolverEsperaRef.current = resolve;
      timerEsperaRef.current = setTimeout(() => {
        resolverEsperaRef.current = null;
        timerEsperaRef.current = null;
        resolve();
      }, ms);
    });
  }, []);

  useEffect(() => {
    setAudioLento(false);
    setModoProva(false);
    setToastVisible(false);
    setResultadoFeedback(null);
    setFeedbackMensagem("");
    setTranscricaoFixa("");
    if (setTranscricaoAoVivo) setTranscricaoAoVivo("");

    setAudioGravadoUrl(null);
    setTocandoMinhaVoz(false);
    if (audioMinhaVozRef.current) {
      audioMinhaVozRef.current.pause();
      audioMinhaVozRef.current = null;
    }

    pararTodaRepeticao();
  }, [indice, fraseAtual?.id, setTranscricaoAoVivo, pararTodaRepeticao]);

  const ns = navStyle(idiomaEstudo);
  const corDinamica = (getCorFonteDinamica && idiomaEstudo)
    ? getCorFonteDinamica(idiomaEstudo)
    : (temas[idiomaEstudo]?.bg || "#0f172a");

  // Botão Ouvir / Lento
  const handleOuvirClick = useCallback(() => {
    if (!fraseAtual) return;
    const alvo = {
      id: fraseAtual.id,
      texto: (idiomaEstudo === 'pi' && fraseAtual.zh) ? fraseAtual.zh : textoEstudo,
      dinglab: true
    };
    if (!audioLento) {
      falar(alvo, false);
      setAudioLento(true);
    } else {
      falar(alvo, true);
      setAudioLento(false);
    }
  }, [audioLento, fraseAtual, idiomaEstudo, textoEstudo, falar]);

  // Botão Falar Agora (Prova de Fogo oficial)
  const handleFalarAgora = useCallback(() => {
    if (!fraseAtual) return;
    if (statusVoz === 'RECORDING') {
      if (pararEAvaliarVoz) pararEAvaliarVoz();
    } else if (statusVoz === 'IDLE') {
      setModoProva(true);
      modoProvaRef.current = true;
      setResultadoFeedback(null);
      setFeedbackMensagem("");
      setTranscricaoFixa("");
      if (setTranscricaoAoVivo) setTranscricaoAoVivo("");

      const alvoVoz = {
        ...fraseAtual,
        [idiomaEstudo]: textoEstudo,
        texto: textoEstudo
      };
      iniciarReconhecimentoVoz(alvoVoz);
    }
  }, [statusVoz, pararEAvaliarVoz, iniciarReconhecimentoVoz, fraseAtual, idiomaEstudo, textoEstudo, setTranscricaoAoVivo]);

  // Reproduzir gravação do aluno
  const handleReproduzirMinhaVoz = useCallback(() => {
    if (!audioGravadoUrl || tocandoMinhaVoz) return;
    if (audioMinhaVozRef.current) {
      audioMinhaVozRef.current.pause();
      audioMinhaVozRef.current = null;
    }
    const audio = new Audio(audioGravadoUrl);
    audioMinhaVozRef.current = audio;
    setTocandoMinhaVoz(true);
    audio.onended = () => {
      setTocandoMinhaVoz(false);
      audioMinhaVozRef.current = null;
    };
    audio.onerror = () => {
      setTocandoMinhaVoz(false);
      audioMinhaVozRef.current = null;
    };
    audio.play().catch(() => setTocandoMinhaVoz(false));
  }, [audioGravadoUrl, tocandoMinhaVoz]);

  // Metrônomo contínuo
  const handlePraticarRepeticao = useCallback(async () => {
    if (tocandoRepeticao) {
      pararTodaRepeticao();
      return;
    }
    if (!textoEstudo) return;

    const palavras = textoEstudo.split(" ").filter(p => p.trim() !== "");
    if (palavras.length === 0) return;

    pararTodaRepeticao();
    repeticaoAtivaRef.current = true;
    setTocandoRepeticao(true);

    for (let i = 0; i < palavras.length; i++) {
      if (!repeticaoAtivaRef.current) break;

      const palavra = palavras[i];

      await new Promise((resolve) => {
        let disparado = false;
        const onSomSaiu = () => {
          if (disparado || !repeticaoAtivaRef.current) return;
          disparado = true;
          resolve();
        };

        const { abortar } = tocarAudioPalavraMetronomo(palavra, idiomaEstudo, onSomSaiu);
        abortarAudioAtivoRef.current = abortar;
      });

      if (!repeticaoAtivaRef.current) break;

      await esperarMs(333);
      if (!repeticaoAtivaRef.current) break;

      setPalavraAtivaRepeticao(i);
      setFaseRepeticao('ouvir');
      await esperarMs(1000);
      if (!repeticaoAtivaRef.current) break;

      setFaseRepeticao('repetir');
      await esperarMs(1000);
      if (!repeticaoAtivaRef.current) break;

      setPalavraAtivaRepeticao(null);
      setFaseRepeticao(null);
    }

    pararTodaRepeticao();
  }, [tocandoRepeticao, textoEstudo, idiomaEstudo, pararTodaRepeticao, esperarMs]);

  // ESCALA 5: Disparo oficial da Prova de Fogo ("Pronto")
  const handleDispararPronto = useCallback(() => {
    if (!fraseAtual || statusVoz !== 'IDLE') return;
    setModoProva(true);
    setResultadoFeedback(null);
    setFeedbackMensagem("");
    setTranscricaoFixa("");
    if (setTranscricaoAoVivo) setTranscricaoAoVivo("");

    const alvoVoz = {
      ...fraseAtual,
      [idiomaEstudo]: textoEstudo,
      texto: textoEstudo
    };
    iniciarReconhecimentoVoz(alvoVoz);
  }, [statusVoz, iniciarReconhecimentoVoz, fraseAtual, idiomaEstudo, textoEstudo, setTranscricaoAoVivo]);

  // Modal de Reporte
  const resetarModalReporte = useCallback(() => {
    setModalReporteAberto(false);
    setOpcoesSelecionadas([]);
    setOutroTexto("");
    setEnviandoReporte(false);
    setReporteEnviado(false);
  }, []);

  const toggleOpcao = (op) => {
    if (reporteEnviado) return;
    setOpcoesSelecionadas(prev =>
      prev.includes(op) ? prev.filter(item => item !== op) : [...prev, op]
    );
  };

  const enviarReporte = useCallback(async () => {
    const problemas = [...opcoesSelecionadas];
    if (outroTexto.trim()) problemas.push(`Outro: ${outroTexto.trim()}`);
    if (problemas.length === 0) return;
    setEnviandoReporte(true);
    try {
      const payload = {
        frase_id: fraseAtual?.id || 0,
        idioma_estudo: idiomaEstudo,
        idioma_origem: idiomaOrigem,
        voz: "v1",
        tipo_problema: problemas.join(", "),
        observacao: outroTexto.trim() || null,
        resolvido: false
      };
      await supabase.from("reports_frases").insert([payload]);
      setReporteEnviado(true);
    } catch (err) {
      console.error("[Reporte] Erro:", err);
      setReporteEnviado(true);
    } finally {
      setEnviandoReporte(false);
    }
  }, [fraseAtual, idiomaEstudo, idiomaOrigem, opcoesSelecionadas, outroTexto]);

  const handleAvancarAposAcerto = useCallback(() => {
    if (timerFeedbackRef.current) {
      clearTimeout(timerFeedbackRef.current);
      timerFeedbackRef.current = null;
    }

    const ehPitstop = sessionStorage.getItem('dinglab_modo_pitstop') === 'true';
    if (ehPitstop) {
      sessionStorage.removeItem('dinglab_modo_pitstop');
      if (rotacionarBandeja && fraseAtual) {
        rotacionarBandeja(fraseAtual.id, false);
      }
      if (jogarDominiumInteligente) {
        jogarDominiumInteligente();
      }
      return;
    }

    let novaLista = [];
    try {
      const salvo = localStorage.getItem(chaveDinglab);
      novaLista = salvo ? JSON.parse(salvo) : [];
    } catch (e) {
      novaLista = [];
    }

    setLista(novaLista);
    setModoProva(false);
    modoProvaRef.current = false;
    setResultadoFeedback(null);
    setFeedbackMensagem("");
    setTranscricaoFixa("");
    setAudioGravadoUrl(null);
    if (setTranscricaoAoVivo) setTranscricaoAoVivo("");
    if (setStatusVoz) setStatusVoz('IDLE');

    if (novaLista.length === 0) {
      setIndice(0);
    } else if (indice > novaLista.length) {
      setIndice(novaLista.length);
    }
  }, [chaveDinglab, fraseAtual, rotacionarBandeja, jogarDominiumInteligente, indice, setIndice, setTranscricaoAoVivo, setStatusVoz]);

  const handleVoltarAoDingloop = useCallback(() => {
    sessionStorage.removeItem('dinglab_modo_pitstop');
    setModoPitstop(false);
    if (jogarDominiumInteligente) {
      jogarDominiumInteligente();
    } else {
      mudarTela('menuCartoes');
    }
  }, [jogarDominiumInteligente, mudarTela]);

  // Tela de conclusão ("Dìnglab em dia!")
  if (lista.length === 0) {
    return (
      <div style={{ ...styles.viewport, backgroundColor: temas[idiomaEstudo]?.bg || '#0f172a', height: alturaTela, position: 'absolute', top: 0, left: 0, width: '100%' }}>
        <div style={{ ...styles.mobileContainer, justifyContent: 'flex-start' }}>
          <button
            onClick={() => {
              sessionStorage.removeItem('dinglab_modo_pitstop');
              mudarTela('menuCartoes');
            }}
            style={{ ...styles.btnNavTopo, backgroundColor: ns.bg, color: ns.txt }}
          >
            ← {t?.quit || 'Sair'}
          </button>
          <div
            style={{
              ...styles.cardFixoRelativo,
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.45)',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)',
              margin: 'auto auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '36px 20px',
              textAlign: 'center'
            }}
          >
            <h3 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#1e293b', marginBottom: '12px' }}>
              {t?.dinglabVazioTitulo || "Dìnglab em dia!"}
            </h3>
            <p style={{ fontSize: '0.95rem', color: '#334155', fontWeight: '600', lineHeight: '1.5', maxWidth: '320px', margin: 0 }}>
              {t?.dinglabVazioDesc || "Nenhuma frase pendente no momento. Todas as suas frases estão liberadas para o ciclo de estudos."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...styles.viewport, backgroundColor: temas[idiomaEstudo]?.bg || '#0f172a', height: alturaTela, position: 'absolute', top: 0, left: 0, width: '100%' }}>
      <div style={{ ...styles.mobileContainer, justifyContent: 'flex-start' }}>

        <button
          onClick={() => {
            sessionStorage.removeItem('dinglab_modo_pitstop');
            mudarTela('menuCartoes');
          }}
          style={{ ...styles.btnNavTopo, backgroundColor: ns.bg, color: ns.txt }}
        >
          ← {t?.quit || 'Sair'}
        </button>

        <div
          style={{
            ...styles.cardFixoRelativo,
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: '2px solid',
            borderColor: resultadoFeedback === 'acerto'
              ? COR_ACERTO
              : (resultadoFeedback === 'erro' ? COR_ERRO_DINGLAB : 'rgba(255, 255, 255, 0.45)'),
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.16)',
            position: 'relative',
            margin: '0 auto',
            outline: 'none',
            display: 'flex',
            flexDirection: 'column',
            transition: 'border-color 0.25s ease, box-shadow 0.25s ease'
          }}
        >
          {/* Bandeirinha ⚑ */}
          {!ehCardZero && (
            <button
              type="button"
              onClick={() => {
                setOpcoesSelecionadas([]);
                setOutroTexto("");
                setReporteEnviado(false);
                setModalReporteAberto(true);
              }}
              title={t?.reportModalTitle || "Reportar problema"}
              style={{
                position: "absolute",
                top: "14px",
                left: "16px",
                background: "none",
                border: "none",
                padding: "6px",
                cursor: "pointer",
                color: '#1e293b',
                opacity: 0.45,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
                lineHeight: 1
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.45")}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" y1="22" x2="4" y2="15" />
              </svg>
            </button>
          )}

          {/* Modal de Reporte */}
          {modalReporteAberto && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: temas[idiomaEstudo]?.bg || "#4d6395",
                borderRadius: "26px",
                padding: "20px 18px",
                display: "flex",
                flexDirection: "column",
                zIndex: 25,
                boxSizing: "border-box",
                overflowY: "auto"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: "800", color: "#ffffff", whiteSpace: "nowrap", letterSpacing: "0.2px" }}>
                  {t?.reportModalHeading || "Encontrou problemas? Mande pra gente:"}
                </span>
                <button
                  type="button"
                  onClick={resetarModalReporte}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ffffff",
                    opacity: 0.8,
                    fontSize: "1.2rem",
                    cursor: "pointer",
                    padding: "0 0 0 10px",
                    lineHeight: "1"
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "14px" }}>
                {obterOpcoesReporte(t).map((op) => {
                  const selecionado = opcoesSelecionadas.includes(op);
                  return (
                    <button
                      key={op}
                      type="button"
                      disabled={reporteEnviado}
                      onClick={() => toggleOpcao(op)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: selecionado ? ("2px solid " + corDinamica) : "1px solid rgba(255,255,255,0.25)",
                        backgroundColor: "#ffffff",
                        color: "#1e293b",
                        fontSize: "0.9rem",
                        fontWeight: selecionado ? "800" : "600",
                        textAlign: "left",
                        cursor: reporteEnviado ? "default" : "pointer",
                        boxShadow: selecionado ? "0 0 0 2px rgba(255,255,255,0.5)" : "none"
                      }}
                    >
                      {op}
                    </button>
                  );
                })}

                <input
                  type="text"
                  disabled={reporteEnviado}
                  value={outroTexto}
                  onChange={(e) => setOutroTexto(e.target.value)}
                  placeholder={t?.reportOtherPlaceholder || "Outro: descreva aqui..."}
                  maxLength={150}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: outroTexto.trim() ? ("2px solid " + corDinamica) : "1px solid rgba(255,255,255,0.25)",
                    backgroundColor: "#ffffff",
                    color: "#1e293b",
                    fontSize: "0.9rem",
                    fontWeight: outroTexto.trim() ? "800" : "600",
                    outline: "none",
                    boxSizing: "border-box",
                    boxShadow: outroTexto.trim() ? "0 0 0 2px rgba(255,255,255,0.5)" : "none"
                  }}
                />
              </div>

              <div style={{ marginTop: "auto", paddingTop: "8px" }}>
                <button
                  type="button"
                  disabled={(!opcoesSelecionadas.length && !outroTexto.trim()) || enviandoReporte}
                  onClick={enviarReporte}
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor: ((!opcoesSelecionadas.length && !outroTexto.trim()) || enviandoReporte)
                      ? "rgba(255,255,255,0.3)"
                      : corDinamica,
                    color: "#ffffff",
                    fontSize: "1rem",
                    fontWeight: "800",
                    cursor: ((!opcoesSelecionadas.length && !outroTexto.trim()) || enviandoReporte) ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
                  }}
                >
                  {reporteEnviado ? "✔ Enviado!" : (enviandoReporte ? (t?.sending || "Enviando...") : (t?.send || "Enviar"))}
                </button>
              </div>
            </div>
          )}

          {/* CONTEÚDO */}
          {ehCardZero ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '6px 4px', overflowY: 'auto' }}>
              <div style={{ textAlign: 'center', width: '100%', flexShrink: 0 }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '4px 16px',
                    borderRadius: '20px',
                    backgroundColor: 'rgba(255, 255, 255, 0.6)',
                    color: '#0f172a',
                    fontSize: '0.86rem',
                    fontWeight: '900',
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    marginBottom: '8px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
                  }}
                >
                  Dìnglab
                </span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: '900', color: '#0f172a', margin: '4px 0 2px 0' }}>
                  Laboratório de Pronúncia
                </h2>
                <span style={{ fontSize: '0.84rem', color: '#334155', fontWeight: '700' }}>
                  Modo Espelho • Treino Livre
                </span>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.55)', borderRadius: '14px', padding: '12px 14px', border: '1px solid rgba(255,255,255,0.65)' }}>
                  <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.92rem', marginBottom: '3px' }}>
                    🎙️ Por que você está aqui?
                  </div>
                  <div style={{ fontSize: '0.84rem', color: '#334155', lineHeight: '1.45', fontWeight: '600' }}>
                    Esta frase precisava de um pouco mais de atenção na sua fala. Aqui você pode praticá-la com calma e sem qualquer pressão.
                  </div>
                </div>

                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.55)', borderRadius: '14px', padding: '12px 14px', border: '1px solid rgba(255,255,255,0.65)' }}>
                  <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.92rem', marginBottom: '3px' }}>
                    🛡️ Zero Punição
                  </div>
                  <div style={{ fontSize: '0.84rem', color: '#334155', lineHeight: '1.45', fontWeight: '600' }}>
                    No Modo Espelho você pode errar quantas vezes quiser: não há perda de rank nem limite de tentativas.
                  </div>
                </div>

                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.55)', borderRadius: '14px', padding: '12px 14px', border: '1px solid rgba(255,255,255,0.65)' }}>
                  <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.92rem', marginBottom: '3px' }}>
                    ✨ Dicas para praticar
                  </div>
                  <div style={{ fontSize: '0.84rem', color: '#334155', lineHeight: '1.45', fontWeight: '600' }}>
                    Ouça a frase em velocidade normal ou lenta, toque nas palavras para escutar sons isolados e repita até se sentir seguro.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Topo do Card */}
              <div style={{ textAlign: 'center', width: '100%', flexShrink: 0 }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '3px 14px',
                    borderRadius: '16px',
                    backgroundColor: 'rgba(255, 255, 255, 0.65)',
                    color: '#0f172a',
                    fontSize: '0.82rem',
                    fontWeight: '900',
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    marginBottom: '10px',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  Dìnglab
                </span>

                <div style={{ color: '#1e293b', lineHeight: '1.25', fontSize: '1.15rem', fontWeight: '700', textAlign: 'center', width: '100%', padding: '0 8px' }}>
                  {traducaoTexto}
                </div>

                {idiomaEstudo === 'pi' && fraseAtual?.zh && (
                  <div style={{ color: '#475569', fontSize: '0.95rem', fontWeight: '600', marginTop: '4px' }}>
                    {fraseAtual.zh}
                  </div>
                )}
              </div>

              {/* Centro do Card */}
              <div style={{ ...styles.areaFraseCentralFlex, flex: 1, padding: '10px 0', overflow: 'visible' }}>
                <div style={{ textAlign: 'center', width: '100%', position: 'relative' }}>
                  <p style={{ ...styles.textoFrasePrincipal, color: '#0f172a' }}>
                    {(() => {
                      let currentZhIndex = 0;
                      const zhLimpo = fraseAtual?.zh ? fraseAtual.zh.replace(/[.,!?;:¿¡"'{}()\[\]\-—…，。！？；：、]/g, "").replace(/\s+/g, "") : "";
                      const estaEmFeedbackOuGravacao = statusVoz === 'RECORDING' || resultadoFeedback !== null;
                      const falaEfetiva = estaEmFeedbackOuGravacao ? (transcricaoAoVivo || transcricaoFixa || "") : "";
                      const tLimpa = falaEfetiva.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss").toLowerCase().replace(/[.,!?;:¿¡"'{}()\[\]\-—…，。！？；：、]/g, "").trim();
                      const ehAcertoTotal = resultadoFeedback === 'acerto';

                      return textoEstudo.split(" ").map((word, i) => {
                        const normalizarPalavra = (term) => (term || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss").toLowerCase().replace(/[.,!?;:¿¡"'{}()\[\]\-—…，。！？；：、]/g, "").trim();
                        let pLimpa = normalizarPalavra(word);

                        if (idiomaEstudo === 'pi') {
                          const numSyllables = (word.match(/[aeiouüáéíóúàèìòùǎěǐǒǔāēīōū]+/gi) || [1]).length;
                          pLimpa = zhLimpo.substring(currentZhIndex, currentZhIndex + numSyllables);
                          currentZhIndex += numSyllables;
                        }

                        const estaNaFala = ehAcertoTotal || (pLimpa && pLimpa.length > 0 && (idiomaEstudo === 'pi' ? pLimpa.split('').every(char => tLimpa.includes(char)) : tLimpa.includes(pLimpa)));

                        let cor = '#0f172a';
                        if (estaNaFala) {
                          cor = COR_ACERTO;
                        } else if (resultadoFeedback === 'erro') {
                          cor = COR_ERRO_DINGLAB;
                        }

                        const ehPalavraAtivaRepeticao = palavraAtivaRepeticao === i;

                        let estiloRepeticao = {};
                        if (ehPalavraAtivaRepeticao) {
                          if (faseRepeticao === 'ouvir') {
                            estiloRepeticao = {
                              backgroundColor: corDinamica,
                              color: '#ffffff',
                              borderRadius: '4px'
                            };
                          } else if (faseRepeticao === 'repetir') {
                            estiloRepeticao = {
                              backgroundColor: '#ffffff',
                              color: '#0f172a',
                              borderRadius: '4px'
                            };
                          }
                        }

                        return (
                          <span
                            key={i}
                            onClick={() => tocarAudioPalavra(word, idiomaEstudo)}
                            title={t?.touchToListenTooltip || "Toque para ouvir a pronúncia isolada"}
                            style={{
                              color: cor,
                              backgroundColor: 'transparent',
                              display: 'inline-block',
                              marginRight: '5px',
                              cursor: 'pointer',
                              userSelect: 'none',
                              transition: 'background-color 0.15s ease, color 0.15s ease',
                              ...estiloRepeticao
                            }}
                            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.92)'; }}
                            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                          >
                            {word}
                          </span>
                        );
                      });
                    })()}
                  </p>

                  <div style={{ marginTop: '12px', fontSize: '0.84rem', color: '#334155', fontWeight: '700', textAlign: 'center' }}>
                    {t?.touchToListen || "Toque na palavra para ouvir a pronúncia"}
                  </div>

                  {resultadoFeedback === 'acerto' && (
                    <div
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '100%',
                        transform: 'translateX(-50%)',
                        marginTop: '22px',
                        backgroundColor: COR_TOM_CLARO,
                        color: corDinamica,
                        fontSize: 'clamp(1.2rem, 7vw, 1.53rem)',
                        fontWeight: '900',
                        padding: '6px 18px',
                        borderRadius: '12px',
                        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)',
                        whiteSpace: 'nowrap',
                        zIndex: 20,
                        pointerEvents: 'none'
                      }}
                    >
                      {t?.dinglabBoaPronuncia || "Boa pronúncia!"}
                    </div>
                  )}
                </div>
              </div>

              {/* BARRA DE 6 BOTÕES */}
              {(() => {
                const ehAcertoTravado = resultadoFeedback === 'acerto';
                const estiloDesativadoAcerto = {
                  border: '1px solid rgba(0, 0, 0, 0.12)',
                  backgroundColor: 'rgba(255, 255, 255, 0.35)',
                  color: '#64748b',
                  cursor: 'not-allowed',
                  opacity: 0.5,
                  boxShadow: 'none'
                };

                return (
                  <div id="area-botoes-card" style={{ ...styles.bottomCardAreaFixed, display: 'flex', flexDirection: 'column', gap: '8px' }}>

                    {/* 3 BOTÕES SUPERIORES DE APOIO */}
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', width: '100%' }}>
                      {/* Botão 1: Ouvir gravação */}
                      <button
                        type="button"
                        disabled={ehAcertoTravado || !audioGravadoUrl || tocandoMinhaVoz}
                        onClick={handleReproduzirMinhaVoz}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          height: '42px',
                          minHeight: '42px',
                          maxHeight: '42px',
                          borderRadius: '10px',
                          border: '1px solid rgba(0, 0, 0, 0.12)',
                          backgroundColor: audioGravadoUrl ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.35)',
                          color: audioGravadoUrl ? '#0f172a' : '#64748b',
                          fontSize: '0.8rem',
                          fontWeight: '800',
                          cursor: audioGravadoUrl ? 'pointer' : 'not-allowed',
                          opacity: audioGravadoUrl ? 1 : 0.5,
                          boxSizing: 'border-box',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0 4px',
                          boxShadow: audioGravadoUrl ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                          ...(ehAcertoTravado ? estiloDesativadoAcerto : {})
                        }}
                      >
                        {tocandoMinhaVoz ? "Reproduzindo..." : "Ouvir gravação"}
                      </button>

                      {/* Botão 2: Praticar repetição */}
                      <button
                        type="button"
                        disabled={ehAcertoTravado}
                        onClick={handlePraticarRepeticao}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          height: '42px',
                          minHeight: '42px',
                          maxHeight: '42px',
                          borderRadius: '10px',
                          border: '1px solid rgba(0, 0, 0, 0.12)',
                          backgroundColor: tocandoRepeticao ? corDinamica : 'rgba(255, 255, 255, 0.85)',
                          color: tocandoRepeticao ? '#ffffff' : '#0f172a',
                          fontSize: '0.8rem',
                          fontWeight: '800',
                          cursor: 'pointer',
                          boxSizing: 'border-box',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0 4px',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                          ...(ehAcertoTravado ? estiloDesativadoAcerto : {})
                        }}
                      >
                        {tocandoRepeticao ? "Parar repetição" : "Repetição"}
                      </button>

                      {/* Botão 3: Pronto (Disparo da Prova de Fogo) */}
                      <button
                        type="button"
                        onClick={handleDispararPronto}
                        disabled={ehAcertoTravado || statusVoz !== 'IDLE'}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          height: '42px',
                          minHeight: '42px',
                          maxHeight: '42px',
                          borderRadius: '10px',
                          border: 'none',
                          backgroundColor: temas[idiomaEstudo]?.bg || '#4d6395',
                          color: '#ffffff',
                          fontSize: '0.82rem',
                          fontWeight: '900',
                          cursor: statusVoz !== 'IDLE' ? 'not-allowed' : 'pointer',
                          opacity: statusVoz !== 'IDLE' ? 0.6 : 1,
                          boxSizing: 'border-box',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0 4px',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.14)',
                          ...(ehAcertoTravado ? estiloDesativadoAcerto : {})
                        }}
                      >
                        {t?.dinglab_ready || "Pronto"}
                      </button>
                    </div>

                    {/* 3 BOTÕES INFERIORES PRINCIPAIS */}
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', width: '100%' }}>
                      {/* Botão 1: Explicação */}
                      <button
                        type="button"
                        disabled={ehAcertoTravado}
                        onClick={() => explicarFraseIA(fraseAtual?.id, fraseAtual)}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          height: '42px',
                          minHeight: '42px',
                          maxHeight: '42px',
                          borderRadius: '10px',
                          border: 'none',
                          backgroundColor: temas[idiomaEstudo]?.bg || '#0f172a',
                          color: COR_TOM_CLARO,
                          fontSize: '0.82rem',
                          fontWeight: '800',
                          cursor: 'pointer',
                          boxSizing: 'border-box',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0 4px',
                          ...(ehAcertoTravado ? estiloDesativadoAcerto : {})
                        }}
                      >
                        {t?.askAi || "Explicação"}
                      </button>

                      {/* Botão 2: Ouvir / Lento */}
                      <button
                        type="button"
                        disabled={ehAcertoTravado}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={handleOuvirClick}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          height: '42px',
                          minHeight: '42px',
                          maxHeight: '42px',
                          borderRadius: '10px',
                          backgroundColor: 'rgba(255, 255, 255, 0.75)',
                          color: ns.bg,
                          border: `1px solid ${temas[idiomaEstudo]?.bg}`,
                          fontSize: '0.82rem',
                          fontWeight: '800',
                          cursor: 'pointer',
                          boxSizing: 'border-box',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0 4px',
                          ...(ehAcertoTravado ? estiloDesativadoAcerto : {})
                        }}
                      >
                        {audioLento ? (t?.slow || "Lento") : (t?.normal || "Ouvir")}
                      </button>

                      {/* Botão 3: Falar agora */}
                      <button
                        type="button"
                        onClick={handleFalarAgora}
                        disabled={ehAcertoTravado || statusVoz === 'EVALUATING'}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          height: '42px',
                          minHeight: '42px',
                          maxHeight: '42px',
                          borderRadius: '10px',
                          border: 'none',
                          backgroundColor: ns.bg,
                          color: ns.txt,
                          fontSize: '0.82rem',
                          fontWeight: '800',
                          cursor: statusVoz === 'EVALUATING' ? 'not-allowed' : 'pointer',
                          opacity: statusVoz === 'EVALUATING' ? 0.5 : 1,
                          boxSizing: 'border-box',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0 4px',
                          ...(ehAcertoTravado ? estiloDesativadoAcerto : {})
                        }}
                      >
                        {statusVoz === 'RECORDING' ? (t?.check || 'Verificar') : statusVoz === 'EVALUATING' ? '...' : (t?.speakNow || 'Falar agora')}
                      </button>
                    </div>

                  </div>
                );
              })()}
            </>
          )}

          {/* BARRA DE NAVEGAÇÃO */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              paddingTop: '12px',
              marginTop: '10px',
              borderTop: '1px solid rgba(255, 255, 255, 0.35)',
              flexShrink: 0,
              boxSizing: 'border-box'
            }}
          >
            {resultadoFeedback === 'acerto' ? (
              <button
                type="button"
                onClick={handleAvancarAposAcerto}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: ns.bg,
                  color: ns.txt,
                  fontWeight: '800',
                  fontSize: 'clamp(0.82rem, 3.6vw, 0.92rem)',
                  cursor: 'pointer',
                  minHeight: '44px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  whiteSpace: 'nowrap'
                }}
              >
                {t?.dinglabFraseVoltouProxima || "A frase voltou ao Dìngloop! Próxima →"}
              </button>
            ) : modoPitstop ? (
              <button
                type="button"
                onClick={handleVoltarAoDingloop}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: ns.bg,
                  color: ns.txt,
                  fontWeight: '800',
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  minHeight: '44px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                Tentar depois, voltar ao Dìngloop →
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={indice === 0}
                  onClick={() => setIndice(prev => Math.max(0, prev - 1))}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: indice === 0 ? 'rgba(0, 0, 0, 0.06)' : ns.bg,
                    color: indice === 0 ? '#64748b' : ns.txt,
                    fontWeight: '800',
                    fontSize: '0.88rem',
                    cursor: indice === 0 ? 'not-allowed' : 'pointer',
                    opacity: indice === 0 ? 0.35 : 1,
                    minWidth: '100px',
                    minHeight: '38px',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {indice <= 1 ? "← Guia" : `← ${t?.prev || "Anterior"}`}
                </button>

                <span
                  style={{
                    fontSize: '0.86rem',
                    fontWeight: '800',
                    color: '#1e293b',
                    letterSpacing: '0.4px',
                    userSelect: 'none'
                  }}
                >
                  {ehCardZero ? "Guia" : `${indice} / ${lista.length}`}
                </span>

                <button
                  type="button"
                  disabled={indice >= lista.length && !ehCardZero}
                  onClick={() => setIndice(prev => Math.min(lista.length, prev + 1))}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: (indice >= lista.length && !ehCardZero) ? 'rgba(0, 0, 0, 0.06)' : ns.bg,
                    color: (indice >= lista.length && !ehCardZero) ? '#64748b' : ns.txt,
                    fontWeight: '800',
                    fontSize: '0.88rem',
                    cursor: (indice >= lista.length && !ehCardZero) ? 'not-allowed' : 'pointer',
                    opacity: (indice >= lista.length && !ehCardZero) ? 0.35 : 1,
                    minWidth: '100px',
                    minHeight: '38px',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {ehCardZero ? "Praticar →" : `${t?.next || "Próximo"} →`}
                </button>
              </>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
