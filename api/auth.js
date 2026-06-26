import { neon } from '@neondatabase/serverless';
import { OAuth2Client } from 'google-auth-library';
import { criarDb } from '../js/db.js';
import { tratarAuth } from '../js/auth-servico.js';

const clienteGoogle = new OAuth2Client();

async function verificarGoogle(idToken) {
  if (!idToken || !process.env.GOOGLE_CLIENT_ID) return null;
  try {
    const ticket = await clienteGoogle.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const p = ticket.getPayload();
    return { sub: p.sub, name: p.name, picture: p.picture };
  } catch {
    return null;
  }
}

function consultaNeon() {
  const sql = neon(process.env.DATABASE_URL);
  return (texto, params) => sql.query(texto, params);
}

export default async function handler(req, res) {
  try {
    const db = criarDb(consultaNeon());
    await tratarAuth(req, res, { db, verificarGoogle, segredo: process.env.SESSION_SECRET });
  } catch {
    res.status(500).json({ erro: 'falha no servidor de login' });
  }
}
