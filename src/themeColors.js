// =======================================================
// CENTRAL DE CORES DO DÌNGLÌ (ÚNICA FONTE DA VERDADE)
// =======================================================

export const COR_BASE_CARDS = "#e4eafa";
export const COR_ACERTO = "#2e7d32";
export const COR_ERRO = "#c62828";
export const COR_BG_SECUNDARIOS = "#d8deef";

export const CORES_POR_IDIOMA = {
  pt: { bgPrincipal: "#2a925c", acaoEscura: "#002776" },
  en: { bgPrincipal: "#4d6395", acaoEscura: "#d1596c" },
  es: { bgPrincipal: "#f3c229", acaoEscura: "#c2410c" },
  fr: { bgPrincipal: "#6fa4c0", acaoEscura: "#0055a4" },
  it: { bgPrincipal: "#4cb975", acaoEscura: "#009246" },
  ge: { bgPrincipal: "#212020", acaoEscura: "#18181b" },
  pi: { bgPrincipal: "#d94960", acaoEscura: "#991b1b" }
};

export function getTemaVisual(lang) {
  const c = CORES_POR_IDIOMA[lang] || CORES_POR_IDIOMA.en;
  return {
    bgPagina: c.bgPrincipal,
    btnMenuIdiomaFundo: c.bgPrincipal,
    btnMenuIdiomaTexto: COR_BASE_CARDS,
    btnAcaoFundo: c.acaoEscura,
    btnAcaoTexto: COR_BASE_CARDS,
    btnMenuFundo: COR_BASE_CARDS,
    btnMenuTexto: c.acaoEscura,
    tituloMenu: COR_BASE_CARDS,
    cardFundo: COR_BASE_CARDS,
    btnSuporteTexto: c.acaoEscura,
    btnSuporteFundo: COR_BG_SECUNDARIOS,
    bordaIA: c.acaoEscura,
    corAcerto: COR_ACERTO,
    corErro: COR_ERRO
  };
}
