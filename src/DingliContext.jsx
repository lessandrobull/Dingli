import React, { createContext, useContext, useMemo } from 'react';
import { temas, interfaceTraducoes } from './constant'; 

const DingliContext = createContext();

export function DingliProvider({
  children,
  idiomaOrigem, setIdiomaOrigem,
  idiomaEstudo, setIdiomaEstudo,
  userRole, setUserRole,
  mudarTela, tela
}) {

  const getCorFonteDinamica = (idioma) => {
    switch (idioma) {
      case 'pt': return '#002776';
      case 'en': return '#1e3a8a';
      case 'es': return '#c2410c';
      case 'fr': return '#0055a4';
      case 'it': return '#009246';
      case 'ge': return '#18181b';
      case 'pi': return '#991b1b';
      default:   return '#1e293b';
    }
  };

  const navStyle = (idioma) => {
    return {
      bg: getCorFonteDinamica(idioma),
      txt: '#ffffff'
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
    navStyle
  }), [t, idiomaOrigem, idiomaEstudo, userRole, tela]);

  const extendedValue = useMemo(() => ({
    ...contextValue,
    idiomaOrigem, setIdiomaOrigem,
    idiomaEstudo, setIdiomaEstudo,
    userRole, setUserRole,
    mudarTela, tela
  }), [contextValue, idiomaOrigem, setIdiomaOrigem, idiomaEstudo, setIdiomaEstudo, userRole, setUserRole, mudarTela, tela]);
  return (
    <DingliContext.Provider value={extendedValue}>
      {children}
    </DingliContext.Provider>
  );
}

export const useDingli = () => useContext(DingliContext);