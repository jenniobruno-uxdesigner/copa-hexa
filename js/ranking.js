import { pontuarPalpite } from './pontuacao.js';

export function calcularRanking(palpites, resultados) {
  const porUsuario = new Map();

  for (const p of palpites) {
    const resultado = resultados[p.jogoId];
    if (!resultado) continue; // jogo ainda não encerrado

    const pontos = pontuarPalpite(p, resultado);
    const atual = porUsuario.get(p.usuarioId) || {
      usuarioId: p.usuarioId,
      apelido: p.apelido,
      pontos: 0,
      acertos: 0,
    };
    atual.pontos += pontos;
    if (pontos === 3) atual.acertos += 1;
    atual.apelido = p.apelido; // mantém o apelido mais recente
    porUsuario.set(p.usuarioId, atual);
  }

  return [...porUsuario.values()].sort(
    (a, b) => b.pontos - a.pontos || b.acertos - a.acertos
  );
}
