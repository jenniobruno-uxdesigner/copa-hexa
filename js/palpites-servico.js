import { calcularVibe } from './distribuicao.js';
import { calcularRanking } from './ranking.js';

const PLACAR_MAX = 30;

function placarValido(n) {
  return Number.isInteger(n) && n >= 0 && n <= PLACAR_MAX;
}

function palpiteValido(b) {
  return (
    b &&
    typeof b.jogoId === 'string' && b.jogoId.length > 0 &&
    typeof b.usuarioId === 'string' && b.usuarioId.length > 0 &&
    typeof b.apelido === 'string' && b.apelido.trim().length > 0 &&
    placarValido(b.placarBrasil) && placarValido(b.placarAdversario)
  );
}

export async function tratarRequisicao(req, res, { db, resultados }) {
  await db.garantirEsquema();

  if (req.method === 'POST') {
    const b = req.body;
    if (!palpiteValido(b)) {
      return res.status(400).json({ ok: false, erro: 'palpite inválido' });
    }
    await db.salvarPalpite({
      jogoId: b.jogoId,
      usuarioId: b.usuarioId,
      apelido: b.apelido.trim().slice(0, 40),
      placarBrasil: b.placarBrasil,
      placarAdversario: b.placarAdversario,
    });
    return res.status(200).json({ ok: true });
  }

  if (req.query.ranking !== undefined) {
    const [palpites, mapa] = await Promise.all([db.todosPalpites(), resultados()]);
    return res.status(200).json({ ranking: calcularRanking(palpites, mapa) });
  }

  const jogoId = req.query.jogoId;
  if (!jogoId) {
    return res.status(400).json({ erro: 'jogoId é obrigatório' });
  }
  const palpites = await db.palpitesDoJogo(jogoId);
  return res.status(200).json(calcularVibe(palpites));
}
