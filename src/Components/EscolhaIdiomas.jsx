import React from 'react';

import { useDingli } from '../DingliContext';

export function EscolherOrigem({ styles }) {

  const { temas, t, mudarTela, setIdiomaOrigem } = useDingli();

  if (!styles || !temas) return null;
  return (
    <div style={{ ...styles.viewport, backgroundColor: '#121212' }}>
      <div style={styles.mobileContainer}>
        <button onClick={() => mudarTela('perfil')} style={{ ...styles.btnNavTopo, backgroundColor: '#333', color: '#fff' }}>← {t.back}</button>
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

  const { temas, t, userRole, mudarTela, idiomaOrigem, setIdiomaEstudo } = useDingli();

  if (!styles || !temas) return null;
  return (
    <div style={{ ...styles.viewport, backgroundColor: '#121212' }}>
      <div style={styles.mobileContainer}>
        <button onClick={() => (userRole === 'adm' ? mudarTela('escolherOrigem') : mudarTela('perfil'))} style={{ ...styles.btnNavTopo, backgroundColor: '#333', color: '#fff' }}>← {t.back}</button>
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