import React from 'react';
import { useDingli } from '../DingliContext';
import { COR_TOM_CLARO, COR_SUPERFICIE_DIGITACAO, COR_INSTITUCIONAL_ACAO } from '../themeColors';

export function EscolherOrigem({ styles }) {
  const { temas, t, userRole, mudarTela, setIdiomaOrigem } = useDingli();

  if (!styles || !temas) return null;
  return (
    <div style={{ ...styles.viewport, backgroundColor: COR_TOM_CLARO }}>
      <div style={styles.mobileContainer}>
        <button
          onClick={() => (userRole === 'adm' ? mudarTela('adm') : mudarTela('perfil'))}
          style={{ ...styles.btnNavTopo, backgroundColor: COR_SUPERFICIE_DIGITACAO, color: COR_INSTITUCIONAL_ACAO, boxShadow: 'none' }}
        >
         ← {t.back}
        </button>
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
  const { temas, t, userRole, mudarTela, idiomaOrigem, setIdiomaEstudo, setOrigemNivel } = useDingli();

  if (!styles || !temas) return null;
  return (
    <div style={{ ...styles.viewport, backgroundColor: COR_TOM_CLARO }}>
      <div style={styles.mobileContainer}>
        <button
          onClick={() => (userRole === 'adm' ? mudarTela('escolherOrigem') : mudarTela('perfil'))}
          style={{ ...styles.btnNavTopo, backgroundColor: COR_SUPERFICIE_DIGITACAO, color: COR_INSTITUCIONAL_ACAO, boxShadow: 'none' }}
        >
         ← {t.back}
        </button>
        <div className="scroll-container" style={styles.areaScrollMenu}>
          {Object.keys(temas).filter(s => s !== idiomaOrigem).map(sigla => (
            <button key={sigla} onClick={() => {
              setIdiomaEstudo(sigla);
              setFilaErros([]);
              setFilaAcertos([]);
              if (setOrigemNivel) setOrigemNivel('cadastro');
              mudarTela('escolherNivel');
            }} style={{ ...styles.btnPadrao, backgroundColor: temas[sigla].bg, color: temas[sigla].btn }}>
              {t.wantStudy} {temas[idiomaOrigem]?.nomes?.[sigla]?.toLowerCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}