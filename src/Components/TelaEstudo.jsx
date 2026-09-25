const normalizarFrase = (str) => (str || "").replace(/\s+([?!:;.,，。！？；：、])/g, "$1").trim();
import React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { RANKS_SELECT, RANKS_WRITE, RANKS_VOICE } from '../constant';
import { useDingli } from '../DingliContext';
import { supabase } from '../supabaseClient';
import { COR_ACERTO, COR_TOM_CLARO, COR_SUPERFICIE_DIGITACAO } from '../themeColors';
import { calcularProximoRank } from '../useSRSLogic';
import { tocarAudioPalavra } from '../services/audioCacheService';

const ExercicioSelecao = ({
  idiomaEstudo, frase, exercicioNivel, fontSizeEx3, styles, temas,
  slotsEx3, removerPalavraSlot, resultadoFeedback, frasesFiltradas, indice,
  palavrasOpcoes, selecionarPalavra
}) => {
  const getCorSlotEx3 = (slot) => (temas[idiomaEstudo]?.bg || '#6366f1') + '10';

  const getCorTextoSlotEx3 = (slot, index) => {
    if (!slot) return 'transparent';
    if (!resultadoFeedback) return '#000';
    const fraseOriginal = frase ? frase[idiomaEstudo] : (frasesFiltradas[indice]?.[idiomaEstudo] || "");
    const palavrasCorretas = fraseOriginal.split(" ");
    const limpar = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss").toLowerCase().replace(/[.,!?;:¿¡"'{}()\[\]\-—…，。！？；：、]/g, "").trim();
    const estaCorreta = limpar(slot.texto) === limpar(palavrasCorretas[index]);
    const corCorreta = COR_ACERTO;
    if (resultadoFeedback === 'acerto') return corCorreta;
    if (estaCorreta) return resultadoFeedback === 'erro_limpo' ? '#000' : corCorreta;
    return '#ef4444';
  };

  return (
    <div style={styles.gameContainerEx3}>
      {idiomaEstudo === 'pi' && frase?.zh && ![4, 11, 18].includes(exercicioNivel) && <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem', padding: '0px 0' }}>{frase.zh}</div>}
      <div style={styles.gavetaSelecionadasFlex}>
        {slotsEx3.map((slot, i) => (
          <div key={i} style={{ ...styles.btnPalavraEx3, fontSize: fontSizeEx3, backgroundColor: getCorSlotEx3(slot), color: getCorTextoSlotEx3(slot, i), border: (resultadoFeedback && slot) ? (resultadoFeedback === 'acerto' ? `2px solid ${COR_ACERTO}` : (slot.texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss").toLowerCase().replace(/[.,!?;:¿¡"'{}()\[\]\-—…，。！？；：、]/g, "") === frase[idiomaEstudo].split(" ")[i].normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss").toLowerCase().replace(/[.,!?;:¿¡"'{}()\[\]\-—…，。！？；：、]/g, "") ? (resultadoFeedback === 'erro_limpo' ? '1px solid #cbd5e1' : `2px solid ${COR_ACERTO}`) : '2px solid #ef4444')) : ('1px solid #cbd5e1'), display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => resultadoFeedback !== 'acerto' && removerPalavraSlot(i)}>{slot?.texto}</div>))}
      </div>
      <div style={styles.divisorEx3} />
      <div style={styles.gavetaOpcoesFlex}>
        {palavrasOpcoes.map((p) => (
          <button key={p.id} onClick={() => !p.usado && resultadoFeedback !== 'acerto' && selecionarPalavra(p)} style={{ ...styles.btnPalavraEx3, fontSize: fontSizeEx3, backgroundColor: p.usado ? '#f8fafc' : '#f1f5f9', color: p.usado ? 'transparent' : '#000', border: '1px solid #cbd5e1', visibility: p.usado ? 'hidden' : 'visible' }}>{p.texto}</button>
        ))}
      </div>
    </div>
  );
};

const ExercicioEscrita = ({
  configLacuna, valorInput, setValorInput, resultadoFeedback, setResultadoFeedback,
  verificarResposta, editableRef, temas, idiomaEstudo, styles
}) => {
  return (
    <div style={{ width: '100%', textAlign: 'center' }}>
      <div style={styles.containerLacuna}>
        {configLacuna.prefixo}
        <div style={styles.wrapperInputRelativo}>
          <span style={styles.placeholderInvisivel}>{configLacuna.resposta}</span>
          <input
            ref={editableRef}
            type="text"
            value={valorInput}
            disabled={resultadoFeedback === 'acerto'}
            autoCapitalize={!configLacuna.prefixo.trim() ? "sentences" : "none"}
            autoCorrect="off"
            spellCheck="false"
            onFocus={() => {
              if (resultadoFeedback === 'erro') {
                setValorInput("");
                setResultadoFeedback(null);
              }
              setTimeout(() => {
                const botoes = document.getElementById('area-botoes-card');
                if (botoes) botoes.scrollIntoView({ behavior: 'smooth', block: 'end' });
              }, 300);
            }}
            onChange={(e) => {
              let texto = e.target.value;
              if (!configLacuna.prefixo.trim() && texto.length === 1 && texto[0] >= 'a' && texto[0] <= 'z') {
                texto = texto.toUpperCase();
              }
              setValorInput(texto);
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); verificarResposta(); } }}
            style={{ ...styles.inputSobreposto, display: 'block', position: 'absolute', left: 0, top: 0, whiteSpace: 'nowrap', overflow: 'hidden', width: '100%', maxWidth: '100%', boxSizing: 'border-box', color: resultadoFeedback ? 'transparent' : '#1e293b' }}
          />
          {resultadoFeedback && (
            <div style={{ ...styles.inputSobreposto, pointerEvents: 'none', backgroundColor: 'transparent', borderBottomColor: 'transparent', display: 'block', position: 'absolute', left: 0, top: 0, whiteSpace: 'nowrap', overflow: 'hidden', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
              {resultadoFeedback === 'acerto' ? <span style={{ color: COR_ACERTO }}>{configLacuna.resposta}</span> : configLacuna.resposta.split(/\s+/).map((word, i) => {
                const userWords = valorInput.trim().split(/\s+/);
                const clean = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss").toLowerCase().replace(/[.,!?;:¿¡"'{}()\[\]\-—…，。！？；：、]/g, "").trim();
                const isCorrect = clean(word) === clean(userWords[i]);
                return <span key={i} style={{ color: isCorrect ? COR_ACERTO : '#ef4444' }}>{i > 0 ? ' ' : ''}{word}</span>
              })}
            </div>
          )}
        </div>
        {configLacuna.sufixo}
      </div>
    </div>
  );
};

const ExercicioVoz = ({
  textoEstudo, resultadoFeedback, idiomaEstudo, temas, frase,
  transcricaoAoVivo, indicesOcultosVoz, styles, t }) => {
  return (
    <div style={{ textAlign: 'center', width: '100%' }}>
      <p style={styles.textoFrasePrincipal}>
        {resultadoFeedback === 'acerto' ? <span style={{ color: COR_ACERTO }}>{textoEstudo}</span> : (() => {
          let currentZhIndex = 0;
          const zhLimpo = frase?.zh ? frase.zh.replace(/[.,!?;:¿¡"'{}()\[\]\-—…，。！？；：、]/g, "").replace(/\s+/g, "") : "";
          return textoEstudo.split(" ").map((word, i) => {
            const normalizarPalavra = (t) => (t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss").toLowerCase().replace(/[.,!?;:¿¡"'{}()\[\]\-—…，。！？；：、]/g, "").trim();
            let pLimpa = normalizarPalavra(word);
            if (idiomaEstudo === 'pi') {
              const numSyllables = (word.match(/[aeiouüáéíóúàèìòùǎěǐǒǔāēīōū]+/gi) || [1]).length;
              pLimpa = zhLimpo.substring(currentZhIndex, currentZhIndex + numSyllables);
              currentZhIndex += numSyllables;
            }
            const tLimpa = (transcricaoAoVivo || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss").toLowerCase().replace(/[.,!?;:¿¡"'{}()\[\]\-—…，。！？；：、]/g, "").trim();
            const estaNaFala = pLimpa && pLimpa.length > 0 && (idiomaEstudo === 'pi' ? pLimpa.split('').every(char => tLimpa.includes(char)) : tLimpa.includes(pLimpa));
            const oculto = indicesOcultosVoz.includes(i);
            let cor = oculto ? 'transparent' : '#000';
            let borderB = oculto ? '2px solid #cbd5e1' : '2px solid transparent';
            const ehErro = resultadoFeedback === 'erro' && !estaNaFala;

            if (estaNaFala) {
              cor = COR_ACERTO;
              borderB = '2px solid transparent';
            } else if (resultadoFeedback === 'erro') {
              cor = '#ef4444';
              borderB = 'none';
            }

            return (
              <span
                key={i}
                onClick={() => {
                  if (ehErro) {
                    tocarAudioPalavra(word, idiomaEstudo);
                  }
                }}
                title={ehErro ? (t?.touchToListenTooltip || "Toque para ouvir a pronúncia isolada") : ""}
                style={{
                  color: cor,
                  borderBottom: borderB,
                  paddingBottom: '2px',
                  display: 'inline-block',
                  marginRight: '5px',
                  cursor: ehErro ? 'pointer' : 'default',
                  userSelect: 'none',
                  transition: 'transform 0.15s ease'
                }}
                onMouseDown={(e) => {
                  if (ehErro) e.currentTarget.style.transform = 'scale(0.92)';
                }}
                onMouseUp={(e) => {
                  if (ehErro) e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {word}
              </span>
            );
          });
        })()}
      </p>

      {/* Dica visual */}
      {resultadoFeedback === 'erro' && (
        <div style={{ marginTop: '12px', fontSize: '0.84rem', color: '#64748b', fontWeight: '600', textAlign: 'center' }}>
          {t?.touchToListen || "Toque na palavra para ouvir a pronúncia"}
        </div>
      )}
    </div>
  );
};

const obterOpcoesReporte = (t) => [
  t?.reportAudio || "Áudio",
  t?.reportSentence || "Frase do exercício",
  t?.reportTranslation || "Tradução",
  t?.reportTypingDiff || "Dificuldade para digitar",
  t?.reportVoiceDiff || "Dificuldade para gravação da fala"
];

export default function TelaEstudo({
  fraseAtivaGlobal,
  frasesFiltradas, indice, nivelAtivo, topicoAtivo,
  modoExercicio, exercicioNivel, resultadoFeedbackProp, styles,
  carregandoDados, mostrarTraducao, setMostrarTraducao, falar,
  explicarFraseIA, frasesMaestria, setFrasesMaestria, setModoJogo,
  setSessaoIniciada, limparEstadoExercicio, statusVoz, volume,
  iniciarReconhecimentoVoz, pararEAvaliarVoz, setIndice, transcricaoAoVivo,
  iniciarExercicio, aiExplanation, aiLoading, setModoExercicio,
  filaErros, setFilaErros, filaAcertos, setFilaAcertos,
  sessaoDominium, setSessaoDominium, jogarDominiumInteligente,
  tentativasVoz = 0, resetarTentativasVoz, postergarParaFimDaTask
}) {
  const { temas, t, navStyle, idiomaEstudo, idiomaOrigem, mudarTela, userRole, getCorFonteDinamica } = useDingli();

  const frase = React.useMemo(() => {
    return fraseAtivaGlobal
      ? { id: fraseAtivaGlobal.id, [idiomaEstudo]: fraseAtivaGlobal.texto, [idiomaOrigem]: fraseAtivaGlobal.traducao || "", zh: fraseAtivaGlobal.texto_zh, nivel: fraseAtivaGlobal.nivel, topico: fraseAtivaGlobal.topico }
      : frasesFiltradas[indice];
  }, [fraseAtivaGlobal, frasesFiltradas, indice, idiomaEstudo, idiomaOrigem]);

  const ns = navStyle(idiomaEstudo);

  const [feedbackLocal, setFeedbackLocal] = useState(null);
  const resultadoFeedback = (resultadoFeedbackProp !== undefined && resultadoFeedbackProp !== null) ? resultadoFeedbackProp : feedbackLocal;
  const setResultadoFeedback = setFeedbackLocal;
  const [valorInput, setValorInput] = useState("");
  const [configLacuna, setConfigLacuna] = useState({ prefixo: "", sufixo: "", resposta: "" });
  const [palavrasOpcoes, setPalavrasOpcoes] = useState([]);
  const [slotsEx3, setSlotsEx3] = useState([]);
  const [indicesOcultosVoz, setIndicesOcultosVoz] = useState([]);
  const [, setTentativaFinalizada] = useState(false);
  const editableRef = useRef(null);
  const processandoAcertoRef = useRef(false);

  const [audioLento, setAudioLento] = useState(false);
  const [modalReporteAberto, setModalReporteAberto] = useState(false);
  const [opcoesSelecionadas, setOpcoesSelecionadas] = useState([]);
  const [outroTexto, setOutroTexto] = useState("");
  const [enviandoReporte, setEnviandoReporte] = useState(false);
  const [reporteEnviado, setReporteEnviado] = useState(false);

  const corDinamica = (getCorFonteDinamica && idiomaEstudo)
    ? getCorFonteDinamica(idiomaEstudo)
    : (temas[idiomaEstudo]?.bg || "#0f172a");

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
        frase_id: frase?.id || 0,
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
      console.error("[Reporte] Erro ao enviar:", err);
      setReporteEnviado(true);
    } finally {
      setEnviandoReporte(false);
    }
  }, [frase, idiomaEstudo, idiomaOrigem, opcoesSelecionadas, outroTexto]);

  const pularFrase = useCallback(() => {
    const fraseId = frase?.id;
    if (!fraseId) {
      resetarModalReporte();
      return;
    }
    if (setFrasesMaestria) {
      setFrasesMaestria(prev => {
        const rankObj = prev[fraseId];
        const rankAtual = typeof rankObj === "object" ? (rankObj.rank || 1) : (rankObj || 1);
        const chaveMaestria = `maestria_${idiomaOrigem}_${idiomaEstudo}`;
        const nova = {
          ...prev,
          [fraseId]: {
            ...(typeof rankObj === "object" ? rankObj : {}),
            rank: rankAtual,
            status: "macro",
            next_review: Date.now() + (7 * 24 * 60 * 60 * 1000),
            last_review: Date.now(),
            last_attempt_at: Date.now()
          }
        };
        localStorage.setItem(chaveMaestria, JSON.stringify(nova));
        return nova;
      });
    }
    const fraseOriginal = frase ? (frase[idiomaEstudo] || "") : "";
    if (setFilaErros) setFilaErros(prev => prev.filter(item => item.indice !== indice && item.id !== fraseId));
    if (setFilaAcertos) setFilaAcertos(prev => prev.filter(item => item.id !== fraseId));
    if (setSessaoDominium) {
      setSessaoDominium(prev => ({
        ...prev,
        primeira: (prev.primeira || []).filter(f => (f.frase || f) !== fraseOriginal && f.id !== fraseId),
        recuperadas: (prev.recuperadas || []).filter(f => (f.frase || f) !== fraseOriginal && f.id !== fraseId),
        acertosTempo: (prev.acertosTempo || []).filter(a => (a.frase || a) !== fraseOriginal && a.id !== fraseId),
        falhas: (prev.falhas || []).filter(f => (f.frase || f) !== fraseOriginal && f.id !== fraseId)
      }));
    }
    resetarModalReporte();
    if (limparEstadoExercicio) limparEstadoExercicio();
    setResultadoFeedback(null);
    if (setModoExercicio) setModoExercicio(false);
    if (jogarDominiumRef.current) {
      jogarDominiumRef.current();
    } else if (setIndice) {
      setIndice(prev => (prev + 1) % frasesFiltradas.length);
    }
  }, [frase, idiomaEstudo, idiomaOrigem, indice, setFrasesMaestria, setFilaErros, setFilaAcertos, setSessaoDominium, resetarModalReporte, limparEstadoExercicio, setResultadoFeedback, setModoExercicio, frasesFiltradas.length, setIndice]);

  // ETAPA 2: Escape no 3º Erro Consecutivo de Pronúncia
  const handleRevisarMaisTarde = useCallback(() => {
    const fraseId = frase?.id;
    if (postergarParaFimDaTask && fraseId) {
      postergarParaFimDaTask(fraseId);
    }
    if (resetarTentativasVoz) resetarTentativasVoz();
    setResultadoFeedback(null);
    if (setModoExercicio) setModoExercicio(false);
    if (jogarDominiumRef.current) {
      jogarDominiumRef.current();
    }
  }, [frase?.id, postergarParaFimDaTask, resetarTentativasVoz, setResultadoFeedback, setModoExercicio]);

  useEffect(() => {
    setAudioLento(false);
  }, [indice, frase?.id, exercicioNivel]);

  const jogarDominiumRef = useRef(jogarDominiumInteligente);
  useEffect(() => {
    jogarDominiumRef.current = jogarDominiumInteligente;
  }, [jogarDominiumInteligente]);

  useEffect(() => {
    if (modoExercicio && exercicioNivel > 0 && frase) {
      setResultadoFeedback(null); setTentativaFinalizada(false); setValorInput("");

      const fraseOriginal = normalizarFrase(frase[idiomaEstudo]);
      const percentual = (exercicioNivel <= 9) ? 0.3 : (exercicioNivel <= 18) ? 0.7 : 1.0;
      const palavras = fraseOriginal.split(" ");
      if (RANKS_WRITE.includes(exercicioNivel)) {
        const qtdPalavrasOcultas = Math.max(([2, 11, 20].includes(exercicioNivel) ? 1 : 2), Math.round(palavras.length * percentual));
        const inicioIdx = (percentual === 1.0) ? 0 : Math.floor(Math.random() * (palavras.length - qtdPalavrasOcultas + 1));
        const prefixo = palavras.slice(0, inicioIdx).join(" ") + (inicioIdx > 0 ? " " : "");
        const seqResposta = palavras.slice(inicioIdx, inicioIdx + qtdPalavrasOcultas).join(" ");
        const prefixoAdicionalMatch = seqResposta.match(/^[¿¡"'(]+/);
        const prefixoAdicional = prefixoAdicionalMatch ? prefixoAdicionalMatch[0] : "";
        const pontuacaoFinalMatch = seqResposta.match(/[.,!?;:]+$/);
        const pontuacaoFinal = pontuacaoFinalMatch ? pontuacaoFinalMatch[0] : "";
        const resposta = seqResposta.replace(/^[¿¡"'(]+/, "").replace(/[.,!?;:]+$/, "");
        setConfigLacuna({ prefixo: prefixo + prefixoAdicional, sufixo: pontuacaoFinal + ((inicioIdx + qtdPalavrasOcultas < palavras.length ? " " : "") + palavras.slice(inicioIdx + qtdPalavrasOcultas).join(" ")), resposta });
      } else if (RANKS_SELECT.includes(exercicioNivel)) {
        const minInterativo = (exercicioNivel <= 9) ? Math.min(2, palavras.length) : 1;
        const qtdInterativa = Math.max(minInterativo, Math.round(palavras.length * percentual));
        const indicesInterativos = [];
        const pool = palavras.map((_, i) => i);
        for (let i = 0; i < qtdInterativa; i++) indicesInterativos.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
        setSlotsEx3(palavras.map((w, i) => indicesInterativos.includes(i) ? null : { id: `f-${i}`, texto: w, fixed: true }));
        const itensOpcoes = indicesInterativos.map(idx => ({ id: idx, texto: palavras[idx], usado: false }));
        let opcoesEmbaralhadas = [...itensOpcoes];
        if (opcoesEmbaralhadas.length > 1) {
          const estaNaOrdemOriginal = (arr) => arr.every((item, i) => i === 0 || item.id > arr[i - 1].id);
          let tentativas = 0;
          do {
            for (let i = opcoesEmbaralhadas.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [opcoesEmbaralhadas[i], opcoesEmbaralhadas[j]] = [opcoesEmbaralhadas[j], opcoesEmbaralhadas[i]];
            }
            tentativas++;
          } while (estaNaOrdemOriginal(opcoesEmbaralhadas) && tentativas < 25);

          if (estaNaOrdemOriginal(opcoesEmbaralhadas)) {
            opcoesEmbaralhadas.reverse();
          }
        }
        setPalavrasOpcoes(opcoesEmbaralhadas);
      } else if (RANKS_VOICE.includes(exercicioNivel)) {
        const finalQtdVoz = Math.max(([3, 8, 12, 17, 21, 26].includes(exercicioNivel) ? 2 : 0), Math.round(palavras.length * percentual));
        setIndicesOcultosVoz(Array.from({ length: Math.min(finalQtdVoz, palavras.length) }, (_, i) => i));
      }
    } else {
      setResultadoFeedback(null); setValorInput(""); setPalavrasOpcoes([]); setSlotsEx3([]); setIndicesOcultosVoz([]);
      if (editableRef.current) editableRef.current.innerText = "";
    }
  }, [modoExercicio, exercicioNivel, indice, frase, idiomaEstudo, falar]);

  const selecionarPalavra = useCallback((palavraObj) => {
    setResultadoFeedback(null);
    const primeiroSlotVazio = slotsEx3.findIndex(s => s === null);
    if (primeiroSlotVazio === -1) return;
    const novosSlots = [...slotsEx3];
    novosSlots[primeiroSlotVazio] = palavraObj;
    setSlotsEx3(novosSlots);
    setPalavrasOpcoes(palavrasOpcoes.map(p => p.id === palavraObj.id ? { ...p, usado: true } : p));
  }, [slotsEx3, palavrasOpcoes]);

  const removerPalavraSlot = useCallback((index) => {
    setResultadoFeedback(null);
    const palavraObj = slotsEx3[index];
    if (!palavraObj || palavraObj.fixed) return;
    const novosSlots = [...slotsEx3];
    novosSlots[index] = null;
    setSlotsEx3(novosSlots);
    setPalavrasOpcoes(palavrasOpcoes.map(p => p.id === palavraObj.id ? { ...p, usado: false } : p));
  }, [slotsEx3, palavrasOpcoes]);

  const verificarResposta = useCallback(() => {
    if (resultadoFeedback === 'acerto') return;
    if (resultadoFeedback === 'erro' || resultadoFeedback === 'erro_limpo') setResultadoFeedback(null);
    const fraseOriginal = normalizarFrase(frase[idiomaEstudo]);
    const limpar = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss").trim().toLowerCase().replace(/[.,!?;:¿¡"'{}()\[\]\-—…，。！？；：、]/g, "");
    const corretaLimpa = limpar(fraseOriginal);
    let tentativaLimpa = "";
    if (RANKS_VOICE.includes(exercicioNivel)) return;
    if (RANKS_SELECT.includes(exercicioNivel)) {
      tentativaLimpa = limpar(slotsEx3.map(s => s ? s.texto : "").join(" "));
    } else if (RANKS_WRITE.includes(exercicioNivel)) {
      tentativaLimpa = (limpar(valorInput) === limpar(configLacuna.resposta)) ? corretaLimpa : "erro_total";
    }

    if (tentativaLimpa === corretaLimpa) {
      setResultadoFeedback('acerto'); processandoAcertoRef.current = true;
      const estavaNaFilaErro = filaErros.some(item => item.indice === indice);
      setFilaErros(prev => prev.filter(item => item.indice !== indice));
      const rankObj = frasesMaestria[frase.id];
      const rankAtual = typeof rankObj === 'object' ? rankObj.rank : (rankObj || 0);
      const highestRank = typeof rankObj === 'object' ? (rankObj.highest_rank || rankAtual) : rankAtual;
      const calc = calcularProximoRank(rankAtual, true, highestRank, estavaNaFilaErro || (typeof rankObj === 'object' && rankObj.status === 'recuperacao'));
      setFrasesMaestria(prev => ({ ...prev, [frase.id]: { rank: calc.novoRank, status: calc.lista, next_review: Date.now() + calc.espera, last_review: Date.now(), last_attempt_at: Date.now(), highest_rank: Math.max(highestRank, calc.novoRank), texto: fraseOriginal, traducao: frase[idiomaOrigem] || "", texto_zh: frase?.zh || "", nivel: frase.nivel || nivelAtivo, topico: frase.topico || topicoAtivo } }));
      if (estavaNaFilaErro) {
        setSessaoDominium(prev => ({ ...prev, primeira: (prev.primeira || []).filter(f => (f.frase || f) !== fraseOriginal), recuperadas: (prev.recuperadas || []).filter(f => (f.frase || f) !== fraseOriginal), acertosTempo: (prev.acertosTempo || []).filter(a => (a.frase || a) !== fraseOriginal), falhas: (prev.falhas || []).filter(f => (f.frase || f) !== fraseOriginal) }));
        setTimeout(() => setSessaoDominium(prev => ({ ...prev, recuperadas: [...(prev.recuperadas || []).filter(f => (f.frase || f) !== fraseOriginal), { frase: fraseOriginal, id: frase.id, curso: `${idiomaOrigem}_${idiomaEstudo}`, nivel: nivelAtivo, topico: topicoAtivo }] })), 30000);
      } else {
        setSessaoDominium(prev => ({ ...prev, recuperadas: (prev.recuperadas || []).filter(f => (f.frase || f) !== fraseOriginal), acertosTempo: [...(prev.acertosTempo || []).filter(a => a.frase !== fraseOriginal), { frase: fraseOriginal, id: frase.id, time: Date.now(), curso: `${idiomaOrigem}_${idiomaEstudo}`, nivel: nivelAtivo, topico: topicoAtivo }] }));
      }
      falar({ id: frase?.id, texto: (idiomaEstudo === 'pi' && frase.zh) ? frase.zh : textoEstudo }, false);
      setTimeout(() => {
        setResultadoFeedback(null); setModoExercicio(false); processandoAcertoRef.current = false;
        if (jogarDominiumRef.current) jogarDominiumRef.current();
      }, Math.max(fraseOriginal.split(" ").length * 600, 2000));
    } else {
      setResultadoFeedback('erro');
      const rankObj = frasesMaestria[frase.id];
      const rankAtual = typeof rankObj === 'object' ? rankObj.rank : (rankObj || 0);
      const highestRank = typeof rankObj === 'object' ? (rankObj.highest_rank || rankAtual) : rankAtual;
      const calc = calcularProximoRank(rankAtual, false, highestRank, filaErros.some(item => item.indice === indice) || (typeof rankObj === 'object' && rankObj.status === 'recuperacao'));
      setFrasesMaestria(prev => ({ ...prev, [frase.id]: { rank: calc.novoRank, status: calc.lista, next_review: Date.now() + calc.espera, last_review: Date.now(), last_attempt_at: Date.now(), highest_rank: Math.max(highestRank, calc.novoRank), texto: fraseOriginal, traducao: frase[idiomaOrigem] || "", texto_zh: frase?.zh || "", nivel: frase.nivel || nivelAtivo, topico: frase.topico || topicoAtivo } }));
      setSessaoDominium(prev => ({ ...prev, falhas: [...(prev.falhas || []).filter(f => (f.frase || f) !== fraseOriginal), { frase: fraseOriginal, id: frase.id, curso: `${idiomaOrigem}_${idiomaEstudo}` }], primeira: (prev.primeira || []).filter(f => (f.frase || f) !== fraseOriginal) }));
      setFilaAcertos(prev => prev.filter(item => item.indice !== indice));
      setFilaErros(prev => prev.some(item => item.indice === indice) ? prev : [...prev, { indice, rank: calc.novoRank }]);
      falar({ id: frase?.id, texto: (idiomaEstudo === 'pi' && frase.zh) ? frase.zh : textoEstudo }, false);
      setTimeout(() => {
        setTentativaFinalizada(false);
        if (RANKS_SELECT.includes(exercicioNivel)) { setResultadoFeedback('erro_limpo'); }
        else if (RANKS_WRITE.includes(exercicioNivel)) { setValorInput(""); setResultadoFeedback(null); }
      }, Math.max(fraseOriginal.split(" ").length * 600, 1000));
    }
  }, [resultadoFeedback, frase, idiomaEstudo, exercicioNivel, slotsEx3, valorInput, configLacuna, frasesMaestria, falar, setFilaAcertos, setFilaErros, setFrasesMaestria, setSessaoDominium, filaErros, indice, idiomaOrigem, nivelAtivo, topicoAtivo, userRole]);

  const handleRever = useCallback(() => {
    const fraseOriginal = normalizarFrase(frase[idiomaEstudo]);
    setModoExercicio(false);
    setSessaoIniciada(false);
    setResultadoFeedback(null);
    setValorInput("");
    if (resetarTentativasVoz) resetarTentativasVoz();
    if (window.recognitionInstance) {
      try { window.recognitionInstance.abort(); } catch (e) { }
    }

    setFrasesMaestria(prev => ({
      ...prev,
      [frase.id]: {
        rank: 0,
        status: 'inedita',
        next_review: Date.now(),
        last_review: Date.now(),
        last_attempt_at: Date.now(),
        highest_rank: 0,
        texto: fraseOriginal,
        traducao: frase[idiomaOrigem] || "",
        texto_zh: frase?.zh || "",
        nivel: frase.nivel || nivelAtivo,
        topico: frase.topico || topicoAtivo
      }
    }));

    setFilaErros(prev => prev.filter(item => item.indice !== indice));
    setFilaAcertos(prev => prev.filter(item => item.indice !== indice));
    setSessaoDominium(prev => ({
      ...prev,
      primeira: (prev.primeira || []).filter(f => (f.frase || f) !== fraseOriginal),
      recuperadas: (prev.recuperadas || []).filter(f => (f.frase || f) !== fraseOriginal),
      acertosTempo: (prev.acertosTempo || []).filter(a => (a.frase || a) !== fraseOriginal),
      falhas: (prev.falhas || []).filter(f => (f.frase || f) !== fraseOriginal)
    }));
  }, [frase, idiomaEstudo, indice, nivelAtivo, topicoAtivo, setModoExercicio, setSessaoIniciada, setFrasesMaestria, setFilaErros, setFilaAcertos, setSessaoDominium, resetarTentativasVoz]);

  const textoEstudo = normalizarFrase(frase?.[idiomaEstudo] || "");

  const handleOuvirClick = useCallback(() => {
    const alvo = {
      id: frase?.id,
      texto: (idiomaEstudo === 'pi' && frase?.zh) ? frase.zh : textoEstudo
    };
    if (!audioLento) {
      falar(alvo, false);
      setAudioLento(true);
    } else {
      falar(alvo, true);
      setAudioLento(false);
    }
  }, [audioLento, frase, idiomaEstudo, textoEstudo, falar]);

  const handlePraticar = useCallback(() => {
    if (modoExercicio) return;
    if (userRole === 'aluno') {
      const idAtual = frase?.id;
      const maestriaData = frasesMaestria[idAtual];
      const rankAtual = typeof maestriaData === 'object' ? maestriaData.rank : (maestriaData || 0);
      if (rankAtual > 0) return;
      setModoJogo(true);
      setSessaoIniciada(true);
      iniciarExercicio(rankAtual > 0 ? rankAtual : 1);
    } else {
      mudarTela('selecaoExercicio');
    }
  }, [modoExercicio, userRole, frase, frasesMaestria, setModoJogo, setSessaoIniciada, iniciarExercicio, mudarTela]);

  useEffect(() => {
    const handleKeyDownGlobal = (e) => {
      if (e.key !== 'Enter') return;

      if (!modoExercicio) {
        e.preventDefault();
        handlePraticar();
        return;
      }

      if (resultadoFeedback === 'acerto') return;

      if (RANKS_VOICE.includes(exercicioNivel)) {
        if (tentativasVoz >= 3 && resultadoFeedback === 'erro') {
          e.preventDefault();
          handleRevisarMaisTarde();
          return;
        }

        if (statusVoz === 'RECORDING') {
          e.preventDefault();
          if (pararEAvaliarVoz) pararEAvaliarVoz();
          else if (window.dingliPararEAvaliarVoz) window.dingliPararEAvaliarVoz();
        } else if (statusVoz === 'IDLE') {
          e.preventDefault();
          setResultadoFeedback(null);
          iniciarReconhecimentoVoz(frase);
        }
      } else if (RANKS_SELECT.includes(exercicioNivel)) {
        const todosPreenchidos = slotsEx3.length > 0 && !slotsEx3.some(s => s === null);
        if (todosPreenchidos && !resultadoFeedback) {
          e.preventDefault();
          verificarResposta();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDownGlobal);
    return () => window.removeEventListener('keydown', handleKeyDownGlobal);
  }, [
    modoExercicio, handlePraticar, resultadoFeedback, exercicioNivel,
    statusVoz, pararEAvaliarVoz, iniciarReconhecimentoVoz, frase,
    slotsEx3, verificarResposta, tentativasVoz, handleRevisarMaisTarde
  ]);

  if (carregandoDados || !frase || !textoEstudo) {
    return (
      <div style={{ ...styles.viewport, backgroundColor: temas[idiomaEstudo]?.bg || '#000' }}>
        <div style={styles.mobileContainer}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ color: '#fff', fontWeight: '800', fontSize: '1.1rem', marginBottom: '15px' }}>{t.analyzing}</div>
            <div style={{ width: '28px', height: '28px', border: '2px solid rgba(255,255,255,0.2)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        </div>
      </div>
    );
  }

  const isEx3 = modoExercicio && RANKS_SELECT.includes(exercicioNivel);
  const fontSizeEx3 = '1.5rem';
  const [alturaTela, setAlturaTela] = React.useState(window.innerHeight);

  React.useEffect(() => {
    const handleResize = () => setAlturaTela(window.visualViewport?.height || window.innerHeight);
    window.visualViewport?.addEventListener('resize', handleResize);
    window.addEventListener('resize', handleResize);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  React.useEffect(() => {
    const ranksComSom = [1, 10, 19, 2, 11, 20, 3, 12, 21, 5, 14, 23, 7, 16, 25, 9, 18, 27];
    if (modoExercicio && ranksComSom.includes(Number(exercicioNivel))) {
      const timer = setTimeout(() => {
        falar({ id: frase?.id, texto: (idiomaEstudo === 'pi' && frase?.zh) ? frase.zh : textoEstudo }, false);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [indice, exercicioNivel, modoExercicio, idiomaEstudo, textoEstudo, frase, falar]);

  React.useEffect(() => {
    const ranksEsconderTrad = [5, 14, 23, 7, 16, 25, 9, 18, 27];
    if (modoExercicio && ranksEsconderTrad.includes(Number(exercicioNivel))) {
      setMostrarTraducao(false);
    } else if (modoExercicio) {
      setMostrarTraducao(true);
    } else {
      setMostrarTraducao(false);
    }
  }, [exercicioNivel, modoExercicio, setMostrarTraducao]);

  React.useEffect(() => {
    if (modoExercicio && RANKS_WRITE.includes(exercicioNivel) && editableRef.current) {
      const el = editableRef.current;
      const manterFoco = () => {
        if (modoExercicio && !resultadoFeedback) {
          setTimeout(() => el.focus(), 0);
        }
      };
      const timer = setTimeout(() => el.focus(), 300);
      el.addEventListener('blur', manterFoco);
      return () => {
        clearTimeout(timer);
        el.removeEventListener('blur', manterFoco);
      };
    }
  }, [exercicioNivel, modoExercicio, indice, resultadoFeedback]);

  const isCheckDisabled = modoExercicio && ((RANKS_WRITE.includes(exercicioNivel) && !valorInput.trim()) || (RANKS_SELECT.includes(exercicioNivel) && !slotsEx3.some(s => s && !s.fixed)));

  const temAudioExercicio = !modoExercicio || ![4, 13, 22, 6, 15, 24, 8, 17, 26].includes(Number(exercicioNivel));

  return (
    <div style={{ ...styles.viewport, backgroundColor: temas[idiomaEstudo].bg, height: alturaTela, position: 'absolute', top: 0, left: 0, width: '100%' }}>
      <div style={{ ...styles.mobileContainer, justifyContent: 'flex-start' }}>
        <button onClick={() => { const destino = userRole === 'adm' ? 'adm' : 'menuCartoes'; limparEstadoExercicio(); mudarTela(destino); }} style={{ ...styles.btnNavTopo, backgroundColor: ns.bg, color: ns.txt }}>← {t.quit}</button>
        {!modoExercicio && (
          <div style={styles.headerEstudoMinimo}><span style={styles.contadorCompacto}>{indice + 1} / {frasesFiltradas.length}</span></div>
        )}
        <div style={{ ...styles.cardFixoRelativo, position: 'relative', margin: '0 auto', borderColor: resultadoFeedback === 'acerto' ? COR_ACERTO : (resultadoFeedback === 'erro' ? '#ef4444' : 'transparent'), outline: 'none' }}
          onKeyDown={(e) => { if (e.key === 'Enter' && modoExercicio && !resultadoFeedback) { e.preventDefault(); verificarResposta(); } }}>

          {/* Botao discreto ⚑ no topo esquerdo do card */}
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
              color: temas[idiomaEstudo]?.bg || "#475569",
              opacity: 0.35,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
              lineHeight: 1
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.35")}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
          </button>

          {/* Janela sobreposta de reporte */}
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
                {!reporteEnviado ? (
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
                    {enviandoReporte ? (t?.sending || "Enviando...") : (t?.send || "Enviar")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={pularFrase}
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: "10px",
                      border: "none",
                      backgroundColor: corDinamica,
                      color: "#ffffff",
                      fontSize: "1rem",
                      fontWeight: "800",
                      cursor: "pointer",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
                    }}
                  >{t?.skipSentence || "Pular Frase"}</button>
                )}
              </div>
            </div>
          )}

          <div style={styles.topCardAreaFixed}>
            {!modoExercicio && <p style={{ ...styles.labelTopico, color: temas[idiomaEstudo].bg }}>{topicoAtivo}</p>}
            {modoExercicio && <span style={styles.labelInstrucao}>{RANKS_SELECT.includes(exercicioNivel) ? t.order : RANKS_WRITE.includes(exercicioNivel) ? t.fill : RANKS_VOICE.includes(exercicioNivel) ? t.pronounce : ""}</span>}
            {modoExercicio && !isEx3 && [1, 2, 3, 4, 6, 8, 10, 11, 12, 13, 15, 17, 19, 20, 21, 22, 24, 26].includes(exercicioNivel) && (
              <div style={{ color: '#64748b', lineHeight: '1.2', fontSize: '1.1rem', fontWeight: '600', marginTop: '10px', textAlign: 'center', width: '100%' }}>
                {idiomaOrigem === 'pi' ? frase?.zh : frase?.[idiomaOrigem]}
              </div>
            )}
            {modoExercicio && !isEx3 && !RANKS_WRITE.includes(exercicioNivel) && idiomaEstudo === 'pi' && frase?.zh && (
              <div style={{ color: '#94a3b8', fontSize: '1rem', marginTop: '5px' }}>{frase.zh}</div>
            )}
          </div>

          <div style={{ ...styles.areaFraseCentralFlex, flex: 1, padding: isEx3 ? 0 : '10px 0', overflow: isEx3 ? 'hidden' : 'auto' }}>
            {modoExercicio && isEx3 && [1, 2, 3, 4, 6, 8, 10, 11, 12, 13, 15, 17, 19, 20, 21, 22, 24, 26].includes(exercicioNivel) && (
              <div style={{ color: '#64748b', lineHeight: '1.2', fontSize: '1.1rem', fontWeight: '600', marginBottom: '10px', textAlign: 'center', width: '100%' }}>
                {idiomaOrigem === 'pi' ? frase?.zh : frase?.[idiomaOrigem]}
              </div>
            )}
            {modoExercicio ? (
              isEx3 ? (
                <ExercicioSelecao
                  idiomaEstudo={idiomaEstudo} frase={frase} exercicioNivel={exercicioNivel}
                  fontSizeEx3={fontSizeEx3} styles={styles} temas={temas} slotsEx3={slotsEx3}
                  removerPalavraSlot={removerPalavraSlot} resultadoFeedback={resultadoFeedback}
                  frasesFiltradas={frasesFiltradas} indice={indice} palavrasOpcoes={palavrasOpcoes}
                  selecionarPalavra={selecionarPalavra}
                />
              ) : (
                RANKS_WRITE.includes(exercicioNivel) ? (
                  <ExercicioEscrita
                    configLacuna={configLacuna} valorInput={valorInput} setValorInput={setValorInput}
                    resultadoFeedback={resultadoFeedback} setResultadoFeedback={setResultadoFeedback}
                    verificarResposta={verificarResposta} editableRef={editableRef} temas={temas}
                    idiomaEstudo={idiomaEstudo} styles={styles}
                  />
                ) : (
                  RANKS_VOICE.includes(exercicioNivel) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                      <ExercicioVoz textoEstudo={textoEstudo} resultadoFeedback={resultadoFeedback} idiomaEstudo={idiomaEstudo}
                        temas={temas} frase={frase} transcricaoAoVivo={transcricaoAoVivo}
                        indicesOcultosVoz={indicesOcultosVoz} styles={styles} t={t} />

                      {/* ETAPA 2: AVISO NO 3º ERRO CONSECUTIVO COM SAÍDA PARA O FINAL DA TASK */}
                      {resultadoFeedback === 'erro' && tentativasVoz >= 3 && (
                        <div style={{
                          marginTop: '16px',
                          padding: '14px 16px',
                          backgroundColor: '#fef2f2',
                          borderRadius: '12px',
                          border: '1px solid #fecaca',
                          textAlign: 'center',
                          width: '100%',
                          maxWidth: '360px',
                          boxSizing: 'border-box'
                        }}>
                          <p style={{ margin: '0 0 10px 0', fontSize: '0.88rem', color: '#991b1b', fontWeight: '700', lineHeight: '1.4' }}>
                            {t?.reviewLaterPrompt || "Revisar mais tarde, dê uma pesquisada nessa pronúncia e tente no próximo ciclo"}
                          </p>
                          <button
                            type="button"
                            onClick={handleRevisarMaisTarde}
                            style={{
                              padding: '10px 16px',
                              backgroundColor: corDinamica,
                              color: '#ffffff',
                              width: '100%',
                              fontSize: '0.95rem',
                              fontWeight: '800',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              border: 'none',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                            }}
                          >
                            {(t?.continueCycle || "Continuar Ciclo") + " →"}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <p style={styles.textoFrasePrincipal}>{textoEstudo}</p>
                    </div>
                  )
                )
              )
            ) : (
              <div style={{ textAlign: 'center' }}>
                <p style={styles.textoFrasePrincipal}>{textoEstudo}</p>
                {idiomaEstudo === 'pi' && frase?.zh && <div style={{ color: '#64748b', fontSize: '0.98rem', marginTop: '2px' }}>{frase.zh}</div>}
                <p style={styles.textoTraducaoInterno}>{idiomaOrigem === 'pi' ? frase?.zh : frase?.[idiomaOrigem]}</p>
              </div>
            )}
          </div>

          <div id="area-botoes-card" style={{ ...styles.bottomCardAreaFixed, gap: '10px' }}>
            <div style={styles.blocoSuporteIA}>
              {!modoExercicio ? (
                /* Card inicial: 3 botões em linha horizontal */
                <div style={styles.rowBotoesIA}>
                  <button onClick={() => explicarFraseIA(frase?.id)} style={{ ...styles.btnAcaoExtra, backgroundColor: temas[idiomaEstudo]?.bg, color: COR_TOM_CLARO }}>{t?.askAi || "Explicação"}</button>

                  <button onMouseDown={(e) => e.preventDefault()} onClick={handleOuvirClick} style={{ ...styles.btnAcaoExtra, backgroundColor: COR_SUPERFICIE_DIGITACAO, color: ns.bg, border: `1px solid ${temas[idiomaEstudo]?.bg}` }}>
                    {audioLento ? (t?.slow || "Lento") : (t?.normal || "Ouvir")}
                  </button>

                  {userRole === 'aluno' ? (
                    (() => {
                      const idAtual = frase?.id;
                      const maestriaData = frasesMaestria[idAtual];
                      const rankAtual = typeof maestriaData === 'object' ? maestriaData.rank : (maestriaData || 0);
                      return (
                        <button
                          onClick={handlePraticar}
                          disabled={rankAtual > 0}
                          style={{
                            ...styles.btnAcaoExtra,
                            backgroundColor: ns.bg,
                            color: ns.txt,
                            cursor: rankAtual > 0 ? 'default' : 'pointer'
                          }}
                        >
                          {rankAtual > 0 ? `${(rankAtual * 3.703).toFixed(2)}%` : t.practice}
                        </button>
                      );
                    })()
                  ) : (
                    <button onClick={handlePraticar} style={{ ...styles.btnAcaoExtra, backgroundColor: ns.bg, color: ns.txt }}>
                      {t.practice}
                    </button>
                  )}
                </div>
              ) : (
                /* Cards de exercício: exatamente 3 botões em linha horizontal */
                <div style={styles.rowBotoesIA}>
                  {RANKS_VOICE.includes(exercicioNivel) ? (
                    <>
                      {/* 1. Botão Rever (mesma aparência de Explicação) */}
                      <button onClick={handleRever} style={{ ...styles.btnAcaoExtra, backgroundColor: temas[idiomaEstudo]?.bg, color: COR_TOM_CLARO }}>
                        {t.review}
                      </button>

                      {/* 2. Botão Central: Ouvir/Lento se permitido, ou vazio e desativado */}
                      {temAudioExercicio && statusVoz === 'IDLE' && (!resultadoFeedback || resultadoFeedback === 'erro') ? (
                        <button onMouseDown={(e) => e.preventDefault()} onClick={handleOuvirClick} style={{ ...styles.btnAcaoExtra, backgroundColor: COR_SUPERFICIE_DIGITACAO, color: ns.bg, border: `1px solid ${temas[idiomaEstudo]?.bg}` }}>
                          {audioLento ? (t?.slow || "Lento") : (t?.normal || "Ouvir")}
                        </button>
                      ) : (
                        <button disabled style={{ ...styles.btnAcaoExtra, backgroundColor: COR_SUPERFICIE_DIGITACAO, border: `1px solid ${temas[idiomaEstudo]?.bg}`, opacity: 0.2, cursor: 'default' }}>
                          &nbsp;
                        </button>
                      )}

                      {/* 3. Botão Falar agora / Verificar / Tentar novamente */}
                      <button
                        onClick={() => {
                          if (statusVoz === 'RECORDING') {
                            if (pararEAvaliarVoz) pararEAvaliarVoz();
                            else if (window.dingliPararEAvaliarVoz) window.dingliPararEAvaliarVoz();
                          } else if (statusVoz === 'IDLE') {
                            if (tentativasVoz >= 3 && resultadoFeedback === 'erro') {
                              handleRevisarMaisTarde();
                              return;
                            }
                            setResultadoFeedback(null);
                            iniciarReconhecimentoVoz(frase);
                          }
                        }}
                        disabled={statusVoz === 'EVALUATING' || resultadoFeedback === 'acerto'}
                        style={{
                          ...styles.btnAcaoExtra,
                          backgroundColor: ns.bg,
                          color: ns.txt,
                          opacity: (resultadoFeedback === 'acerto' || statusVoz === 'EVALUATING') ? 0.5 : 1
                        }}
                      >
                        {statusVoz === 'RECORDING' ? (
                          t.check || 'Verificar'
                        ) : statusVoz === 'EVALUATING' ? (
                          '...'
                        ) : resultadoFeedback === 'erro' ? (
                          tentativasVoz >= 3 ? (t?.continueCycle || 'Continuar') : (t?.speakAgain || 'Falar de novo')
                        ) : (
                          t.speakNow
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      {/* 1. Botão Rever (mesma aparência de Explicação) */}
                      <button onMouseDown={(e) => e.preventDefault()} onClick={handleRever} style={{ ...styles.btnAcaoExtra, backgroundColor: temas[idiomaEstudo]?.bg, color: COR_TOM_CLARO }}>
                        {t.review}
                      </button>

                      {/* 2. Botão Central: Ouvir/Lento se permitido, ou vazio e desativado */}
                      {temAudioExercicio ? (
                        <button onMouseDown={(e) => e.preventDefault()} onClick={handleOuvirClick} style={{ ...styles.btnAcaoExtra, backgroundColor: COR_SUPERFICIE_DIGITACAO, color: ns.bg, border: `1px solid ${temas[idiomaEstudo]?.bg}` }}>
                          {audioLento ? (t?.slow || "Lento") : (t?.normal || "Ouvir")}
                        </button>
                      ) : (
                        <button disabled style={{ ...styles.btnAcaoExtra, backgroundColor: COR_SUPERFICIE_DIGITACAO, border: `1px solid ${temas[idiomaEstudo]?.bg}`, opacity: 0.2, cursor: 'default' }}>
                          &nbsp;
                        </button>
                      )}

                      {/* 3. Botão Verificar (mesma aparência de Praticar) */}
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={verificarResposta}
                        disabled={isCheckDisabled}
                        style={{
                          ...styles.btnAcaoExtra,
                          backgroundColor: ns.bg,
                          color: ns.txt,
                          opacity: isCheckDisabled ? 0.5 : 1,
                          cursor: isCheckDisabled ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {t.check}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {!modoExercicio && (
          <div style={styles.controlesNavInferior}>
            <button style={{ ...styles.btnNavFinal, backgroundColor: ns.bg, color: ns.txt }} onClick={() => setIndice((indice - 1 + frasesFiltradas.length) % frasesFiltradas.length)}>{t.prev}</button>
            <button style={{ ...styles.btnNavFinal, backgroundColor: ns.bg, color: ns.txt }} onClick={() => setIndice((indice + 1) % frasesFiltradas.length)}>{t.next}</button>
          </div>
        )}
      </div>
    </div>
  );
}