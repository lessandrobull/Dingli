import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDominiumData } from '../useDominiumData';
import { useDingli } from '../DingliContext';
import { tocarAudioPalavra } from '../services/audioCacheService';

export function ExplicacaoIA({
  styles,
  aiLoading, aiExplanation, frasesFiltradas, indice, explicarFraseIA,
  telaRetorno = 'estudo', fraseExibicao = null, falar
}) {
  const { temas, t, navStyle, idiomaEstudo, idiomaOrigem, mudarTela, COR_BASE_CARDS, getCorFonteDinamica } = useDingli();

  const ns = navStyle(idiomaEstudo);
  const frase = fraseExibicao || frasesFiltradas[indice];
  const corBgPrincipal = temas[idiomaEstudo]?.bg || '#4f46e5';

  const handleOuvirFrase = useCallback(() => {
    if (!falar || !frase) return;
    const textoParaFalar = (idiomaEstudo === 'pi' && frase?.zh) ? frase.zh : (frase[idiomaEstudo] || "");
    falar({ id: frase.id, texto: textoParaFalar }, false);
  }, [falar, frase, idiomaEstudo]);

  return (
    <div style={{ ...styles.viewport, backgroundColor: temas[idiomaEstudo].bg }}>
      <div style={styles.mobileContainer}>
        <button onClick={() => mudarTela(telaRetorno || 'estudo')} style={{ ...styles.btnNavTopo, backgroundColor: ns.bg, color: ns.txt }}>
          ← {t.back}
        </button>
        <div style={{
          ...styles.cardFixoRelativo,
          flex: 1,
          backgroundColor: ns.bg,
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          marginBottom: '15px',
          borderRadius: '30px',
          maxHeight: 'none',
          overflow: 'hidden'
        }}>
          {aiLoading ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ color: '#fff', fontWeight: '800', fontSize: '1.1rem', marginBottom: '15px', letterSpacing: '-0.5px' }}>{t.analyzing}</div>
              <div style={{ width: '28px', height: '28px', border: '2px solid rgba(255,255,255,0.2)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            aiExplanation && !aiExplanation.isError ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                border: '1px solid #747474',
                borderRadius: '22px',
                padding: '16px 24px',
                backgroundColor: COR_BASE_CARDS,
                boxSizing: 'border-box',
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch'
              }}>
               {/* Frase L2 + Hanzi (se mandarim) */}
                <div style={{ textAlign: 'center', marginBottom: '4px', marginTop: '32px' /* <-- Espaço superior para o ícone flutuar acima da 1ª letra */ }}>
                  {/* Frase L2 grifada com o ícone ancorado acima da 1ª letra */}
                  <h2 style={{ color: temas[idiomaEstudo].bg, fontWeight: '800', fontSize: '1.25rem', margin: 0, lineHeight: '1.35', width: '100%' }}>
                    {(frase?.[idiomaEstudo] || "").split(/\s+/).filter(Boolean).map((word, i) => {
                      const ehPrimeiraPalavra = i === 0;

                      return (
                        <span
                          key={i}
                          onClick={() => tocarAudioPalavra(word, idiomaEstudo)}
                          title={t?.touchToListenTooltip || "Toque para ouvir a pronúncia isolada"}
                          style={{
                            display: 'inline-block',
                            marginRight: '6px',
                            cursor: 'pointer',
                            userSelect: 'none',
                            position: ehPrimeiraPalavra ? 'relative' : 'static',
                            borderBottom: `2.5px solid ${(temas[idiomaEstudo]?.bg || '#4f46e5')}55`, /* <-- [Grifado] Espessura e opacidade da linha */
                            paddingBottom: '1px', /* <-- Distância entre a letra e a linha grifada */
                            transition: 'transform 0.1s ease, border-color 0.2s ease'
                          }}
                          onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.92)'; }}
                          onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                          {ehPrimeiraPalavra && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOuvirFrase();
                              }}
                              title={t?.normal || "Ouvir"}
                              style={{
                                position: 'absolute',
                                bottom: '100%',
                                left: '0px',
                                marginBottom: '2px',  /* <-- Distância entre o ícone e o topo da 1ª letra */
                                marginLeft: '-2px',   /* <-- Positivo empurra p/ direita, negativo p/ esquerda */
                                background: 'none',
                                border: 'none',
                                outline: 'none',
                                boxShadow: 'none',
                                WebkitTapHighlightColor: 'transparent',
                                padding: '2px',
                                cursor: 'pointer',
                                color: corBgPrincipal,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                lineHeight: 1,
                                flexShrink: 0
                              }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                e.currentTarget.style.transform = 'scale(0.9)';
                              }}
                              onMouseUp={(e) => {
                                e.stopPropagation();
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                            >
                              <svg width="22" height="22" viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M152,32V224L80,168H32a8,8,0,0,1-8-8V96a8,8,0,0,1,8-8H80Z" />
                                <path d="M192,106a32,32,0,0,1,0,44" />
                                <path d="M221.7,78a72,72,0,0,1,0,100" />
                              </svg>
                            </button>
                          )}
                          {word}
                        </span>
                      );
                    })}
                  </h2>

                  {idiomaEstudo === 'pi' && frase?.zh && (
                    <div style={{ color: '#64748b', fontSize: '1.15rem', marginTop: '4px', fontWeight: '600' }}>
                      {frase.zh}
                    </div>
                  )}
                </div>

                {/* Tradução L1 */}
                <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.3', margin: '4px 0 18px 0', textAlign: 'center', fontStyle: 'italic' }}>
                  {idiomaOrigem === 'pi' ? (frase?.zh || frasesFiltradas[indice]?.zh) : (frase?.[idiomaOrigem] || frase?.traducao || frasesFiltradas[indice]?.[idiomaOrigem])}
                </p>

                {/* Subtítulo: Entenda a frase */}
                <div style={{ fontSize: '0.85rem', fontWeight: '800', color: temas[idiomaEstudo].bg, marginBottom: '4px', textAlign: 'left' }}>
                  {t?.understandSentence || "Entenda a frase"}
                </div>

                {/* Explicação gramatical e didática estrutural */}
                <p style={{ color: '#334155', fontSize: '0.92rem', lineHeight: '1.45', margin: '0 0 12px 0', textAlign: 'justify', width: '100%' }}>
                  {aiExplanation.explanation}
                </p>

                {/* Breakdown termo a termo completo */}
                {aiExplanation.breakdown && aiExplanation.breakdown.length > 0 && (
                  <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                    {/* Subtítulo: Palavra por palavra */}
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: temas[idiomaEstudo].bg, marginBottom: '2px', textAlign: 'left' }}>
                      {t?.wordByWord || "Palavra por palavra"}
                    </div>
                    {aiExplanation.breakdown.map((item, i) => (
                      <div key={i} style={{ fontSize: '0.88rem', color: '#475569', textAlign: 'left', lineHeight: '1.27', padding: '0px 0' }}>
                        <b style={{ color: temas[idiomaEstudo].bg }}>{item.word}</b>: <span>{item.meaning}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Dica de Pronúncia */}
                {aiExplanation.pronuncia && (
                  <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '10px', marginTop: '10px', width: '100%' }}>
                    {/* Subtítulo: Dica de pronúncia */}
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: temas[idiomaEstudo].bg, marginBottom: '4px', textAlign: 'left' }}>
                      {t?.pronunciationTip || "Dica de pronúncia"}
                    </div>
                    <p style={{ color: '#334155', fontSize: '0.9rem', lineHeight: '1.45', margin: 0, textAlign: 'justify' }}>
                      {aiExplanation.pronuncia}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px' }}>
                <p style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '10px' }}>Falha no carregamento</p>
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>{aiExplanation?.message || "Erro desconhecido."}</p>
                <button onClick={() => explicarFraseIA(frase?.id)} style={{ padding: '12px 24px', backgroundColor: temas[idiomaEstudo].bg, color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold' }}>
                  Tentar novamente
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export function DominiumStats({ styles, sessaoDominium, frasesFiltradas, frasesMaestria }) {
  const { temas, t, navStyle, idiomaEstudo, idiomaOrigem, mudarTela, COR_BASE_CARDS } = useDingli();

  const ns = navStyle(idiomaEstudo);
  const listas = useDominiumData({ sessaoDominium, frasesFiltradas, frasesMaestria, idiomaEstudo, idiomaOrigem });
  return (
    <div style={{ ...styles.viewport, backgroundColor: temas[idiomaEstudo].bg }}>
      <div style={styles.mobileContainer}>
        <button onClick={() => mudarTela('menuCartoes')} style={{ ...styles.btnNavTopo, backgroundColor: ns.bg, color: ns.txt }}>← {t.back}</button>
        <div style={{ ...styles.cardFixoRelativo, flex: 1, backgroundColor: COR_BASE_CARDS, padding: '15px', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '900', color: temas[idiomaEstudo].bg, textAlign: 'center', marginBottom: '15px' }}>Relatório Dominium</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1, overflowY: 'auto' }}>
            {listas.map((lista, idx) => (
              lista.items.length > 0 && (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', marginBottom: '5px' }}>
                  <h3 style={{ fontSize: '0.65rem', fontWeight: 'bold', color: lista.cor, textTransform: 'uppercase', marginBottom: '5px', textAlign: 'center', borderBottom: `1px solid ${lista.cor}33`, paddingBottom: '3px' }}>
                    {lista.label} ({lista.items.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {lista.items.map((f, i) => (
                      <p key={i} style={{ fontSize: '0.75rem', lineHeight: '1.2', color: '#334155', padding: '4px 0', margin: 0, borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                        {f}
                      </p>
                    ))}
                  </div>
                </div>
              )
            ))}
            {listas.every(l => l.items.length === 0) && (
              <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', marginTop: '20px' }}>Nenhuma frase em ciclo de repetição no momento.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}