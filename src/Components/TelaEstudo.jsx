import React from 'react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { RANKS_SELECT, RANKS_WRITE, RANKS_VOICE } from '../constant';
import { useDingli } from '../DingliContext';
import { calcularProximoRank } from '../useSRSLogic'; 

const ExercicioSelecao = ({
  idiomaEstudo, frase, exercicioNivel, fontSizeEx3, styles, temas,
  slotsEx3, removerPalavraSlot, resultadoFeedback, frasesFiltradas, indice,
  palavrasOpcoes, selecionarPalavra, corAcerto, corErro, corBgSecundarios
}) => {
  const getCorSlotEx3 = (slot) => (temas[idiomaEstudo]?.bg || '#6366f1') + '26';

  const getCorTextoSlotEx3 = (slot, index) => {
    if (!slot) return 'transparent';
    if (!resultadoFeedback) return '#000';
    const fraseOriginal = frase ? frase[idiomaEstudo] : (frasesFiltradas[indice]?.[idiomaEstudo] || "");
    const palavrasCorretas = fraseOriginal.split(" ");
    const limpar = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss").toLowerCase().replace(/[.,!?;:¿¡"'{}()\[\]\-—…，。！？；：、]/g, "").trim();
    const estaCorreta = limpar(slot.texto) === limpar(palavrasCorretas[index]);
    if (resultadoFeedback === 'acerto') return corAcerto;
    if (estaCorreta) return resultadoFeedback === 'erro_limpo' ? '#000' : corAcerto;
    return corErro;
  };

  return (
    <div style={styles.gameContainerEx3}>
      {idiomaEstudo === 'pi' && frase?.zh && ![4, 11, 18].includes(exercicioNivel) && <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem', padding: '0px 0' }}>{frase.zh}</div>}
      <div style={styles.gavetaSelecionadasFlex}>
        {slotsEx3.map((slot, i) => (
          <div
            key={i}
            style={{
              ...styles.btnPalavraEx3,
              fontSize: fontSizeEx3,
              backgroundColor: getCorSlotEx3(slot),
              color: getCorTextoSlotEx3(slot, i),
              border: (resultadoFeedback && slot)
                ? (resultadoFeedback === 'acerto'
                  ? `2px solid ${corAcerto}`
                  : (slot.texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss").toLowerCase().replace(/[.,!?;:¿¡"'{}()\[\]\-—…，。！？；：、]/g, "") === frase[idiomaEstudo].split(" ")[i].normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss").toLowerCase().replace(/[.,!?;:¿¡"'{}()\[\]\-—…，。！？；：、]/g, "")
                    ? (resultadoFeedback === 'erro_limpo' ? '1px solid #cbd5e1' : `2px solid ${corAcerto}`)
                    : `2px solid ${corErro}`))
                : ('1px solid #cbd5e1'),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={() => resultadoFeedback !== 'acerto' && removerPalavraSlot(i)}
          >
            {slot?.texto}
          </div>
        ))}
      </div>
      <div style={styles.divisorEx3} />
      <div style={styles.gavetaOpcoesFlex}>
        {palavrasOpcoes.map((p) => (
          <button
            key={p.id}
            onClick={() => !p.usado && resultadoFeedback !== 'acerto' && selecionarPalavra(p)}
            style={{
              ...styles.btnPalavraEx3,
              fontSize: fontSizeEx3,
              backgroundColor: p.usado ? '#f8fafc' : corBgSecundarios,
              color: p.usado ? 'transparent' : '#000',
              border: '1px solid #cbd5e1',
              visibility: p.usado ? 'hidden' : 'visible'
            }}
          >
            {p.texto}
          </button>
        ))}
      </div>
    </div>
  );
};

const ExercicioEscrita = ({
  configLacuna, valorInput, setValorInput, resultadoFeedback, setResultadoFeedback,
  verificarResposta, editableRef, styles, corAcerto, corErro
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
              {resultadoFeedback === 'acerto' ? <span style={{ color: corAcerto }}>{configLacuna.resposta}</span> : configLacuna.resposta.split(/\s+/).map((word, i) => {
                const userWords = valorInput.trim().split(/\s+/);
                const clean = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss").toLowerCase().replace(/[.,!?;:¿¡"'{}()\[\]\-—…，。！？；：、]/g, "").trim();
                const isCorrect = clean(word) === clean(userWords[i]);
                return <span key={i} style={{ color: isCorrect ? corAcerto : corErro }}>{i > 0 ? ' ' : ''}{word}</span>
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
  textoEstudo, resultadoFeedback, idiomaEstudo, frase,
  transcricaoAoVivo, indicesOcultosVoz, styles, corAcerto, corErro
}) => {
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={styles.textoFrasePrincipal}>
        {resultadoFeedback === 'acerto' ? <span style={{ color: corAcerto }}>{textoEstudo}</span> : (() => {
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
            if (estaNaFala) { cor = corAcerto; borderB = '2px solid transparent'; } else if (resultadoFeedback === 'erro') { cor = corErro; }
            return <span key={i} style={{ color: cor, borderBottom: borderB, paddingBottom: '2px', display: 'inline-block', marginRight: '4px' }}>{word}</span>
          });
        })()}
      </p>
    </div>
  );
};

export default function TelaEstudo({
  fraseAtivaGlobal,
  frasesFiltradas, indice, nivelAtivo, topicoAtivo,
  modoExercicio, exercicioNivel, styles,
  carregandoDados, mostrarTraducao, setMostrarTraducao, falar,
  explicarFraseIA, frasesMaestria, setFrasesMaestria, setModoJogo,
  setSessaoIniciada, limparEstadoExercicio, statusVoz, volume,
  iniciarReconhecimentoVoz, setIndice, transcricaoAoVivo,
  iniciarExercicio, aiExplanation, aiLoading, setModoExercicio,
  filaErros, setFilaErros, filaAcertos, setFilaAcertos,
  sessaoDominium, setSessaoDominium, jogarDominiumInteligente
}) {
  const { temas, t, getCorFonteDinamica, navStyle, idiomaEstudo, idiomaOrigem, mudarTela, userRole, COR_ACERTO, COR_ERRO, COR_BG_SECUNDARIOS } = useDingli();

  const frase = useMemo(() => {
    return fraseAtivaGlobal
      ? { id: fraseAtivaGlobal.id, [idiomaEstudo]: fraseAtivaGlobal.texto, [idiomaOrigem]: fraseAtivaGlobal.traducao || "", zh: fraseAtivaGlobal.texto_zh, nivel: fraseAtivaGlobal.nivel, topico: fraseAtivaGlobal.topico }
      : (frasesFiltradas && frasesFiltradas[indice]) ? frasesFiltradas[indice] : null;
  }, [fraseAtivaGlobal, frasesFiltradas, indice, idiomaEstudo, idiomaOrigem]);

  const ns = navStyle(idiomaEstudo);
  const textoEstudo = frase?.[idiomaEstudo] || "";

  const [resultadoFeedback, setResultadoFeedback] = useState(null);
  const [valorInput, setValorInput] = useState("");
  const [configLacuna, setConfigLacuna] = useState({ prefixo: "", sufixo: "", resposta: "" });
  const [palavrasOpcoes, setPalavrasOpcoes] = useState([]);
  const [slotsEx3, setSlotsEx3] = useState([]);
  const [indicesOcultosVoz, setIndicesOcultosVoz] = useState([]);
  const [, setTentativaFinalizada] = useState(false);
  const [alturaTela, setAlturaTela] = useState(window.innerHeight);

  const editableRef = useRef(null);
  const processandoAcertoRef = useRef(false);
  const jogarDominiumRef = useRef(jogarDominiumInteligente);

  useEffect(() => {
    jogarDominiumRef.current = jogarDominiumInteligente;
  }, [jogarDominiumInteligente]);

  useEffect(() => {
    const handleResize = () => setAlturaTela(window.visualViewport?.height || window.innerHeight);
    window.visualViewport?.addEventListener('resize', handleResize);
    window.addEventListener('resize', handleResize);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const ranksComSom = [1, 10, 19, 2, 11, 20, 3, 12, 21, 5, 14, 23, 7, 16, 25, 9, 18, 27];
    if (modoExercicio && ranksComSom.includes(Number(exercicioNivel)) && textoEstudo) {
      const timer = setTimeout(() => {
        falar((idiomaEstudo === 'pi' && frase?.zh) ? frase.zh : textoEstudo, false);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [indice, exercicioNivel, modoExercicio, idiomaEstudo, textoEstudo, frase, falar]);

  useEffect(() => {
    const ranksEsconderTrad = [5, 14, 23, 7, 16, 25, 9, 18, 27];
    if (modoExercicio && ranksEsconderTrad.includes(Number(exercicioNivel))) {
      setMostrarTraducao(false);
    } else if (modoExercicio) {
      setMostrarTraducao(true);
    } else {
      setMostrarTraducao(false);
    }
  }, [exercicioNivel, modoExercicio, setMostrarTraducao]);

  useEffect(() => {
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

  useEffect(() => {
    if (modoExercicio && exercicioNivel > 0 && frase && textoEstudo) {
      setResultadoFeedback(null); setTentativaFinalizada(false); setValorInput("");

      const fraseOriginal = textoEstudo;
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
        // audio gerenciado pelo efeito de rank
      } else if (RANKS_SELECT.includes(exercicioNivel)) {
        const minInterativo = (exercicioNivel <= 9) ? Math.min(2, palavras.length) : 1;
        const qtdInterativa = Math.max(minInterativo, Math.round(palavras.length * percentual));
        const indicesInterativos = [];
        const pool = palavras.map((_, i) => i);
        for (let i = 0; i < qtdInterativa; i++) indicesInterativos.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
        setSlotsEx3(palavras.map((w, i) => indicesInterativos.includes(i) ? null : { id: `f-${i}`, texto: w, fixed: true }));
        setPalavrasOpcoes(indicesInterativos.map(idx => ({ id: idx, texto: palavras[idx], usado: false })).sort(() => Math.random() - 0.5));
        // audio gerenciado pelo efeito de rank
      } else if (RANKS_VOICE.includes(exercicioNivel)) {
        const finalQtdVoz = Math.max(([3, 8, 12, 17, 21, 26].includes(exercicioNivel) ? 2 : 0), Math.round(palavras.length * percentual));
        setIndicesOcultosVoz(Array.from({ length: Math.min(finalQtdVoz, palavras.length) }, (_, i) => i));
        // audio gerenciado pelo efeito de rank
      }
    } else {
      setResultadoFeedback(null); setValorInput(""); setPalavrasOpcoes([]); setSlotsEx3([]); setIndicesOcultosVoz([]);
      if (editableRef.current) editableRef.current.innerText = "";
    }
  }, [modoExercicio, exercicioNivel, indice, frase, textoEstudo, idiomaEstudo, falar]);

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
    if (resultadoFeedback === 'acerto' || !frase) return;
    if (resultadoFeedback === 'erro' || resultadoFeedback === 'erro_limpo') setResultadoFeedback(null);
    const fraseOriginal = frase[idiomaEstudo];
    const limpar = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss").trim().toLowerCase().replace(/[.,!?;:¿¡"'{}()\[\]\-—…，。！？；：、]/g, "");
    const corretaLimpa = limpar(fraseOriginal);
    let tentativaLimpa = "";
    if (RANKS_VOICE.includes(exercicioNivel)) return;
    if (RANKS_SELECT.includes(exercicioNivel)) {
      tentativaLimpa = limpar(slotsEx3.map(s => s ? s.texto : "").join(" "));
    } else if (RANKS_WRITE.includes(exercicioNivel)) {
      tentativaLimpa = (limpar(valorInput) === limpar(configLacuna.resposta)) ? corretaLimpa : "erro_total";
    }

    const maestriaSegura = frasesMaestria || {};

    if (tentativaLimpa === corretaLimpa) {
      setResultadoFeedback('acerto'); processandoAcertoRef.current = true;
      const estavaNaFilaErro = filaErros.some(item => item.indice === indice);
      setFilaErros(prev => prev.filter(item => item.indice !== indice));
      const rankObj = maestriaSegura[frase.id];
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
      falar((idiomaEstudo === 'pi' && frase.zh) ? frase.zh : fraseOriginal, false);
      setTimeout(() => {
        setResultadoFeedback(null); if (setModoExercicio) setModoExercicio(false); processandoAcertoRef.current = false;
        if (jogarDominiumRef.current) jogarDominiumRef.current();
      }, Math.max(fraseOriginal.split(" ").length * 600, 2000));
    } else {
      setResultadoFeedback('erro');
      const rankObj = maestriaSegura[frase.id];
      const rankAtual = typeof rankObj === 'object' ? rankObj.rank : (rankObj || 0);
      const highestRank = typeof rankObj === 'object' ? (rankObj.highest_rank || rankAtual) : rankAtual;
      const calc = calcularProximoRank(rankAtual, false, highestRank, filaErros.some(item => item.indice === indice) || (typeof rankObj === 'object' && rankObj.status === 'recuperacao'));
      setFrasesMaestria(prev => ({ ...prev, [frase.id]: { rank: calc.novoRank, status: calc.lista, next_review: Date.now() + calc.espera, last_review: Date.now(), last_attempt_at: Date.now(), highest_rank: Math.max(highestRank, calc.novoRank), texto: fraseOriginal, traducao: frase[idiomaOrigem] || "", texto_zh: frase?.zh || "", nivel: frase.nivel || nivelAtivo, topico: frase.topico || topicoAtivo } }));
      setSessaoDominium(prev => ({ ...prev, falhas: [...(prev.falhas || []).filter(f => (f.frase || f) !== fraseOriginal), { frase: fraseOriginal, id: frase.id, curso: `${idiomaOrigem}_${idiomaEstudo}` }], primeira: (prev.primeira || []).filter(f => (f.frase || f) !== fraseOriginal) }));
      setFilaAcertos(prev => prev.filter(item => item.indice !== indice));
      setFilaErros(prev => prev.some(item => item.indice === indice) ? prev : [...prev, { indice, rank: calc.novoRank }]);
      falar((idiomaEstudo === 'pi' && frase.zh) ? frase.zh : fraseOriginal, false);
      setTimeout(() => {
        setTentativaFinalizada(false);
        if (RANKS_SELECT.includes(exercicioNivel)) { setResultadoFeedback('erro_limpo'); }
        else if (RANKS_WRITE.includes(exercicioNivel)) { setValorInput(""); setResultadoFeedback(null); }
      }, Math.max(fraseOriginal.split(" ").length * 600, 1000));
    }
  }, [resultadoFeedback, frase, idiomaEstudo, exercicioNivel, slotsEx3, valorInput, configLacuna, frasesMaestria, falar, setFilaAcertos, setFilaErros, setFrasesMaestria, setSessaoDominium, filaErros, indice, idiomaOrigem, nivelAtivo, topicoAtivo, setModoExercicio, COR_ACERTO, COR_ERRO]);

  const handleRever = useCallback(() => {
    if (!frase) return;
    const fraseOriginal = frase[idiomaEstudo];
    if (setModoExercicio) setModoExercicio(false);
    setSessaoIniciada(false);
    setResultadoFeedback(null);
    setValorInput("");
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
  }, [frase, idiomaEstudo, indice, nivelAtivo, topicoAtivo, setModoExercicio, setSessaoIniciada, setFrasesMaestria, setFilaErros, setFilaAcertos, setSessaoDominium]);

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

  const corFonteBotoesCard = getCorFonteDinamica(idiomaEstudo);
  const isEx3 = modoExercicio && RANKS_SELECT.includes(exercicioNivel);
  const fontSizeEx3 = '1.5rem';
  const isCheckDisabled = modoExercicio && ((RANKS_WRITE.includes(exercicioNivel) && !valorInput.trim()) || (RANKS_SELECT.includes(exercicioNivel) && !slotsEx3.some(s => s && !s.fixed)));

  return (
    <div style={{ ...styles.viewport, backgroundColor: temas[idiomaEstudo].bg, height: alturaTela, position: 'absolute', top: 0, left: 0, width: '100%' }}>
      <div style={{ ...styles.mobileContainer, justifyContent: 'flex-start' }}>
        <button onClick={() => { limparEstadoExercicio(); mudarTela('menuCartoes'); }} style={{ ...styles.btnNavTopo, backgroundColor: ns.bg, color: ns.txt }}>← {t.quit}</button>
        {!modoExercicio && (
          <div style={styles.headerEstudoMinimo}><span style={styles.contadorCompacto}>{indice + 1} / {frasesFiltradas.length}</span></div>
        )}
        <div style={{ ...styles.cardFixoRelativo, margin: '0 auto', borderColor: resultadoFeedback === 'acerto' ? COR_ACERTO : (resultadoFeedback === 'erro' ? COR_ERRO : 'transparent'), outline: 'none' }}
          onKeyDown={(e) => { if (e.key === 'Enter' && modoExercicio && !resultadoFeedback) { e.preventDefault(); verificarResposta(); } }}>

          <div style={styles.topCardAreaFixed}>
            {!modoExercicio && <p style={{ ...styles.labelTopico, color: ['es', 'ge', 'pi'].includes(idiomaEstudo) ? '#dc2626' : temas[idiomaEstudo].bg }}>{topicoAtivo}</p>}
            {modoExercicio && <span style={styles.labelInstrucao}>{RANKS_SELECT.includes(exercicioNivel) ? t.order : RANKS_WRITE.includes(exercicioNivel) ? t.fill : RANKS_VOICE.includes(exercicioNivel) ? t.pronounce : ""}</span>}
            {modoExercicio && !isEx3 && [1, 2, 3, 4, 6, 8, 10, 11, 12, 13, 15, 17, 19, 20, 21, 22, 24, 26].includes(exercicioNivel) && (
              <div style={{ color: '#64748b', lineHeight: '1.2', fontSize: '1.1rem', fontWeight: '600', marginTop: '10px', textAlign: 'center', width: '100%' }}>
                {idiomaOrigem === 'pi' ? frase?.zh : frase?.[idiomaOrigem]}
              </div>
            )}
            {modoExercicio && !isEx3 && idiomaEstudo === 'pi' && frase?.zh && (
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
                  selecionarPalavra={selecionarPalavra} corAcerto={COR_ACERTO} corErro={COR_ERRO} corBgSecundarios={COR_BG_SECUNDARIOS}
                />
              ) : (
                RANKS_WRITE.includes(exercicioNivel) ? (
                  <ExercicioEscrita
                    configLacuna={configLacuna} valorInput={valorInput} setValorInput={setValorInput}
                    resultadoFeedback={resultadoFeedback} setResultadoFeedback={setResultadoFeedback}
                    verificarResposta={verificarResposta} editableRef={editableRef}
                    styles={styles} corAcerto={COR_ACERTO} corErro={COR_ERRO}
                  />
                ) : (
                  RANKS_VOICE.includes(exercicioNivel) ? (
                    <ExercicioVoz
                      textoEstudo={textoEstudo} resultadoFeedback={resultadoFeedback} idiomaEstudo={idiomaEstudo}
                      frase={frase} transcricaoAoVivo={transcricaoAoVivo}
                      indicesOcultosVoz={indicesOcultosVoz} styles={styles} corAcerto={COR_ACERTO} corErro={COR_ERRO}
                    />
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
              </div>
            )}
          </div>

          <div id="area-botoes-card" style={{ ...styles.bottomCardAreaFixed, gap: '10px' }}>
            {!modoExercicio && (
              <>
                {mostrarTraducao && <div style={{ marginTop: '-10px', marginBottom: '-20px', textAlign: 'center', width: '100%' }}><p style={styles.textoTraducaoInterno}>{idiomaOrigem === 'pi' ? frase?.zh : frase?.[idiomaOrigem]}</p></div>}
                <button onClick={() => setMostrarTraducao(!mostrarTraducao)} style={{ ...styles.btnToggleTrad, marginBottom: 0 }}>{mostrarTraducao ? t.hide : t.show}</button>
              </>
            )}

            {![4, 13, 22, 6, 15, 24, 8, 17, 26].includes(Number(exercicioNivel)) && (
              <div style={styles.rowAudio}>
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => falar((idiomaEstudo === 'pi' && frase?.zh) ? frase.zh : textoEstudo, true)} style={{ ...styles.btnAudioRound, backgroundColor: COR_BG_SECUNDARIOS, color: corFonteBotoesCard }}>{t.slow}</button>
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => falar((idiomaEstudo === 'pi' && frase?.zh) ? frase.zh : textoEstudo, false)} style={{ ...styles.btnAudioRound, backgroundColor: COR_BG_SECUNDARIOS, color: corFonteBotoesCard }}>{t.normal}</button>
              </div>
            )}

            <div style={styles.blocoSuporteIA}>
              {!modoExercicio ? (
                <div style={styles.rowBotoesIA}>
                  <button onClick={() => explicarFraseIA(textoEstudo)} style={{ ...styles.btnAcaoExtra, backgroundColor: COR_BG_SECUNDARIOS, color: corFonteBotoesCard }}>{t.askAi}</button>
                  {userRole === 'aluno' ? (
                    (() => {
                      const idAtual = frase?.id;
                      const maestriaData = (frasesMaestria || {})[idAtual];
                      const rankAtual = typeof maestriaData === 'object' ? maestriaData.rank : (maestriaData || 0);
                      return (
                        <button onClick={() => { setModoJogo(true); setSessaoIniciada(true); iniciarExercicio(rankAtual > 0 ? rankAtual : 1); }} disabled={rankAtual > 0} style={{ ...styles.btnAcaoExtra, backgroundColor: rankAtual > 0 ? COR_BG_SECUNDARIOS : ns.bg, color: rankAtual > 0 ? '#94a3b8' : ns.txt }}>
                          {rankAtual > 0 ? `${(rankAtual * 3.703).toFixed(2)}%` : t.practice}
                        </button>
                      );
                    })()
                  ) : <button onClick={() => mudarTela('selecaoExercicio')} style={{ ...styles.btnAcaoExtra, backgroundColor: ns.bg, color: ns.txt }}>{t.practice}</button>}
                </div>
              ) : (
                <div style={styles.rowBotoesIA}>
                  {RANKS_VOICE.includes(exercicioNivel) ? (
                    <>
                      <button onClick={handleRever} style={{ ...styles.btnAcaoExtra, backgroundColor: COR_BG_SECUNDARIOS, color: corFonteBotoesCard }}>{t.review}</button>
                      <button onClick={() => iniciarReconhecimentoVoz(frase)} disabled={statusVoz !== 'IDLE' || resultadoFeedback !== null} style={{ ...styles.btnAcaoExtra, backgroundColor: ns.bg, color: ns.txt, opacity: resultadoFeedback ? 0.5 : 1 }}>
                        {statusVoz !== 'IDLE' ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', height: '24px' }}>
                            {statusVoz === 'EVALUATING' ? <span style={{ color: ns.txt, fontSize: '0.9rem', fontWeight: 'bold' }}>...</span> : [0, 1, 2, 3, 4, 5, 6].map((i) => <div key={i} style={{ width: '4px', backgroundColor: '#fff', borderRadius: '10px', height: (statusVoz === 'RECORDING') ? `${15 + Math.min(85, (volume * (0.3 + (i % 4) * 0.2)))}%` : '30%', transition: 'height 0.05s linear' }} />)}
                          </div>
                        ) : t.speakNow}
                      </button>
                    </>
                  ) : (
                    <>
                      <button onMouseDown={(e) => e.preventDefault()} onClick={handleRever} style={{ ...styles.btnAcaoExtra, backgroundColor: COR_BG_SECUNDARIOS, color: corFonteBotoesCard }}>{t.review}</button>
                      <button onMouseDown={(e) => e.preventDefault()} onClick={verificarResposta} disabled={isCheckDisabled} style={{ ...styles.btnAcaoExtra, backgroundColor: ns.bg, color: ns.txt, opacity: isCheckDisabled ? 0.5 : 1, cursor: isCheckDisabled ? 'not-allowed' : 'pointer' }}>{t.check}</button>
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
