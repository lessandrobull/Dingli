import { useMemo } from 'react';

export function useDominiumData({ sessaoDominium, frasesFiltradas, frasesMaestria, idiomaEstudo, idiomaOrigem }) {
  const listas = useMemo(() => {
    const agora = Date.now();

    // 1. Frases retidas no Dìnglab (Topo Absoluto)
    const chaveDinglab = (idiomaOrigem && idiomaEstudo) ? `dinglab_${idiomaOrigem}_${idiomaEstudo}` : null;
    let idsDinglab = [];
    let itensDinglab = [];
    if (chaveDinglab) {
      try {
        const salvoD = localStorage.getItem(chaveDinglab);
        if (salvoD) {
          const arrD = JSON.parse(salvoD);
          if (Array.isArray(arrD)) {
            itensDinglab = arrD;
            idsDinglab = arrD.map(item => Number(item.id));
          }
        }
      } catch (e) {}
    }

    // 2. Frases da Bandeja (Apenas cartas efetivamente iniciadas e abandonadas)
    const chaveBandeja = (idiomaOrigem && idiomaEstudo) ? `bandeja_${idiomaOrigem}_${idiomaEstudo}` : null;
    let idsBandeja = [];
    let mapaTextosBandeja = {};
    if (chaveBandeja) {
      try {
        const salvoB = localStorage.getItem(chaveBandeja);
        if (salvoB) {
          const arrB = JSON.parse(salvoB);
          if (Array.isArray(arrB)) {
            arrB.forEach(item => {
              const idNum = typeof item === 'object' && item !== null ? Number(item.id) : Number(item);
              if (!idsDinglab.includes(idNum)) {
                idsBandeja.push(idNum);
                if (typeof item === 'object' && item !== null && item.texto) {
                  mapaTextosBandeja[idNum] = item.texto;
                }
              }
            });
          }
        }
      } catch (e) {}
    }

    const obterTextoFrase = (idNum, data) => {
      if (mapaTextosBandeja[idNum]) return mapaTextosBandeja[idNum];
      const fraseObj = (frasesFiltradas || []).find(f => Number(f.id) === idNum);
      if (fraseObj && fraseObj[idiomaEstudo]) return fraseObj[idiomaEstudo];
      if (data && data.texto) return data.texto;
      const emSessao = [
        ...(sessaoDominium?.recuperadas || []),
        ...(sessaoDominium?.acertosTempo || []),
        ...(sessaoDominium?.falhas || [])
      ].find(f => Number(f.id) === idNum);
      if (emSessao && emSessao.frase) return emSessao.frase;
      return "Frase não encontrada";
    };

    // Montagem da lista do Dìnglab (Topo Absoluto)
    const itemsDinglab = itensDinglab.map(item => {
      const idNum = Number(item.id);
      const maestriaItem = frasesMaestria[idNum];
      const rank = item.rank || (typeof maestriaItem === 'object' ? maestriaItem.rank : maestriaItem) || 1;
      const texto = item[idiomaEstudo] || item.texto || obterTextoFrase(idNum, maestriaItem);
      return `R${rank} - ${texto}`;
    });

    // Montagem da lista da Bandeja (Condicional de Abandono)
    const itemsBandeja = idsBandeja.map(idNum => {
      const maestriaItem = frasesMaestria[idNum];
      const rank = typeof maestriaItem === 'object' ? maestriaItem.rank : (maestriaItem || 0);
      const texto = obterTextoFrase(idNum, maestriaItem);
      return `R${rank} - ${texto}`;
    });

    const filtrarLista = (criterio) => {
      return Object.entries(frasesMaestria)
        .filter(([id, data]) => {
          const idNum = Number(id);
          if (typeof data !== 'object' || data.rank === 0) return false;

          // Frases no Dìnglab são estritamente excluídas de todas as listas abaixo
          if (idsDinglab.includes(idNum)) return false;

          // Frases na Bandeja abandonada são estritamente excluídas de todas as listas abaixo
          if (idsBandeja.includes(idNum)) return false;

          const isReady = data.next_review <= agora;

          if (criterio === 'proximas') {
            // Próximas = Repousos macro de dias vencidos + Frases recém-saídas do Dìnglab
            return isReady;
          }

          if (isReady) return false;

          const diff = (data.next_review - data.last_review) || 0;
          if (criterio === '1d') return data.status === 'macro' && diff === 86400000;
          if (criterio === '2d') return data.status === 'macro' && diff === 172800000;
          if (criterio === '4d') return data.status === 'macro' && diff === 345600000;
          if (criterio === '8d') return data.status === 'macro' && diff === 691200000;
          if (criterio === '16d') return data.status === 'macro' && diff === 1382400000;
          if (criterio === '32d') return data.status === 'macro' && diff === 2764800000;
          return false;
        })
        .sort((a, b) => {
          const timeA = typeof a[1] === 'object' && a[1].last_attempt_at ? a[1].last_attempt_at : 0;
          const timeB = typeof b[1] === 'object' && b[1].last_attempt_at ? b[1].last_attempt_at : 0;
          return timeA - timeB;
        })
        .map(([id, data]) => {
          const idNum = Number(id);
          const texto = obterTextoFrase(idNum, data);
          return `R${data.rank} - ${texto}`;
        });
    };

    const resultadoListas = [];

    // 1. Dìnglab (no topo absoluto)
    resultadoListas.push({
      label: "Dìnglab",
      items: itemsDinglab,
      cor: '#9333ea'
    });

    // 2. Bandeja (Condicional: só aparece se houver cartas iniciadas e abandonadas)
    if (itemsBandeja.length > 0) {
      resultadoListas.push({
        label: "Bandeja",
        items: itemsBandeja,
        cor: '#0284c7'
      });
    }

    // 3. Próximas (Repouso macro vencido + recém-saídas do Dìnglab)
    resultadoListas.push({
      label: "Próximas",
      items: filtrarLista('proximas'),
      cor: '#ef4444'
    });

    // 4. Progresso de dias (Seção 'Aguardando 30 segundos' 100% extinta)
    resultadoListas.push({ label: "Progresso 1 dia", items: filtrarLista('1d'), cor: '#10b981' });
    resultadoListas.push({ label: "Progresso 2 dias", items: filtrarLista('2d'), cor: '#059669' });
    resultadoListas.push({ label: "Progresso 4 dias", items: filtrarLista('4d'), cor: '#3b82f6' });
    resultadoListas.push({ label: "Progresso 8 dias", items: filtrarLista('8d'), cor: '#2563eb' });
    resultadoListas.push({ label: "Progresso 16 dias", items: filtrarLista('16d'), cor: '#6366f1' });
    resultadoListas.push({ label: "Manutenção 32 dias", items: filtrarLista('32d'), cor: '#8b5cf6' });

    return resultadoListas;
  }, [frasesMaestria, frasesFiltradas, idiomaEstudo, idiomaOrigem, sessaoDominium]);

  return listas;
}
