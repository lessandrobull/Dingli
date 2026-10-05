// MOTOR DE CÁLCULO DE RANKS - DÌNGLOOP SRS (SEM TIMER DE 30s)
export function calcularProximoRank(rankAtual, isAcerto) {
  const rank = Math.max(1, Number(rankAtual) || 1);

  // 1. ERRO (Escrita, Seleção ou Voz recuperada na 2ª/3ª tentativa): desce 1 rank
  if (!isAcerto) {
    const novoRank = Math.max(1, rank - 1);
    return { novoRank, lista: 'recuperacao', espera: 0 };
  }

  // 2. GRADUAÇÃO DE MACROCICLOS (Saída da Task com Repouso Macro em Dias)
  // R27 -> Loop de manutenção no R24 com 32 dias
  if (rank === 27) {
    return { novoRank: 24, lista: 'macro', espera: 32 * 86400000 };
  }

  const portosSeguros = {
    5:  { proximo: 6,  dias: 1 },
    9:  { proximo: 10, dias: 2 },
    14: { proximo: 15, dias: 4 },
    18: { proximo: 19, dias: 8 },
    23: { proximo: 24, dias: 16 }
  };

  if (portosSeguros[rank]) {
    const config = portosSeguros[rank];
    return {
      novoRank: config.proximo,
      lista: 'macro',
      espera: config.dias * 86400000
    };
  }

  // 3. ACERTO COMUM NO CARROSSEL (Microciclos): sobe 1 rank e continua na fila
  return {
    novoRank: Math.min(rank + 1, 27),
    lista: 'progresso',
    espera: 0
  };
}
