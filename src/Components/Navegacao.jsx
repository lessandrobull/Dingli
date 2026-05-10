import React from 'react';

// Caminho corrigido para referenciar o ficheiro de constantes na raiz do projeto
import { NOMES_RANKS, ESTRUTURA_NIVEIS } from '../constant';
import { useDingli } from '../DingliContext';

export function EscolherNivel({
  styles, selecionarNivel, sessaoDominium, frasesMaestria
}) {

  const { temas, t, getCorFonteDinamica, navStyle, idiomaEstudo, idiomaOrigem, mudarTela } = useDingli();

  const ns = navStyle(idiomaEstudo);
  return (
    <div style={{ ...styles.viewport, backgroundColor: temas[idiomaEstudo].bg }}>
      <div style={styles.mobileContainer}>
        <button onClick={() => mudarTela('menuCartoes')} style={{ ...styles.btnNavTopo, backgroundColor: ns.bg, color: ns.txt }}>← {t.back}</button>
        <div className="scroll-container" style={styles.areaScrollMenu}>
          {(ESTRUTURA_NIVEIS[idiomaEstudo] || ESTRUTURA_NIVEIS.default).map(n => {
            const desativado = false;
            return (
              <button
                key={n}
                onClick={() => !desativado && selecionarNivel(n)}
                disabled={desativado}
                style={{
                  ...styles.btnPadrao,
                  backgroundColor: '#fff',
                  color: getCorFonteDinamica(idiomaEstudo),
                  opacity: desativado ? 0.4 : 1,
                  cursor: desativado ? 'not-allowed' : 'pointer'
                }}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function EscolherTopic({ styles, listaTopicos, selecionarTopico }) {

  const { temas, t, getCorFonteDinamica, navStyle, idiomaEstudo, mudarTela } = useDingli();

  const ns = navStyle(idiomaEstudo);
  return (
    <div style={{ ...styles.viewport, backgroundColor: temas[idiomaEstudo].bg }}>
      <div style={styles.mobileContainer}>
        <button onClick={() => mudarTela('escolherNivel')} style={{ ...styles.btnNavTopo, backgroundColor: ns.bg, color: ns.txt }}>← {t.back}</button>
        <div className="scroll-container" style={styles.areaScrollMenu}>
          {listaTopicos.map(tp => (
            <button key={tp} onClick={() => selecionarTopico(tp)} style={{ ...styles.btnPadrao, backgroundColor: '#fff', color: getCorFonteDinamica(idiomaEstudo) }}>{tp}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SelecaoExercicio({ styles, iniciarExercicio }) {

  const { temas, t, navStyle, idiomaEstudo, mudarTela } = useDingli();

  const ns = navStyle(idiomaEstudo);
  return (
    <div style={{ ...styles.viewport, backgroundColor: temas[idiomaEstudo].bg }}>
      <div style={styles.mobileContainer}>
        <button onClick={() => window.history.back()} style={{ ...styles.btnNavTopo, backgroundColor: ns.bg, color: ns.txt }}>← {t.back}</button>
        <div className="scroll-container" style={styles.areaScrollMenu}>
          {NOMES_RANKS.map((nome, i) => {
            const n = i + 1;
            return (
              <button key={n} onClick={() => iniciarExercicio(n)} style={{ ...styles.btnPadrao, backgroundColor: '#fff', color: temas[idiomaEstudo].bg, minHeight: '55px', fontSize: '1rem', padding: '10px' }}>Rank {n} ({nome})</button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
export function Adm({ styles }) {

  const { temas, t, navStyle, idiomaEstudo, mudarTela } = useDingli();

  const ns = navStyle(idiomaEstudo || 'en');

  return (

    <div style={{ ...styles.viewport, backgroundColor: '#000' }}>

      <div style={styles.mobileContainer}>

        <div style={{ textAlign: 'center', marginBottom: '30px', marginTop: '20px' }}>

          <h2 style={{ color: '#fff', fontSize: '2rem', fontWeight: '900', margin: 0 }}>Adm</h2>

        </div>

        <div className="scroll-container" style={{ ...styles.areaScrollMenu, justifyContent: 'flex-start', gap: '12px' }}>

          <button

            onClick={() => mudarTela('escolherOrigem')}

            style={{ padding: '16px', borderRadius: '12px', border: 'none', backgroundColor: '#1e293b', color: '#fff', fontWeight: '900', fontSize: '1.1rem', cursor: 'pointer' }}

          >

            Phrase Cards

          </button>

          <button

            onClick={() => mudarTela('perfil')}

            style={{ padding: '16px', borderRadius: '12px', border: 'none', backgroundColor: '#1e293b', color: '#fff', fontWeight: '900', fontSize: '1.1rem', cursor: 'pointer' }}

          >

            Profile

          </button>

        </div>

      </div>

    </div>

  );

}