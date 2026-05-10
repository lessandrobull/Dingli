import React from 'react';

import { useDingli } from '../DingliContext';

export default function MenuCartoes({
  styles,
  acionarFilaJogo
}) {
  const { temas, t, getCorFonteDinamica, navStyle, idiomaEstudo, idiomaOrigem, mudarTela } = useDingli();
  if (!styles || !temas || !idiomaEstudo) return null;

  return (
    <div style={{ ...styles.viewport, backgroundColor: temas[idiomaEstudo].bg }}>
      <div style={styles.mobileContainer}>
        <div style={{ textAlign: 'center', marginBottom: '20px', marginTop: '10px' }}>

          <h2 style={{ color: ['ge', 'pi'].includes(idiomaEstudo) ? temas[idiomaEstudo].corTextoL1 : getCorFonteDinamica(idiomaEstudo), fontSize: '1.5rem', fontWeight: '900', textTransform: 'capitalize' }}>
            {t.phraseCards}
          </h2>

        </div>

        <div className="scroll-container" style={styles.areaScrollMenu}>
          <button onClick={() => mudarTela('menuCurso')} style={{ ...styles.btnPadrao, backgroundColor: '#fff', color: getCorFonteDinamica(idiomaEstudo) }}>

            Hub

          </button>
          <button onClick={() => mudarTela('escolherNivel')} style={{ ...styles.btnPadrao, backgroundColor: '#fff', color: getCorFonteDinamica(idiomaEstudo) }}>

            Deck

          </button>
          <button onClick={acionarFilaJogo} style={{ ...styles.btnPadrao, backgroundColor: '#fff', color: getCorFonteDinamica(idiomaEstudo) }}>
            Game
          </button>
          <button onClick={() => mudarTela('dominiumStats')} style={{ ...styles.btnPadrao, backgroundColor: '#fff', color: getCorFonteDinamica(idiomaEstudo) }}>
            Dominium
          </button>
        </div>
      </div>
    </div>
  );
}