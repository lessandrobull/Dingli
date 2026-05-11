export const tokens = {
  colors: { bgBase: '#000', bgCardDark: '#111', bgCardLight: '#fff', textMain: '#1e293b', textSec: '#64748b', textLight: '#fff', textMuted: '#94a3b8' },
  spacing: { xs: '4px', sm: '8px', md: '10px', lg: '12px', xl: '15px', xxl: '20px' },
  radii: { sm: '8px', md: '12px', lg: '15px', pill: '30px' }
};

export const styles = {

  viewport: { display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100vw', height: '100dvh', overflow: 'hidden', backgroundColor: tokens.colors.bgBase, fontFamily: 'sans-serif' },

  mobileContainer: { width: '100%', maxWidth: '420px', height: '100%', display: 'flex', flexDirection: 'column', padding: `${tokens.spacing.md} ${tokens.spacing.lg}`, boxSizing: 'border-box', minHeight: 0 },

  topoPerfil: { textAlign: 'center', marginBottom: '5px' },

  tituloApp: { color: tokens.colors.textLight, fontSize: '1.8rem', fontWeight: '900', margin: '0' },

  nomeAluno: { color: tokens.colors.textMuted, fontSize: '1.1rem', margin: '0 0 10px 0' },

  quadroFrase: { backgroundColor: tokens.colors.bgCardDark, padding: tokens.spacing.sm, borderRadius: tokens.radii.lg, textAlign: 'center', margin: '0 0 10px 0', minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' },

  textoFrase: { color: tokens.colors.textLight, fontSize: '0.9rem', fontStyle: 'italic' },

  secaoCursos: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', paddingTop: '0px', overflow: 'hidden' },

  labelCentral: { color: tokens.colors.textSec, fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '10px', textAlign: 'center' },

  gridCursos: { display: 'flex', flexDirection: 'column', gap: '8px' },

  btnCursoMinimal: { padding: '16px', borderRadius: tokens.radii.md, border: 'none', fontWeight: '900', fontSize: '1.1rem' },

  btnAdicionarMinimal: { padding: '16px', borderRadius: tokens.radii.md, border: 'none', backgroundColor: tokens.colors.textMain, color: tokens.colors.textSec, fontWeight: 'bold' },

  btnLabHome: { backgroundColor: tokens.colors.bgCardDark, color: tokens.colors.textLight, padding: '15px', borderRadius: tokens.radii.md, border: 'none', margin: '0', display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' },
  labDestaque: { fontWeight: '900' },
  headerEstudoMinimo: { textAlign: 'center', marginBottom: '8px' },
  contadorCompacto: { color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontWeight: 'bold' },
  btnNavTopo: { width: '100%', padding: '12px', borderRadius: '12px', fontWeight: 'bold', marginBottom: '5px', border: 'none', flexShrink: 0, minHeight: '48px' },
  cardFixoRelativo: { backgroundColor: tokens.colors.bgCardLight, borderRadius: '30px', padding: '20px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', margin: '0 auto 10px auto', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', width: '100%', flex: 1, overflowY: 'auto', border: '4px solid transparent', transition: 'border-color 0.2s', minHeight: 0 },
  topCardAreaFixed: { textAlign: 'center', width: '100%', flexShrink: 0 },
  bottomCardAreaFixed: { width: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column', marginTop: 'auto' },
  areaFraseCentralFlex: { width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 0 },
  labelTopico: { fontSize: '0.8rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' },
  labelInstrucao: { fontSize: '0.9rem', color: tokens.colors.textMuted, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0px', display: 'block' },
  textoFrasePrincipal: { color: tokens.colors.textMain, fontWeight: '900', margin: 0, lineHeight: '1', fontSize: 'clamp(1.2rem, 7vw, 1.53rem)', textAlign: 'center' },
  gameContainerEx3: { display: 'flex', flexDirection: 'column', width: '100%', height: '100%', gap: '4px' },
  gavetaSelecionadasFlex: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px', alignContent: 'center', flex: 1, overflowY: 'auto', padding: '10px' },
  gavetaOpcoesFlex: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px', alignContent: 'center', flex: 1, overflowY: 'auto', padding: '10px' },
  btnPalavraEx3: { padding: '0px 4px', borderRadius: '8px', fontWeight: 'bold', minHeight: '23px', minWidth: '0px', transition: 'all 0.2s', cursor: 'pointer', fontSize: '1.25rem', lineHeight: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  blocoSuporteIA: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' },
  btnToggleTrad: { width: '100%', textAlign: 'center', background: 'none', border: 'none', outline: 'none', boxShadow: 'none', color: tokens.colors.textMuted, textDecoration: 'underline', fontSize: '0.9rem' },
  textoTraducaoInterno: { color: tokens.colors.textSec, fontWeight: '600', fontSize: '0.9rem', width: '100%', textAlign: 'center', padding: '0 15px', boxSizing: 'border-box', overflowWrap: 'break-word' },
  rowAudio: { display: 'flex', gap: '8px', marginBottom: '8px', width: '100%' },
  rowBotoesIA: { display: 'flex', gap: '8px', width: '100%' },
  btnAcaoExtra: { flex: 1, padding: '12px 4px', borderRadius: '12px', border: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '0px', fontSize: '0.95rem', cursor: 'pointer' },
  btnAudioRound: { flex: 1, padding: '12px 4px', borderRadius: '12px', border: 'none', fontWeight: 'bold', backgroundColor: '#f1f5f9', minHeight: '0px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  controlesNavInferior: { display: 'flex', gap: '15px', marginTop: '5px' },
  btnNavFinal: { flex: 1, padding: '12px', borderRadius: '12px', border: 'none', fontWeight: 'bold', minHeight: '48px' },
  areaScrollMenu: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '10px', paddingBottom: '30px' },
  btnPadrao: { width: '100%', minHeight: '70px', borderRadius: '18px', fontWeight: '900', fontSize: '1.25rem', border: 'none', flexShrink: 0, cursor: 'pointer' },
  containerLacuna: { color: tokens.colors.textMain, fontWeight: '900', lineHeight: '1.2', textAlign: 'center', width: '100%', fontSize: 'clamp(1.25rem, 7vw, 1.5rem)', wordBreak: 'break-word' },
  wrapperInputRelativo: { position: 'relative', display: 'inline-grid', verticalAlign: 'baseline', margin: '0 4px', textAlign: 'center' },
  placeholderInvisivel: { gridArea: '1/1', color: 'transparent', whiteSpace: 'pre-wrap', padding: '0 10px', borderBottom: '3px solid transparent', pointerEvents: 'none', font: 'inherit', fontWeight: '900' },
  inputSobreposto: { gridArea: '1/1', backgroundColor: '#f1f5f9', border: 'none', outline: 'none', textAlign: 'center', borderRadius: '6px', borderBottom: '3px solid #cbd5e1', padding: '0 10px', boxSizing: 'border-box', font: 'inherit', fontWeight: '900', width: '100%', height: '100%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  divisorEx3: { height: '1px', backgroundColor: '#f1f5f9', margin: '0 15px' },
};