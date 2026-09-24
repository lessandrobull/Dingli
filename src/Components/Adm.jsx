import React, { useState, useEffect, useCallback } from 'react';
import { useDingli } from '../DingliContext';
import { supabase } from '../supabaseClient';
import { montarAudioUrl } from '../services/audioCacheService';
import {
  COR_TOM_CLARO,
  COR_INSTITUCIONAL_TITULO,
  COR_INSTITUCIONAL_ACAO,
  COR_SUPERFICIE_DIGITACAO
} from '../themeColors';

export function Adm({ styles }) {
  const { mudarTela, setUserRole } = useDingli();
  const [subTela, setSubTela] = useState('menu');
  const [reportes, setReportes] = useState([]);
  const [carregando, setCarregando] = useState(false);

  const carregarReportes = useCallback(async () => {
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from('reports_frases')
        .select('*')
        .eq('resolvido', false)
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

  const marcarResolvido = async (id) => {
    try {
      const { error } = await supabase
        .from('reports_frases')
        .update({ resolvido: true })
        .eq('id', id);

      if (!error) {
        setReportes(prev => prev.filter(item => item.id !== id));
      }
    } catch (err) {
      console.error('[Adm] Erro ao resolver reporte:', err);
    }
  };

  const ouvirAudio = (fraseId, voz, idioma) => {
    try {
      const url = montarAudioUrl(fraseId, voz || 'v1', idioma || 'en');
      const audio = new Audio(url);
      audio.play();
    } catch (err) {
      console.error('[Adm] Erro ao reproduzir áudio:', err);
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px', marginBottom: '20px' }}>
              <button
                onClick={() => setSubTela('menu')}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                ← Voltar
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

              {!carregando && reportes.map((item) => (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: COR_SUPERFICIE_DIGITACAO,
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                    <span style={{ fontWeight: '800', color: COR_INSTITUCIONAL_TITULO, fontSize: '0.95rem' }}>
                      Frase #{item.frase_id} · {item.idioma_estudo?.toUpperCase()} ({item.voz || 'v1'})
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.9rem', color: '#334155' }}>
                    <strong>Problema:</strong> {item.tipo_problema}
                  </div>

                  {item.observacao && (
                    <div style={{ fontSize: '0.85rem', color: '#475569', backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <strong>Observação:</strong> {item.observacao}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button
                      onClick={() => ouvirAudio(item.frase_id, item.voz, item.idioma_estudo)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#334155',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Ouvir Áudio
                    </button>
                    <button
                      onClick={() => marcarResolvido(item.id)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: COR_INSTITUCIONAL_ACAO,
                        color: '#ffffff',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Marcar como Resolvido
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Adm;
