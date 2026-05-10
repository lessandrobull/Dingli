export function calcularProximoRank(rankAtual, isAcerto, highestRank = 0, inRecuperacao = false) {

  const rank = Math.max(1, rankAtual);

  if (!isAcerto) {

    const novoRank = inRecuperacao ? rank : (rank <= 2 ? 1 : rank - 1);

    return { novoRank, lista: 'recuperacao', espera: 30000 };

  }

  if (inRecuperacao) {

    return { novoRank: rank, lista: 'progresso', espera: 30000 };

  }

  if (rank === 27) return { novoRank: 24, lista: 'macro', espera: 32 * 86400000 };

  const check = { 5: { p: 6, d: 1 }, 9: { p: 10, d: 2 }, 14: { p: 15, d: 4 }, 18: { p: 19, d: 8 }, 23: { p: 24, d: 16 } };

  if (check[rank]) {

    const dest = highestRank >= check[rank].p;

    return { novoRank: check[rank].p, lista: dest ? 'progresso' : 'macro', espera: dest ? 30000 : check[rank].d * 86400000 };

  }

  return { novoRank: Math.min(rank + 1, 27), lista: 'progresso', espera: 30000 };

}