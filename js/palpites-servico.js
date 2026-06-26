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

// O esquema é idempotente; garante uma vez por instância "quente" da função,
// em vez de rodar o DDL a cada request.
let esquemaPronto = false;

export async function tratarRequisicao(req, res, { db, resultados }) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ erro: 'método não suportado' });
  }

  if (!esquemaPronto) {
    await db.garantirEsquema();
    esquemaPronto = true;
  }

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

  const jogoId = Array.isArray(req.query.jogoId) ? req.query.jogoId[0] : req.query.jogoId;
  if (typeof jogoId !== 'string' || jogoId.length === 0) {
    return res.status(400).json({ erro: 'jogoId é obrigatório' });
  }
  const palpites = await db.palpitesDoJogo(jogoId);
  return res.status(200).json(calcularVibe(palpites));
}
