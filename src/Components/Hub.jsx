import React from 'react';
import { useDingli } from '../DingliContext';

function Hub({
  styles,
  resetarProgressoIdioma,
  removerCursoIdioma
}) {
  const { temas, t, getCorFonteDinamica, navStyle, idiomaEstudo, idiomaOrigem, nivelAtivo, mudarTela, COR_BASE_CARDS } = useDingli();
  if (!styles || !temas || !idiomaEstudo) return null;

  const ns = navStyle ? navStyle(idiomaEstudo) : { bg: '#2b2b2b', txt: '#ffffff' };
  const corFonteBotoes = getCorFonteDinamica ? getCorFonteDinamica(idiomaEstudo) : '#ffffff';

  const sufixoEmBreve = (t?.immersion && t.immersion.includes('('))
    ? t.immersion.slice(t.immersion.indexOf('('))
    : '(em breve)';

  return (
    <div style={{ ...styles.viewport, backgroundColor: temas[idiomaEstudo].bg }}>
      <div style={styles.mobileContainer}>
        <button
          onClick={() => mudarTela('perfil')}
          style={{ ...styles.btnNavTopo, backgroundColor: ns.bg, color: ns.txt }}
        >
          ← {t?.home || 'Início'}
        </button>

        <div style={{ textAlign: 'center', marginBottom: '20px', marginTop: '10px' }}>
          <h2 style={{ color: COR_BASE_CARDS, fontSize: '1.5rem', fontWeight: '900', textTransform: 'capitalize' }}>
            {`${temas[idiomaOrigem]?.nomes?.[idiomaEstudo] || idiomaEstudo} ${nivelAtivo || ''}`.trim()}
          </h2>
        </div>

        <div className="scroll-container" style={styles.areaScrollMenu}>
          <button
            onClick={() => mudarTela('menuCartoes')}
            style={{ ...styles.btnPadrao, backgroundColor: COR_BASE_CARDS, color: corFonteBotoes }}
          >
            {t?.phraseCards || 'Dìnglang'}
          </button>

          <button
            disabled
            style={{
              ...styles.btnPadrao,
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.3)',
              border: '2px dashed rgba(255,255,255,0.2)',
              cursor: 'not-allowed'
            }}
          >
            {t?.immersion || 'Dìnglessons (em breve)'}
          </button>

          <button
            disabled
            style={{
              ...styles.btnPadrao,
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.3)',
              border: '2px dashed rgba(255,255,255,0.2)',
              cursor: 'not-allowed'
            }}
          >
            {`Dìnglevels ${sufixoEmBreve}`}
          </button>
        </div>

        <div style={{ marginTop: 'auto', padding: '20px 0', display: 'flex', gap: '10px', width: '100%' }}>
          <button
            onClick={() => {
              if (window.confirm(t?.confirmReset || 'Deseja resetar todo o seu progresso neste idioma? Esta ação não pode ser desfeita.')) {
                resetarProgressoIdioma();
              }
            }}
            style={{
              flex: 1, padding: '12px 4px', borderRadius: '12px', minHeight: '0px',
              backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer'
            }}
          >
            {t?.resetProgress || 'Resetar'}
          </button>
          <button
            onClick={() => {
              if (window.confirm(t?.confirmDelete || 'Tem certeza que deseja remover este idioma? Todo o seu progresso será permanentemente apagado.')) {
                removerCursoIdioma();
              }
            }}
            style={{
              flex: 1, padding: '12px 4px', borderRadius: '12px', minHeight: '0px',
              backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer'
            }}
          >
            {t?.deleteCourse || 'Deletar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Hub;
