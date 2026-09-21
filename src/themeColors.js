// =======================================================
// CENTRAL DE CORES DO DÌNGLÌ (ÚNICA FONTE DA VERDADE)
// =======================================================

// 1. TOM CLARO UNIVERSAL
export const COR_TOM_CLARO = "#e4eafa";
export const COR_BASE_CARDS = COR_TOM_CLARO; // Alias de compatibilidade para transição

// 2. INSTITUCIONAL (Perfil e Adm)
export const COR_INSTITUCIONAL_TITULO = "#2a537f";
export const COR_INSTITUCIONAL_ACAO = "#296bc2";

// 3. FEEDBACK E CORREÇÃO (SRS e Exercícios)
export const COR_ACERTO = "#2e7d32";
export const COR_ERRO = "#ef4444";

// 4. TIPOGRAFIA INTERNA E SUPERFÍCIES DO CARD
export const COR_TEXTO_PRINCIPAL = "#1e293b";
export const COR_TEXTO_SECUNDARIO = "#64748b";
export const COR_TEXTO_MUTED = "#94a3b8";
export const COR_SUPERFICIE_DIGITACAO = "#f1f5f9";

// 5. IDENTIDADES POR IDIOMA
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
    btnMenuIdiomaTexto: COR_TOM_CLARO,
    btnAcaoFundo: c.acaoEscura,
    btnAcaoTexto: COR_TOM_CLARO,
    btnMenuFundo: COR_TOM_CLARO,
    btnMenuTexto: c.acaoEscura,
    tituloMenu: COR_TOM_CLARO,
    cardFundo: COR_TOM_CLARO,
    btnSuporteTexto: c.acaoEscura,
    btnSuporteFundo: COR_TOM_CLARO,
    bordaIA: c.acaoEscura,
    corAcerto: COR_ACERTO,
    corErro: COR_ERRO
  };
}