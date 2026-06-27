import { calcularVibe } from './distribuicao.js';
import { calcularRanking } from './ranking.js';

const PLACAR_MAX = 30;

function placarValido(n) {
  return Number.isInteger(n) && n >= 0 && n <= PLACAR_MAX;
}

function palpiteProntoValido(p) {
  return (
    typeof p.jogoId === 'string' && p.jogoId.length > 0 &&
    typeof p.usuarioId === 'string' && p.usuarioId.length > 0 &&
    typeof p.apelido === 'string' && p.apelido.trim().length > 0 &&
    placarValido(p.placarBrasil) && placarValido(p.placarAdversario)
  );
}

// O esquema é idempotente; garante uma vez por instância "quente" da função,
// em vez de rodar o DDL a cada request.
let esquemaPronto = false;

export async function tratarRequisicao(req, res, { db, resultados, usuarioDaSessao }) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ erro: 'método não suportado' });
  }

  if (!esquemaPronto) {
    await db.garantirEsquema();
    esquemaPronto = true;
  }

  if (req.method === 'POST') {
    const b = req.body || {};
    const sessao = usuarioDaSessao ? usuarioDaSessao(req) : null;
    const palpite = sessao
      ? {
          jogoId: b.jogoId,
          usuarioId: `conta-${sessao.id}`,
          apelido: sessao.nome,
          contaId: sessao.id,
          placarBrasil: b.placarBrasil,
          placarAdversario: b.placarAdversario,
        }
      : {
          jogoId: b.jogoId,
          usuarioId: b.usuarioId,
          apelido: typeof b.apelido === 'string' ? b.apelido.trim().slice(0, 40) : b.apelido,
          contaId: null,
          placarBrasil: b.placarBrasil,
          placarAdversario: b.placarAdversario,
        };
    if (!palpiteProntoValido(palpite)) {
      return res.status(400).json({ ok: false, erro: 'palpite inválido' });
    }
    await db.salvarPalpite(palpite);
    return res.status(200).json({ ok: true });
  }

  if (req.query.ranking !== undefined) {
    const [palpites, mapa] = await Promise.all([db.palpitesDeContas(), resultados()]);
    return res.status(200).json({ ranking: calcularRanking(palpites, mapa) });
  }

  const jogoId = Array.isArray(req.query.jogoId) ? req.query.jogoId[0] : req.query.jogoId;
  if (typeof jogoId !== 'string' || jogoId.length === 0) {
    return res.status(400).json({ erro: 'jogoId é obrigatório' });
  }
  const palpites = await db.palpitesDoJogo(jogoId);
  return res.status(200).json(calcularVibe(palpites));
}
