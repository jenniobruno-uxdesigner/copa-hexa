export function calcularVibe(palpites) {
  const total = palpites.length;
  const contagem = new Map();

  for (const p of palpites) {
    const rotulo = `${p.placarBrasil}x${p.placarAdversario}`;
    contagem.set(rotulo, (contagem.get(rotulo) || 0) + 1);
  }

  const placares = [...contagem.entries()]
    .map(([rotulo, quantidade]) => ({
      rotulo,
      quantidade,
      percentual: total ? Math.round((quantidade / total) * 100) : 0,
    }))
    .sort((a, b) => b.quantidade - a.quantidade);

  return { total, placares };
}
