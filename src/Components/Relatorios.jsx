import React from 'react';
import { useDominiumData } from '../useDominiumData';
import { useDingli } from '../DingliContext';

export function ExplicacaoIA({
  styles,
  aiLoading, aiExplanation, frasesFiltradas, indice, explicarFraseIA
}) {
  const { temas, t, navStyle, idiomaEstudo, idiomaOrigem, mudarTela, COR_BASE_CARDS } = useDingli();

  const ns = navStyle(idiomaEstudo);
  const frase = frasesFiltradas[indice];

  return (
    <div style={{ ...styles.viewport, backgroundColor: temas[idiomaEstudo].bg }}>
      <div style={styles.mobileContainer}>
        <button onClick={() => mudarTela('estudo')} style={{ ...styles.btnNavTopo, backgroundColor: ns.bg, color: ns.txt }}>
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
                padding: '16px 14px',
                backgroundColor: COR_BASE_CARDS,
                boxSizing: 'border-box',
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch'
              }}>
                {/* Frase L2 + Hanzi (se mandarim) */}
                <div style={{ textAlign: 'center', marginBottom: '6px' }}>
                  <h2 style={{ color: temas[idiomaEstudo].bg, fontWeight: '800', fontSize: '1.25rem', margin: 0, lineHeight: '1.25' }}>
                    {frase?.[idiomaEstudo]}
                  </h2>
                  {idiomaEstudo === 'pi' && frase?.zh && (
                    <div style={{ color: '#64748b', fontSize: '1.15rem', marginTop: '4px', fontWeight: '600' }}>
                      {frase.zh}
                    </div>
                  )}
                </div>

                {/* Tradução L1 */}
                <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.3', margin: '4px 0 12px 0', textAlign: 'center', fontStyle: 'italic' }}>
                  {idiomaOrigem === 'pi' ? frasesFiltradas[indice]?.zh : frasesFiltradas[indice]?.[idiomaOrigem]}
                </p>

                {/* Explicação gramatical e didática estrutural */}
                <p style={{ color: '#334155', fontSize: '0.92rem', lineHeight: '1.45', margin: '0 0 12px 0', textAlign: 'justify', width: '100%' }}>
                  {aiExplanation.explanation}
                </p>

                {/* Breakdown termo a termo completo */}
                {aiExplanation.breakdown && aiExplanation.breakdown.length > 0 && (
                  <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                    {aiExplanation.breakdown.map((item, i) => (
                      <div key={i} style={{ fontSize: '0.88rem', color: '#475569', textAlign: 'left', lineHeight: '1.35', padding: '2px 0' }}>
                        <b style={{ color: temas[idiomaEstudo].bg }}>{item.word}</b>: <span>{item.meaning}</span>
                      </div>
                    ))}
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
  const { temas, t, navStyle, idiomaEstudo, mudarTela, COR_BASE_CARDS } = useDingli();

  const ns = navStyle(idiomaEstudo);
  const listas = useDominiumData({ sessaoDominium, frasesFiltradas, frasesMaestria, idiomaEstudo });
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