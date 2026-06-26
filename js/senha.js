import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

export function hashPin(pin) {
  const salt = randomBytes(16);
  const hash = scryptSync(String(pin), salt, 32);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verificarPin(pin, guardado) {
  if (typeof guardado !== 'string' || !guardado.includes(':')) return false;
  const [saltHex, hashHex] = guardado.split(':');
  let esperado;
  try {
    esperado = Buffer.from(hashHex, 'hex');
  } catch {
    return false;
  }
  const calculado = scryptSync(String(pin), Buffer.from(saltHex, 'hex'), esperado.length);
  return esperado.length === calculado.length && timingSafeEqual(esperado, calculado);
}
