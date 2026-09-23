import React from 'react';
import { useDingli } from '../DingliContext';

export default function MenuCartoes({
  styles,
  acionarFilaJogo,
  selecionarNivel
}) {
  const { temas, t, getCorFonteDinamica, idiomaEstudo, mudarTela, COR_BASE_CARDS, nivelAtivo, navStyle } = useDingli();
  if (!styles || !temas || !idiomaEstudo) return null;

  const ns = navStyle(idiomaEstudo);
  const corFonteBotoes = getCorFonteDinamica(idiomaEstudo);

  return (
    <div style={{ ...styles.viewport, backgroundColor: temas[idiomaEstudo].bg }}>
      <div style={styles.mobileContainer}>
        <button
          onClick={() => mudarTela('menuCurso')}
          style={{ ...styles.btnNavTopo, backgroundColor: ns.bg, color: ns.txt }}
        >
          ← {t.quit || 'Sair'}
        </button>

        <div style={{ textAlign: 'center', marginBottom: '20px', marginTop: '10px' }}>
          <h2 style={{ color: COR_BASE_CARDS, fontSize: '1.5rem', fontWeight: '900', textTransform: 'capitalize' }}>
            {t.phraseCards}
          </h2>
        </div>

        <div className="scroll-container" style={styles.areaScrollMenu}>
          <button
            onClick={() => {
              if (selecionarNivel) {
                selecionarNivel(nivelAtivo || 'A1');
              } else {
                mudarTela('escolherTopic');
              }
            }}
            style={{ ...styles.btnPadrao, backgroundColor: COR_BASE_CARDS, color: corFonteBotoes }}
          >
            Deck
          </button>
          <button
            onClick={acionarFilaJogo}
            style={{ ...styles.btnPadrao, backgroundColor: COR_BASE_CARDS, color: corFonteBotoes }}
          >
            Game
          </button>
          <button
            onClick={() => mudarTela('dominiumStats')}
            style={{ ...styles.btnPadrao, backgroundColor: COR_BASE_CARDS, color: corFonteBotoes }}
          >
            Dominium
          </button>
        </div>
      </div>
    </div>
  );
}
