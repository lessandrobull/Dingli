import { useMemo } from 'react';

export function useDominiumData({ sessaoDominium, frasesFiltradas, frasesMaestria, idiomaEstudo }) {

  const listas = useMemo(() => {

    const agora = Date.now();

    const filtrarLista = (criterio) => {

      return Object.entries(frasesMaestria)

        .filter(([id, data]) => {

          if (typeof data !== 'object' || data.rank === 0) return false;

          const isReady = data.next_review <= agora;

          if (criterio === 'proximas') return isReady;

          if (isReady) return false;

          const diff = (data.next_review - data.last_review) || 0;

          if (criterio === 'aguardando30s') return data.status === 'recuperacao' || data.status === 'progresso';

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

          let texto = "Frase não encontrada";

          const fraseObj = frasesFiltradas.find(f => f.id === idNum);

          if (fraseObj) {

            texto = fraseObj[idiomaEstudo];

          } else if (data.texto) {

            texto = data.texto;

          } else {

            const emSessao = [...(sessaoDominium.recuperadas || []), ...(sessaoDominium.acertosTempo || []), ...(sessaoDominium.falhas || [])].find(f => f.id === idNum);

            if (emSessao) texto = emSessao.frase;

          }

          return `R${data.rank} - ${texto}`;

        });

    };

    return [

      { label: "Próximas", items: filtrarLista('proximas'), cor: '#ef4444' },

      { label: "Aguardando 30 segundos", items: filtrarLista('aguardando30s'), cor: '#f59e0b' },

      { label: "Progresso 1 dia", items: filtrarLista('1d'), cor: '#10b981' },

      { label: "Progresso 2 dias", items: filtrarLista('2d'), cor: '#059669' },

      { label: "Progresso 4 dias", items: filtrarLista('4d'), cor: '#3b82f6' },

      { label: "Progresso 8 dias", items: filtrarLista('8d'), cor: '#2563eb' },

      { label: "Progresso 16 dias", items: filtrarLista('16d'), cor: '#6366f1' },

      { label: "Manutenção 32 dias", items: filtrarLista('32d'), cor: '#8b5cf6' }

    ];

  }, [frasesMaestria, frasesFiltradas, idiomaEstudo, sessaoDominium]);

  return listas;

}