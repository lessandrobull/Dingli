import React from 'react';
import { useDingli } from '../DingliContext';

export function EscolherOrigem({ styles }) {
  const { temas, t, userRole, mudarTela, setIdiomaOrigem, COR_BASE_CARDS } = useDingli();

  if (!styles || !temas) return null;
  return (
    <div style={{ ...styles.viewport, backgroundColor: '#e4eafa' }}>
      <div style={styles.mobileContainer}>
        <button onClick={() => (userRole === 'adm' ? mudarTela('adm') : mudarTela('perfil'))} style={{ ...styles.btnNavTopo, backgroundColor: COR_BASE_CARDS, color: '#1e293b', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>← {t.back}</button>
        <div className="scroll-container" style={styles.areaScrollMenu}>
          {Object.keys(temas).map(sigla => (
            <button key={sigla} onClick={() => { setIdiomaOrigem(sigla); mudarTela('escolherIdioma'); }} style={{ ...styles.btnPadrao, backgroundColor: temas[sigla].bg, color: temas[sigla].btn }}>
              {temas[sigla].label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function EscolherEstudo({ styles, setFilaErros, setFilaAcertos }) {
  const { temas, t, userRole, mudarTela, idiomaOrigem, setIdiomaEstudo, COR_BASE_CARDS } = useDingli();

  if (!styles || !temas) return null;
  return (
    <div style={{ ...styles.viewport, backgroundColor: '#e4eafa' }}>
      <div style={styles.mobileContainer}>
        <button onClick={() => (userRole === 'adm' ? mudarTela('escolherOrigem') : mudarTela('perfil'))} style={{ ...styles.btnNavTopo, backgroundColor: COR_BASE_CARDS, color: '#1e293b', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>← {t.back}</button>
        <div className="scroll-container" style={styles.areaScrollMenu}>
          {Object.keys(temas).filter(s => s !== idiomaOrigem).map(sigla => (
            <button key={sigla} onClick={() => { setIdiomaEstudo(sigla); setFilaErros([]); setFilaAcertos([]); mudarTela('menuCurso'); }} style={{ ...styles.btnPadrao, backgroundColor: temas[sigla].bg, color: temas[sigla].btn }}>
              {t.wantStudy} {temas[idiomaOrigem]?.nomes?.[sigla]?.toLowerCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
