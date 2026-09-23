import React, { createContext, useContext, useMemo, useState } from 'react';
import { temas, interfaceTraducoes } from './constant';
import { CORES_POR_IDIOMA, COR_TOM_CLARO, COR_BASE_CARDS, COR_ACERTO, COR_ERRO, getTemaVisual } from './themeColors';

const DingliContext = createContext();

export function DingliProvider({
  children,
  idiomaOrigem, setIdiomaOrigem,
  idiomaEstudo, setIdiomaEstudo,
  userRole, setUserRole,
  nivelAtivo, setNivelAtivo,
  mudarTela, tela
}) {
  const [origemNivel, setOrigemNivel] = useState('deck');
  const getCorFonteDinamica = (idioma) => {
    return (CORES_POR_IDIOMA[idioma] || CORES_POR_IDIOMA.en).acaoEscura;
  };

  const navStyle = (idioma) => {
    return {
      bg: (CORES_POR_IDIOMA[idioma] || CORES_POR_IDIOMA.en).acaoEscura,
      txt: COR_TOM_CLARO
    };
  };

  const t = useMemo(() => ({
    ...interfaceTraducoes.pt,
    ...(interfaceTraducoes[idiomaOrigem] || {})
  }), [idiomaOrigem]);

  const contextValue = useMemo(() => ({
    temas,
    t,
    getCorFonteDinamica,
    navStyle,
    COR_TOM_CLARO,
    COR_BASE_CARDS,
    COR_ACERTO,
    COR_ERRO,
    getTemaVisual
  }), [t, idiomaOrigem, idiomaEstudo, userRole, tela]);

  const extendedValue = useMemo(() => ({
    ...contextValue,
    idiomaOrigem, setIdiomaOrigem,
    idiomaEstudo, setIdiomaEstudo,
    userRole, setUserRole,
    nivelAtivo, setNivelAtivo,
    mudarTela, tela
  }), [contextValue, idiomaOrigem, setIdiomaOrigem, idiomaEstudo, setIdiomaEstudo, userRole, setUserRole, nivelAtivo, setNivelAtivo, origemNivel, setOrigemNivel, mudarTela, tela]);

  return (
    <DingliContext.Provider value={extendedValue}>
      {children}
    </DingliContext.Provider>
  );
}

export const useDingli = () => useContext(DingliContext);