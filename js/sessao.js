import { createHmac, timingSafeEqual } from 'node:crypto';

function b64url(texto) {
  return Buffer.from(texto).toString('base64url');
}

function assinar(parte, segredo) {
  return createHmac('sha256', segredo).update(parte).digest('base64url');
}

export function assinarSessao(payload, segredo, ttlSegundos = 60 * 60 * 24 * 30) {
  const corpo = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSegundos };
  const cabecalho = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const dados = b64url(JSON.stringify(corpo));
  const parte = `${cabecalho}.${dados}`;
  return `${parte}.${assinar(parte, segredo)}`;
}

export function verificarSessao(token, segredo) {
  if (typeof token !== 'string') return null;
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  const parte = `${partes[0]}.${partes[1]}`;
  const esperada = Buffer.from(assinar(parte, segredo));
  const recebida = Buffer.from(partes[2]);
  if (esperada.length !== recebida.length || !timingSafeEqual(esperada, recebida)) {
    return null;
  }
  let corpo;
  try {
    corpo = JSON.parse(Buffer.from(partes[1], 'base64url').toString());
  } catch {
    return null;
  }
  if (corpo.exp && Math.floor(Date.now() / 1000) > corpo.exp) return null;
  return corpo;
}
