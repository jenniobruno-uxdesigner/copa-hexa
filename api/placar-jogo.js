import { neon } from '@neondatabase/serverless';
import { criarDb } from '../js/db.js';
import { sessaoDaRequisicao } from '../js/sessao.js';
import { tratarPlacar } from '../js/placar-servico.js';

function consultaNeon() {
  const sql = neon(process.env.DATABASE_URL);
  return (texto, params) => sql.query(texto, params);
}

export default async function handler(req, res) {
  try {
    const db = criarDb(consultaNeon());
    const usuarioDaSessao = (r) => sessaoDaRequisicao(r, process.env.SESSION_SECRET);
    await tratarPlacar(req, res, { db, usuarioDaSessao });
  } catch {
    res.status(500).json({ erro: 'falha no servidor de placar' });
  }
}
