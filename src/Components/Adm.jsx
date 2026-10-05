import React, { useState, useEffect, useCallback } from 'react';
import { useDingli } from '../DingliContext';
import { supabase } from '../supabaseClient';
import {
  COR_TOM_CLARO,
  COR_INSTITUCIONAL_TITULO,
  COR_INSTITUCIONAL_ACAO,
  COR_SUPERFICIE_DIGITACAO
} from '../themeColors';

const extrairRankDinglab = (item) => {
  const texto = `${item?.observacao || ''} ${item?.tipo_problema || ''}`;
  const match = texto.match(/Rank\s*(\d+)/i) || texto.match(/R(\d+)/i);
  return match ? `R${match[1]}` : '';
};

export function Adm({ styles, setFraseAtivaGlobal, setTopicoAtivo }) {
  const { mudarTela, setUserRole, setIdiomaEstudo, setIdiomaOrigem, setNivelAtivo } = useDingli();
  const [subTela, setSubTela] = useState(() => sessionStorage.getItem('adm_subtela') || 'menu');

  useEffect(() => {
    sessionStorage.setItem('adm_subtela', subTela);
  }, [subTela]);
  const [reportes, setReportes] = useState([]);
  const [carregando, setCarregando] = useState(false);

  const carregarReportes = useCallback(async () => {
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from('reports_frases')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setReportes(data);
      }
    } catch (err) {
      console.error('[Adm] Erro ao carregar reportes:', err);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (subTela === 'reportes') {
      carregarReportes();
    }
  }, [subTela, carregarReportes]);

  const alternarResolvido = async (id, statusAtual, e) => {
    if (e) e.stopPropagation();
    const novoStatus = !statusAtual;
    try {
      setReportes(prev => prev.map(item => item.id === id ? { ...item, resolvido: novoStatus } : item));
      const { error } = await supabase
        .from('reports_frases')
        .update({ resolvido: novoStatus })
        .eq('id', id);

      if (error) {
        console.error('[Adm] Erro ao atualizar status:', error);
        setReportes(prev => prev.map(item => item.id === id ? { ...item, resolvido: statusAtual } : item));
      }
    } catch (err) {
      console.error('[Adm] Erro ao alternar resolvido:', err);
      setReportes(prev => prev.map(item => item.id === id ? { ...item, resolvido: statusAtual } : item));
    }
  };

  const deletarReporte = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      setReportes(prev => prev.filter(item => item.id !== id));
      const { error } = await supabase
        .from('reports_frases')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[Adm] Erro ao deletar reporte:', error);
        carregarReportes();
      }
    } catch (err) {
      console.error('[Adm] Erro ao deletar reporte:', err);
      carregarReportes();
    }
  };

  const inspecionarNoCard = async (reporte) => {
    try {
      const { data: fraseCompleta, error } = await supabase
        .from('sentences')
        .select('*')
        .eq('id', reporte.frase_id)
        .single();

      if (error || !fraseCompleta) {
        alert("Frase não localizada no banco de dados.");
        return;
      }

      const idiomaEstudoAlvo = reporte.idioma_estudo || 'en';
      const idiomaOrigemAlvo = reporte.idioma_origem || 'pt';
      const colTopic = `topic_${idiomaOrigemAlvo}`;
      const topico = fraseCompleta[colTopic] || fraseCompleta.topic_en || fraseCompleta.topic_pt || "";

      // 1. Configurar contexto oficial para o modo Administrador
      setIdiomaEstudo(idiomaEstudoAlvo);
      setIdiomaOrigem(idiomaOrigemAlvo);
      setUserRole('adm');
      if (fraseCompleta.level) setNivelAtivo(fraseCompleta.level);
      if (setTopicoAtivo) setTopicoAtivo(topico);

      // 2. Preencher a frase ativa global com os dados originais
      if (setFraseAtivaGlobal) {
        setFraseAtivaGlobal({
          ...fraseCompleta,
          id: fraseCompleta.id,
          texto: fraseCompleta[idiomaEstudoAlvo] || "",
          traducao: fraseCompleta[idiomaOrigemAlvo] || "",
          texto_zh: fraseCompleta.zh || "",
          nivel: fraseCompleta.level || "",
          topico: topico
        });
      }

      // 3. Abrir a tela de estudo de produção
      mudarTela('estudo');
    } catch (err) {
      console.error("[Adm] Falha ao preparar inspeção da frase:", err);
    }
  };

  return (
    <div style={{ ...styles.viewport, backgroundColor: COR_TOM_CLARO }}>
      <div style={styles.mobileContainer}>
        {subTela === 'menu' ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: '30px', marginTop: '20px' }}>
              <h2 style={{ color: COR_INSTITUCIONAL_TITULO, fontSize: '2rem', fontWeight: '900', margin: 0 }}>
                Adm
              </h2>
            </div>
            <div className="scroll-container" style={{ ...styles.areaScrollMenu, justifyContent: 'flex-start', gap: '12px' }}>
              <button
                onClick={() => {
                  setUserRole('aluno');
                  mudarTela('perfil');
                }}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: COR_SUPERFICIE_DIGITACAO,
                  color: COR_INSTITUCIONAL_ACAO,
                  fontWeight: '900',
                  fontSize: '1.1rem',
                  cursor: 'pointer'
                }}
              >
                Profile
              </button>

              <button
                onClick={() => mudarTela('escolherOrigem')}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: COR_SUPERFICIE_DIGITACAO,
                  color: COR_INSTITUCIONAL_ACAO,
                  fontWeight: '900',
                  fontSize: '1.1rem',
                  cursor: 'pointer'
                }}
              >
                Dìngloop
              </button>

              <button
                onClick={() => setSubTela('reportes')}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: COR_SUPERFICIE_DIGITACAO,
                  color: COR_INSTITUCIONAL_ACAO,
                  fontWeight: '900',
                  fontSize: '1.1rem',
                  cursor: 'pointer'
                }}
              >
                Reportes de Frases
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Topo Centralizado com botão ← Adm */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              marginTop: '16px',
              marginBottom: '20px'
            }}>
              <button
                onClick={() => setSubTela('menu')}
                style={{
                  position: 'absolute',
                  left: 0,
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                ← Adm
              </button>
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '800', color: COR_INSTITUCIONAL_TITULO }}>
                Reportes de Frases
              </h3>
            </div>

            <div className="scroll-container" style={{ ...styles.areaScrollMenu, justifyContent: 'flex-start', gap: '12px', paddingBottom: '30px' }}>
              {carregando && (
                <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.95rem' }}>
                  Carregando reportes...
                </p>
              )}

              {!carregando && reportes.length === 0 && (
                <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.95rem', marginTop: '30px' }}>
                  Nenhum reporte pendente.
                </p>
              )}

              {!carregando && reportes.map((item) => {
                const ehDinglab = Boolean(
                  item.tipo_problema?.toLowerCase().includes('dìnglab') ||
                  item.tipo_problema?.toLowerCase().includes('dinglab') ||
                  item.observacao?.toLowerCase().includes('dìnglab') ||
                  item.observacao?.toLowerCase().includes('dinglab')
                );
                const rankDinglab = ehDinglab ? extrairRankDinglab(item) : '';
                const resolvidoNoPronto = Boolean(
                  item.tipo_problema?.toLowerCase().includes('superada') ||
                  item.observacao?.toLowerCase().includes('retornou')
                );
                const sufixoDinglab = ehDinglab ? ' Dìnglab' : '';

                // Se for reporte comum já resolvido pelo Adm, exibe no formato recolhido
                if (item.resolvido) {
                  return (
                    <div
                      key={item.id}
                      style={{
                        backgroundColor: COR_SUPERFICIE_DIGITACAO,
                        borderRadius: '10px',
                        padding: '10px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        border: '1px solid #e2e8f0',
                        opacity: 0.8
                      }}
                    >
                      <span style={{ fontWeight: '700', color: '#64748b', fontSize: '0.88rem' }}>
                        Frase #{item.frase_id} · {item.idioma_estudo?.toUpperCase()} ({item.voz || 'v1'})
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                        <button
                          onClick={(e) => deletarReporte(item.id, e)}
                          title="Excluir reporte"
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '5px',
                            border: '1.5px solid #ef4444',
                            backgroundColor: '#fee2e2',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                        <button
                          onClick={(e) => alternarResolvido(item.id, item.resolvido, e)}
                          title="Desmarcar (tornar pendente)"
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '5px',
                            border: '1.5px solid #10b981',
                            backgroundColor: '#10b981',
                            color: '#ffffff',
                            fontSize: '0.85rem',
                            fontWeight: '900',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          ✓
                        </button>
                      </div>
                    </div>
                  );
                }

                // Cards abertos: reportes do Dìnglab (sempre abertos) ou reportes comuns pendentes
                return (
                  <div
                    key={item.id}
                    style={{
                      backgroundColor: COR_SUPERFICIE_DIGITACAO,
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                      <span style={{ fontWeight: '800', color: COR_INSTITUCIONAL_TITULO, fontSize: '0.95rem' }}>
                        Frase #{item.frase_id} · {item.idioma_estudo?.toUpperCase()} ({item.voz || 'v1'}){sufixoDinglab}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                        <button
                          onClick={(e) => deletarReporte(item.id, e)}
                          title="Excluir reporte"
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '5px',
                            border: '1.5px solid #ef4444',
                            backgroundColor: '#fee2e2',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                        <button
                          onClick={(e) => alternarResolvido(item.id, item.resolvido, e)}
                          title={item.resolvido ? "Desmarcar (tornar pendente)" : "Marcar como resolvido"}
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '5px',
                            border: item.resolvido ? '1.5px solid #10b981' : '2px solid #94a3b8',
                            backgroundColor: item.resolvido ? '#10b981' : '#ffffff',
                            color: '#ffffff',
                            fontSize: '0.85rem',
                            fontWeight: '900',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          {item.resolvido ? '✓' : ''}
                        </button>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.9rem', color: '#334155' }}>
                      <strong>Problema:</strong>{' '}
                      {ehDinglab ? (
                        <span>
                          {rankDinglab || 'Dìnglab'}
                          {resolvidoNoPronto && (
                            <span style={{ color: '#10b981', fontWeight: '800', marginLeft: '6px' }}>
                              - Aluno passou!
                            </span>
                          )}
                        </span>
                      ) : (
                        item.tipo_problema
                      )}
                    </div>

                    <button
                      onClick={() => inspecionarNoCard(item)}
                      style={{
                        marginTop: '4px',
                        padding: '12px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: COR_INSTITUCIONAL_ACAO,
                        color: '#ffffff',
                        fontSize: '0.9rem',
                        fontWeight: '800',
                        cursor: 'pointer'
                      }}
                    >
                      Inspecionar no Card
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Adm;
