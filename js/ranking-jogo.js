export function ordenarRankingJogo(linhas) {
  return [...linhas].sort(
    (a, b) => b.gols - a.gols || b.melhorSequencia - a.melhorSequencia
  );
}
