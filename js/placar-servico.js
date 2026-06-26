import { ordenarRankingJogo } from './ranking-jogo.js';

function inteiroNaoNeg(n) {
  return Number.isInteger(n) && n >= 0;
}

export async function tratarPlacar(req, res, { db, usuarioDaSessao }) {
  await db.garantirEsquemaPlacares();

  if (req.method === 'GET' && req.query && req.query.ranking !== undefined) {
    const linhas = await db.rankingJogo();
    return res.status(200).json({ ranking: ordenarRankingJogo(linhas) });
  }

  if (req.method === 'POST') {
    const sessao = usuarioDaSessao(req);
    if (!sessao) {
      return res.status(401).json({ erro: 'entre pra contar no pódio' });
    }
    const b = req.body || {};
    if (!inteiroNaoNeg(b.golsNaPartida) || !inteiroNaoNeg(b.sequenciaNaPartida)) {
      return res.status(400).json({ erro: 'resultado inválido' });
    }
    await db.registrarResultadoJogo({
      contaId: sessao.id,
      gols: b.golsNaPartida,
      sequencia: b.sequenciaNaPartida,
    });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ erro: 'método não suportado' });
}
