import React from 'react';
import { NOMES_RANKS, ESTRUTURA_NIVEIS } from '../constant';
import { useDingli } from '../DingliContext';

export function EscolherNivel({
  styles, selecionarNivel, sessaoDominium, frasesMaestria
}) {
  const { temas, t, getCorFonteDinamica, navStyle, idiomaEstudo, mudarTela, COR_BASE_CARDS } = useDingli();

  const ns = navStyle(idiomaEstudo);
  const corFonte = getCorFonteDinamica(idiomaEstudo);

  return (
    <div style={{ ...styles.viewport, backgroundColor: temas[idiomaEstudo].bg }}>
      <div style={styles.mobileContainer}>
        <button onClick={() => mudarTela('menuCartoes')} style={{ ...styles.btnNavTopo, backgroundColor: ns.bg, color: ns.txt }}>← {t.back}</button>
        <div className="scroll-container" style={styles.areaScrollMenu}>
          {(ESTRUTURA_NIVEIS[idiomaEstudo] || ESTRUTURA_NIVEIS.default).map(n => {
            const desativado = false;
            return (
              <button
                key={n}
                onClick={() => !desativado && selecionarNivel(n)}
                disabled={desativado}
                style={{
                  ...styles.btnPadrao,
                  backgroundColor: COR_BASE_CARDS,
                  color: corFonte,
                  opacity: desativado ? 0.4 : 1,
                  cursor: desativado ? 'not-allowed' : 'pointer'
                }}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { listarTopicosSalvos } from '../services/offlineStorage';
import { dataService } from '../dataService';
import { precarregarAudios, VOZES_EN, VOZES_ES, VOZES_FR, VOZES_IT, VOZES_GE, VOZES_PT, VOZES_ZH } from '../services/audioCacheService';

export function EscolherTopic({
  styles, listaTopicos, selecionarTopico,
  mapaTopicosIds = {}, frasesMaestria = {}, nivelAtivo = "", idiomaOrigem = "pt"
}) {
  const { temas, t, getCorFonteDinamica, navStyle, idiomaEstudo, mudarTela, COR_BASE_CARDS, COR_ACERTO } = useDingli();

  const ns = navStyle(idiomaEstudo);
  const corFonte = getCorFonteDinamica(idiomaEstudo);

  const [topicosBaixados, setTopicosBaixados] = React.useState([]);
  const [baixandoTopico, setBaixandoTopico] = React.useState(null);

  React.useEffect(() => {
    let ativo = true;
    listarTopicosSalvos(nivelAtivo, idiomaEstudo).then(salvos => {
      if (ativo && salvos) setTopicosBaixados(salvos);
    });
    return () => { ativo = false; };
  }, [nivelAtivo, idiomaEstudo]);

  const baixarTopicoOffline = async (nomeTopico) => {
    if (baixandoTopico) return;
    setBaixandoTopico(nomeTopico);
    try {
      const colTopicOrigem = `topic_${idiomaOrigem}`;
      const { data } = await dataService.getSentencesByTopic(nivelAtivo, idiomaEstudo, colTopicOrigem, nomeTopico);
      if (data && data.length > 0) {
        const vozes = (idiomaEstudo === 'pi' || idiomaEstudo === 'zh') ? VOZES_ZH : (idiomaEstudo === 'pt' ? VOZES_PT : (idiomaEstudo === 'ge' ? VOZES_GE : (idiomaEstudo === 'it' ? VOZES_IT : (idiomaEstudo === 'fr' ? VOZES_FR : (idiomaEstudo === 'es' ? VOZES_ES : VOZES_EN)))));
        await precarregarAudios(data, idiomaEstudo, vozes);
        setTopicosBaixados(prev => [...prev, nomeTopico]);
      }
    } catch (e) {
      console.warn("Falha no download offline do topico:", e);
    } finally {
      setBaixandoTopico(null);
    }
  };

  return (
    <div style={{ ...styles.viewport, backgroundColor: temas[idiomaEstudo].bg }}>
      <div style={styles.mobileContainer}>
        <button onClick={() => mudarTela('escolherNivel')} style={{ ...styles.btnNavTopo, backgroundColor: ns.bg, color: ns.txt }}>← {t.back}</button>
        <div className="scroll-container" style={styles.areaScrollMenu}>
          {listaTopicos.map(tp => {
            const idsDoTopico = mapaTopicosIds[tp] || [];
            const total = idsDoTopico.length;
            const iniciadas = idsDoTopico.filter(id => {
              const r = frasesMaestria[id];
              return typeof r === 'object' ? (r && r.rank > 0) : (r > 0);
            }).length;

            const pctIniciadas = total > 0 ? (iniciadas / total) : 0;
            const tudoIniciado = total > 0 && iniciadas === total;

            const estaBaixado = topicosBaixados.includes(tp);
            const estaBaixando = baixandoTopico === tp;

            return (
              <button
                key={tp}
                onClick={() => selecionarTopico(tp)}
                style={{
                  ...styles.btnPadrao,
                  backgroundColor: COR_BASE_CARDS,
                  color: corFonte,
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* 1. Indicador Dominium Concluido (Tick na Esquerda) */}
                {tudoIniciado && (
                  <span
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: corFonte,
                      opacity: 0.85
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                )}

                {/* Texto do Topico (Centralizado) */}
                <span>{tp}</span>

                {/* 2. Botao / Indicador de Download Offline (Ponta Direita) */}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!estaBaixado && !estaBaixando) baixarTopicoOffline(tp);
                  }}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: (!estaBaixado && !estaBaixando) ? 'pointer' : 'default',
                    opacity: estaBaixando ? 0.9 : (estaBaixado ? 0 : 0.45),
                    transition: 'opacity 0.2s ease'
                  }}
                >
                  {estaBaixando ? (
                    <span
                      style={{
                        width: '13px',
                        height: '13px',
                        border: '2px solid currentColor',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        display: 'inline-block',
                        animation: 'spinOffline 0.8s linear infinite'
                      }}
                    />
                  ) : !estaBaixado ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  ) : null}
                </span>

                {/* 3. Micro Barra de Progresso do Dominium (Underline de 3px) */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    height: '3px',
                    width: `${pctIniciadas * 100}%`,
                    backgroundColor: tudoIniciado ? (COR_ACERTO || corFonte) : corFonte,
                    opacity: tudoIniciado ? 0.9 : 0.4,
                    transition: 'width 0.3s ease'
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function SelecaoExercicio({ styles, iniciarExercicio }) {
  const { temas, t, getCorFonteDinamica, navStyle, idiomaEstudo } = useDingli();

  const ns = navStyle(idiomaEstudo);
  const corFonte = getCorFonteDinamica(idiomaEstudo);

  return (
    <div style={{ ...styles.viewport, backgroundColor: temas[idiomaEstudo].bg }}>
      <div style={styles.mobileContainer}>
        <button onClick={() => window.history.back()} style={{ ...styles.btnNavTopo, backgroundColor: ns.bg, color: ns.txt }}>← {t.back}</button>
        <div className="scroll-container" style={styles.areaScrollMenu}>
          {NOMES_RANKS.map((nome, i) => {
            const n = i + 1;
            return (
              <button key={n} onClick={() => iniciarExercicio(n)} style={{ ...styles.btnPadrao, backgroundColor: '#fff', color: corFonte, minHeight: '55px', fontSize: '1rem', padding: '10px' }}>Rank {n} ({nome})</button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function Adm({ styles }) {
  const { mudarTela, setUserRole } = useDingli();

  return (
    <div style={{ ...styles.viewport, backgroundColor: '#000' }}>
      <div style={styles.mobileContainer}>
        <div style={{ textAlign: 'center', marginBottom: '30px', marginTop: '20px' }}>
          <h2 style={{ color: '#fff', fontSize: '2rem', fontWeight: '900', margin: 0 }}>Adm</h2>
        </div>
        <div className="scroll-container" style={{ ...styles.areaScrollMenu, justifyContent: 'flex-start', gap: '12px' }}>
          <button
            onClick={() => mudarTela('escolherOrigem')}
            style={{ padding: '16px', borderRadius: '12px', border: 'none', backgroundColor: '#1e293b', color: '#fff', fontWeight: '900', fontSize: '1.1rem', cursor: 'pointer' }}
          >
            Phrase Cards
          </button>
          <button
            onClick={() => {
              setUserRole('aluno');
              mudarTela('perfil');
            }}
            style={{ padding: '16px', borderRadius: '12px', border: 'none', backgroundColor: '#1e293b', color: '#fff', fontWeight: '900', fontSize: '1.1rem', cursor: 'pointer' }}
          >
            Profile
          </button>
        </div>
      </div>
    </div>
  );
}
