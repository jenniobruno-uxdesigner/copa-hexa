import { usernameValido, pinValido } from './usuario-validacao.js';
import { hashPin, verificarPin } from './senha.js';
import { assinarSessao } from './sessao.js';

function resposta(conta, segredo) {
  const perfil = { id: conta.id, nome: conta.nome, foto: conta.foto || null };
  const token = assinarSessao({ id: conta.id, nome: conta.nome }, segredo);
  return { token, perfil };
}

export async function tratarAuth(req, res, { db, verificarGoogle, segredo }) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'método não suportado' });
  }
  await db.garantirEsquemaUsuarios();
  const b = req.body || {};

  if (b.acao === 'registrar') {
    if (!usernameValido(b.username) || !pinValido(b.pin)) {
      return res.status(400).json({ erro: 'usuário (3-20) ou PIN (4-6 dígitos) inválido' });
    }
    try {
      const conta = await db.criarUsuarioPin({
        nome: b.username,
        usernameLc: b.username.toLowerCase(),
        pinHash: hashPin(b.pin),
      });
      return res.status(200).json(resposta(conta, segredo));
    } catch {
      return res.status(409).json({ erro: 'esse nome já está em uso' });
    }
  }

  if (b.acao === 'entrar') {
    if (!usernameValido(b.username) || !pinValido(b.pin)) {
      return res.status(400).json({ erro: 'usuário ou PIN inválido' });
    }
    const conta = await db.buscarPorUsername(b.username.toLowerCase());
    if (!conta || !conta.pinHash || !verificarPin(b.pin, conta.pinHash)) {
      return res.status(401).json({ erro: 'usuário ou PIN errado' });
    }
    return res.status(200).json(resposta(conta, segredo));
  }

  if (b.acao === 'google') {
    const info = await verificarGoogle(b.idToken);
    if (!info || !info.sub) {
      return res.status(401).json({ erro: 'login com Google falhou' });
    }
    const conta = await db.acharOuCriarGoogle({
      googleSub: info.sub,
      nome: info.name || 'Torcedor',
      fotoUrl: info.picture || null,
    });
    return res.status(200).json(resposta(conta, segredo));
  }

  return res.status(400).json({ erro: 'ação desconhecida' });
}
