export function calcularVibe(palpites) {
  const total = palpites.length;
  const grupos = new Map();

  for (const p of palpites) {
    const rotulo = `${p.placarBrasil}x${p.placarAdversario}`;
    let g = grupos.get(rotulo);
    if (!g) {
      g = { quantidade: 0, palpiteiros: [] };
      grupos.set(rotulo, g);
    }
    g.quantidade += 1;
    // Só revela quem logou (tem conta — Google ou apelido/PIN). Anônimos
    // contam na distribuição, mas não aparecem com nome/foto.
    const nome = (p.nome || p.apelido || '').trim();
    if (p.contaId != null && nome) {
      g.palpiteiros.push({ nome, foto: p.foto || null });
    }
  }

  const placares = [...grupos.entries()]
    .map(([rotulo, g]) => ({
      rotulo,
      quantidade: g.quantidade,
      percentual: total ? Math.round((g.quantidade / total) * 100) : 0,
      palpiteiros: g.palpiteiros,
    }))
    .sort((a, b) => b.quantidade - a.quantidade);

  return { total, placares };
}
