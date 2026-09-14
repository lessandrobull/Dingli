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
      case 'en': case 'fr': case 'it': case 'ge': case 'pi': case 'es': return '#dc2626';
      default: return '#1e293b';
    }
  };

  const navStyle = (idioma) => {
    if (idioma === 'es') return { bg: '#dc2626', txt: '#fff' };
    if (idioma === 'pt') return { bg: '#ffdf00', txt: '#1e3a8a' };
    if (idioma === 'ge') return { bg: '#fbbf24', txt: '#1e293b' };
    if (idioma === 'pi') return { bg: '#ffdf00', txt: '#CD212A' };
    return { bg: temas[idioma]?.btn || '#333', txt: '#fff' };
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