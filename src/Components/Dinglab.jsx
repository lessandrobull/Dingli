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
  setIndice: setIndiceProp
}) {
  const { temas, t, navStyle, idiomaEstudo, idiomaOrigem, mudarTela, getCorFonteDinamica } = useDingli();

  const [lista, setLista] = useState([]);
  const [indiceLocal, setIndiceLocal] = useState(indiceProp);
  const indice = indiceProp !== undefined ? indiceProp : indiceLocal;
  const setIndice = useCallback((val) => {
    const novo = typeof val === 'function' ? val(indice) : val;
    setIndiceLocal(novo);
    if (setIndiceProp) setIndiceProp(novo);
  }, [indice, setIndiceProp]);

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
        setLista(Array.isArray(arr) ? arr : []);
      } else {
        setLista([]);
      }
    } catch (e) {
      setLista([]);
    }
  }, [chaveDinglab, idiomaOrigem, idiomaEstudo]);

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
          if (resultado === 'acerto') {
            setFeedbackMensagem(t?.dinglabSuccessMirror || "Boa pronúncia, parabéns!");
          } else {
            setFeedbackMensagem(t?.dinglabFailMirror || "Mais atenção no som! Treine livremente.");
          }

          timerFeedbackRef.current = setTimeout(() => {
            setResultadoFeedback(null);
            setFeedbackMensagem("");
            setTranscricaoFixa("");
            if (setTranscricaoAoVivo) setTranscricaoAoVivo("");
            if (setStatusVoz) setStatusVoz('IDLE');
          }, 3000);

        } else {
          // ==================== PROVA DE FOGO (DECISÃO FINAL) ====================
          if (resultado === 'acerto') {
            setToastVisible(false);
            setResultadoFeedback('acerto');
            setFeedbackMensagem("");

            const idAtual = fraseAtual.id;
            const rankObj = frasesMaestria[idAtual];
            const rankAtual = typeof rankObj === 'object' ? rankObj.rank : (rankObj || 0);
            const highestRank = typeof rankObj === 'object' ? (rankObj.highest_rank || rankAtual) : rankAtual;

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
              texto: (idiomaEstudo === 'pi' && fraseAtual.zh) ? fraseAtual.zh : textoEstudo
            };
            if (falar) {
              falar(alvoAudio, false);
            }

            // Tempo calculado idêntico ao TelaEstudo.jsx / App.jsx
            const tempoAudio = Math.max(textoEstudo.split(" ").length * 600, 1500);

            // Aguarda o áudio terminar para avançar para o próximo card
            timerFeedbackRef.current = setTimeout(() => {
              setLista(novaLista);
              setModoProva(false);
              setResultadoFeedback(null);
              setFeedbackMensagem("");
              setTranscricaoFixa("");
              setAudioGravadoUrl(null);
              if (setTranscricaoAoVivo) setTranscricaoAoVivo("");
              if (setStatusVoz) setStatusVoz('IDLE');
              if (indice > novaLista.length) {
                setIndice(Math.max(0, novaLista.length));
              }
            }, tempoAudio);

          } else {
            // Reprovação na Prova de Fogo: ZERO punição e mantém a mensagem em vermelho fixa na tela
            setToastVisible(false);
            setResultadoFeedback('erro');
            setFeedbackMensagem(t?.dinglabFailChallenge || "Quase lá! Treine mais um pouco no modo espelho e tente de novo.");
            setModoProva(false);
            if (setStatusVoz) setStatusVoz('IDLE');
            if (setTranscricaoAoVivo) setTranscricaoAoVivo("");
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
      texto: (idiomaEstudo === 'pi' && fraseAtual.zh) ? fraseAtual.zh : textoEstudo
    };
    if (!audioLento) {
      falar(alvo, false);
      setAudioLento(true);
    } else {
      falar(alvo, true);
      setAudioLento(false);
    }
  }, [audioLento, fraseAtual, idiomaEstudo, textoEstudo, falar]);

  // Botão Falar Agora (Modo Espelho Livre)
  const handleFalarAgora = useCallback(() => {
    if (!fraseAtual) return;
    if (statusVoz === 'RECORDING') {
      if (pararEAvaliarVoz) pararEAvaliarVoz();
    } else if (statusVoz === 'IDLE') {
      setModoProva(false);
      setResultadoFeedback(null);
      setFeedbackMensagem("");
      setTranscricaoFixa("");
      if (setTranscricaoAoVivo) setTranscricaoAoVivo("");

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
          audioChunksRef.current = [];
          const mr = new MediaRecorder(stream);
          mediaRecorderRef.current = mr;
          mr.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
          };
          mr.onstop = () => {
            const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const url = URL.createObjectURL(blob);
            setAudioGravadoUrl(url);
            stream.getTracks().forEach(track => track.stop());
          };
          mr.start(100);
        }).catch(err => {
          console.warn("[Dinglab] MediaRecorder não iniciado:", err);
        });
      }

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
    setToastVisible(true);

    setTimeout(() => {
      setToastVisible(false);
    }, 2800);

    setTimeout(() => {
      const alvoVoz = {
        ...fraseAtual,
        [idiomaEstudo]: textoEstudo,
        texto: textoEstudo
      };
      iniciarReconhecimentoVoz(alvoVoz);
    }, 400);
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

  // Tela de conclusão ("Dìnglab em dia!")
  if (lista.length === 0) {
    return (
      <div style={{ ...styles.viewport, backgroundColor: temas[idiomaEstudo]?.bg || '#0f172a', height: alturaTela, position: 'absolute', top: 0, left: 0, width: '100%' }}>
        <div style={{ ...styles.mobileContainer, justifyContent: 'flex-start' }}>
          <button
            onClick={() => mudarTela('menuCartoes')}
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
          onClick={() => mudarTela('menuCartoes')}
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
              : (resultadoFeedback === 'erro' ? '#ef4444' : 'rgba(255, 255, 255, 0.45)'),
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.16)',
            position: 'relative',
            margin: '0 auto',
            outline: 'none',
            display: 'flex',
            flexDirection: 'column',
            transition: 'border-color 0.25s ease, box-shadow 0.25s ease'
          }}
        >
          {/* TOAST ANIMADO DA PROVA DE FOGO */}
          {toastVisible && (
            <div
              style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                right: '12px',
                backgroundColor: '#1e293b',
                color: '#ffffff',
                padding: '12px 16px',
                borderRadius: '14px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                zIndex: 50,
                textAlign: 'center',
                fontSize: '0.88rem',
                fontWeight: '800',
                lineHeight: '1.4',
                boxSizing: 'border-box'
              }}
            >
              🔥 {t?.dinglabToast || "Agora é pra valer! Diga a frase corretamente para ela voltar ao Dìngloop!"}
            </div>
          )}

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
              <div style={{ ...styles.areaFraseCentralFlex, flex: 1, padding: '10px 0', overflow: 'auto' }}>
                <div style={{ textAlign: 'center', width: '100%' }}>
                  <p style={{ ...styles.textoFrasePrincipal, color: '#0f172a' }}>
                    {resultadoFeedback === 'acerto' ? (
                      <span style={{ color: COR_ACERTO }}>{textoEstudo}</span>
                    ) : (() => {
                      let currentZhIndex = 0;
                      const zhLimpo = fraseAtual?.zh ? fraseAtual.zh.replace(/[.,!?;:¿¡"'{}()\[\]\-—…，。！？；：、]/g, "").replace(/\s+/g, "") : "";
                      const estaEmFeedbackOuGravacao = statusVoz === 'RECORDING' || resultadoFeedback !== null;
                      const falaEfetiva = estaEmFeedbackOuGravacao ? (transcricaoAoVivo || transcricaoFixa || "") : "";
                      const tLimpa = falaEfetiva.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss").toLowerCase().replace(/[.,!?;:¿¡"'{}()\[\]\-—…，。！？；：、]/g, "").trim();

                      return textoEstudo.split(" ").map((word, i) => {
                        const normalizarPalavra = (term) => (term || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss").toLowerCase().replace(/[.,!?;:¿¡"'{}()\[\]\-—…，。！？；：、]/g, "").trim();
                        let pLimpa = normalizarPalavra(word);

                        if (idiomaEstudo === 'pi') {
                          const numSyllables = (word.match(/[aeiouüáéíóúàèìòùǎěǐǒǔāēīōū]+/gi) || [1]).length;
                          pLimpa = zhLimpo.substring(currentZhIndex, currentZhIndex + numSyllables);
                          currentZhIndex += numSyllables;
                        }

                        const estaNaFala = pLimpa && pLimpa.length > 0 && (idiomaEstudo === 'pi' ? pLimpa.split('').every(char => tLimpa.includes(char)) : tLimpa.includes(pLimpa));

                        let cor = '#0f172a';
                        if (estaNaFala) {
                          cor = COR_ACERTO;
                        } else if (resultadoFeedback === 'erro') {
                          cor = '#ef4444';
                        }

                        const ehPalavraAtivaRepeticao = palavraAtivaRepeticao === i;

                        let estiloRepeticao = {};
                        if (ehPalavraAtivaRepeticao) {
                          if (faseRepeticao === 'ouvir') {
                            estiloRepeticao = {
                              backgroundColor: corDinamica,
                              color: '#ffffff'
                            };
                          } else if (faseRepeticao === 'repetir') {
                            estiloRepeticao = {
                              backgroundColor: '#ffffff',
                              color: '#0f172a'
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
                              borderRadius: '6px',
                              padding: '2px 5px',
                              display: 'inline-block',
                              marginRight: '3px',
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

                  {feedbackMensagem ? (
                    <div style={{ marginTop: '12px', fontSize: '0.92rem', fontWeight: '800', color: resultadoFeedback === 'acerto' ? COR_ACERTO : '#ef4444', textAlign: 'center', padding: '0 10px' }}>
                      {feedbackMensagem}
                    </div>
                  ) : resultadoFeedback !== 'acerto' ? (
                    <div style={{ marginTop: '12px', fontSize: '0.84rem', color: '#334155', fontWeight: '700', textAlign: 'center' }}>
                      {t?.touchToListen || "Toque na palavra para ouvir a pronúncia"}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* BARRA DE 6 BOTÕES */}
              <div id="area-botoes-card" style={{ ...styles.bottomCardAreaFixed, display: 'flex', flexDirection: 'column', gap: '8px' }}>

                {/* 3 BOTÕES SUPERIORES DE APOIO */}
                <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', width: '100%' }}>
                  {/* Botão 1: Ouvir gravação */}
                  <button
                    type="button"
                    disabled={!audioGravadoUrl || tocandoMinhaVoz}
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
                      boxShadow: audioGravadoUrl ? '0 1px 4px rgba(0,0,0,0.08)' : 'none'
                    }}
                  >
                    {tocandoMinhaVoz ? "Reproduzindo..." : "Ouvir gravação"}
                  </button>

                  {/* Botão 2: Praticar repetição */}
                  <button
                    type="button"
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
                      boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
                    }}
                  >
                    {tocandoRepeticao ? "Parar repetição" : "Repetição"}
                  </button>

                  {/* Botão 3: Pronto (Disparo da Prova de Fogo) */}
                  <button
                    type="button"
                    onClick={handleDispararPronto}
                    disabled={statusVoz !== 'IDLE'}
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
                      boxShadow: '0 2px 6px rgba(0,0,0,0.14)'
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
                      padding: '0 4px'
                    }}
                  >
                    {t?.askAi || "Explicação"}
                  </button>

                  {/* Botão 2: Ouvir / Lento */}
                  <button
                    type="button"
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
                      padding: '0 4px'
                    }}
                  >
                    {audioLento ? (t?.slow || "Lento") : (t?.normal || "Ouvir")}
                  </button>

                  {/* Botão 3: Falar agora */}
                  <button
                    type="button"
                    onClick={handleFalarAgora}
                    disabled={statusVoz === 'EVALUATING'}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      height: '42px',
                      minHeight: '42px',
                      maxHeight: '42px',
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: statusVoz === 'RECORDING' ? '#ef4444' : ns.bg,
                      color: ns.txt,
                      fontSize: '0.82rem',
                      fontWeight: '800',
                      cursor: statusVoz === 'EVALUATING' ? 'not-allowed' : 'pointer',
                      boxSizing: 'border-box',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 4px'
                    }}
                  >
                    {statusVoz === 'RECORDING' ? (t?.check || 'Verificar') : statusVoz === 'EVALUATING' ? '...' : (t?.speakNow || 'Falar agora')}
                  </button>
                </div>

              </div>
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
              ← {t?.prev || "Anterior"}
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
              {ehCardZero ? "Card 0" : `${indice} / ${lista.length}`}
            </span>

            <button
              type="button"
              disabled={indice >= lista.length}
              onClick={() => setIndice(prev => Math.min(lista.length, prev + 1))}
              style={{
                padding: '9px 16px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: indice >= lista.length ? 'rgba(0, 0, 0, 0.06)' : ns.bg,
                color: indice >= lista.length ? '#64748b' : ns.txt,
                fontWeight: '800',
                fontSize: '0.88rem',
                cursor: indice >= lista.length ? 'not-allowed' : 'pointer',
                opacity: indice >= lista.length ? 0.35 : 1,
                minWidth: '100px',
                minHeight: '38px',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {t?.next || "Próximo"} →
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
