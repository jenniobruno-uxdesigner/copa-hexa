import { neon } from '@neondatabase/serverless';
import { criarDb } from '../js/db.js';
import { montarResultados } from '../js/normalizar.js';
import { sessaoDaRequisicao } from '../js/sessao.js';
import { tratarRequisicao } from '../js/palpites-servico.js';

const BASE = 'https://api.football-data.org/v4';
const COMPETICAO = 'WC';

function consultaNeon() {
  const sql = neon(process.env.DATABASE_URL);
  return (texto, params) => sql.query(texto, params);
}

async function resultadosFinais() {
  const chave = process.env.API_KEY;
  if (!chave) return {};
  try {
    const resp = await fetch(`${BASE}/competitions/${COMPETICAO}/matches`, {
      headers: { 'X-Auth-Token': chave },
    });
    if (!resp.ok) return {};
    return montarResultados(await resp.json());
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  try {
    const db = criarDb(consultaNeon());
    const usuarioDaSessao = (r) => sessaoDaRequisicao(r, process.env.SESSION_SECRET);
    await tratarRequisicao(req, res, { db, resultados: resultadosFinais, usuarioDaSessao });
  } catch (erro) {
    res.status(500).json({ ok: false, erro: 'falha no servidor de palpites' });
  }
}
