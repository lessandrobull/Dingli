import { precarregarPalavras } from '../services/audioCacheService';
import React, { useState, useEffect } from 'react';
import { useDingli } from '../DingliContext';

export default function MenuCartoes({
  styles,
  acionarFilaJogo,
  selecionarNivel
}) {
  const { temas, t, getCorFonteDinamica, idiomaOrigem, idiomaEstudo, mudarTela, COR_BASE_CARDS, nivelAtivo, navStyle } = useDingli();
  if (!styles || !temas || !idiomaEstudo) return null;

  const [qtdDinglab, setQtdDinglab] = useState(0);

  useEffect(() => {
    if (!idiomaOrigem || !idiomaEstudo) return;
    try {
      const chaveDinglab = `dinglab_${idiomaOrigem}_${idiomaEstudo}`;
      const salvo = localStorage.getItem(chaveDinglab);
      if (salvo) {
        const lista = JSON.parse(salvo);
        setQtdDinglab(Array.isArray(lista) ? lista.length : 0);
      } else {
        setQtdDinglab(0);
      }
    } catch (e) {
      setQtdDinglab(0);
    }
  }, [idiomaOrigem, idiomaEstudo]);

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
          <button
            onClick={() => {
              try {
                const chaveDinglab = `dinglab_${idiomaOrigem}_${idiomaEstudo}`;
                const salvo = localStorage.getItem(chaveDinglab);
                if (salvo) {
                  const lista = JSON.parse(salvo);
                  if (Array.isArray(lista) && lista.length > 0) {
                    const todasPalavras = [];
                    lista.forEach(item => {
                      const txt = item[idiomaEstudo] || item.texto || item.en || "";
                      txt.split(/\s+/).forEach(w => {
                        const limpa = w.replace(/[.,!?;:¿¡"“”`{}()[\]\-—…，。！？；：、«»/\\~*]/g, "").trim();
                        if (limpa) todasPalavras.push(limpa);
                      });
                    });
                    if (todasPalavras.length > 0) {
                      precarregarPalavras(todasPalavras, idiomaEstudo);
                    }
                  }
                }
              } catch (e) {}
              mudarTela('dinglab');
            }}
            style={{
              ...styles.btnPadrao,
              backgroundColor: COR_BASE_CARDS,
              color: corFonteBotoes,
              position: 'relative'
            }}
          >
            <span>{t?.dinglab || 'Dìnglab'}</span>
            {qtdDinglab > 0 && (
              <span
                style={{
                  position: 'absolute',
                  right: '18px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  borderRadius: '9999px',
                  padding: '2px 10px',
                  fontSize: '0.9rem',
                  fontWeight: '900',
                  lineHeight: '1.2'
                }}
              >
                {qtdDinglab}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
