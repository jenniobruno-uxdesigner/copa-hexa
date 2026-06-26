import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tratarAuth } from './auth-servico.js';
import { hashPin } from './senha.js';
import { verificarSessao } from './sessao.js';

const SEGREDO = 'seg';

function resFake() {
  return {
    statusCode: null, body: null,
    status(c) { this.statusCode = c; return this; },
    json(o) { this.body = o; return this; },
  };
}

function dbFake(over = {}) {
  return {
    async garantirEsquemaUsuarios() {},
    async criarUsuarioPin({ nome }) { return { id: 1, nome, foto: null }; },
    async buscarPorUsername() { return null; },
    async acharOuCriarGoogle({ nome, fotoUrl }) { return { id: 2, nome, foto: fotoUrl }; },
    ...over,
  };
}

const googleOk = async () => ({ sub: 'g-1', name: 'João G', picture: 'http://x/p.png' });

test('registrar válido cria conta e devolve token + perfil', async () => {
  const res = resFake();
  await tratarAuth({ method: 'POST', body: { acao: 'registrar', username: 'ana_1', pin: '1234' } }, res, { db: dbFake(), verificarGoogle: googleOk, segredo: SEGREDO });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.perfil.nome, 'ana_1');
  assert.equal(verificarSessao(res.body.token, SEGREDO).id, 1);
});

test('registrar inválido devolve 400', async () => {
  const res = resFake();
  await tratarAuth({ method: 'POST', body: { acao: 'registrar', username: 'a', pin: '12' } }, res, { db: dbFake(), verificarGoogle: googleOk, segredo: SEGREDO });
  assert.equal(res.statusCode, 400);
});

test('registrar com nome em uso devolve 409', async () => {
  const db = dbFake({ async criarUsuarioPin() { throw new Error('unique'); } });
  const res = resFake();
  await tratarAuth({ method: 'POST', body: { acao: 'registrar', username: 'ana_1', pin: '1234' } }, res, { db, verificarGoogle: googleOk, segredo: SEGREDO });
  assert.equal(res.statusCode, 409);
});

test('entrar com PIN certo devolve token', async () => {
  const db = dbFake({ async buscarPorUsername() { return { id: 5, nome: 'Ana', foto: null, pinHash: hashPin('1234') }; } });
  const res = resFake();
  await tratarAuth({ method: 'POST', body: { acao: 'entrar', username: 'ana', pin: '1234' } }, res, { db, verificarGoogle: googleOk, segredo: SEGREDO });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.perfil.id, 5);
});

test('entrar com PIN errado devolve 401', async () => {
  const db = dbFake({ async buscarPorUsername() { return { id: 5, nome: 'Ana', foto: null, pinHash: hashPin('1234') }; } });
  const res = resFake();
  await tratarAuth({ method: 'POST', body: { acao: 'entrar', username: 'ana', pin: '0000' } }, res, { db, verificarGoogle: googleOk, segredo: SEGREDO });
  assert.equal(res.statusCode, 401);
});

test('google válido cria/loga e usa nome e foto do Google', async () => {
  const res = resFake();
  await tratarAuth({ method: 'POST', body: { acao: 'google', idToken: 'tok' } }, res, { db: dbFake(), verificarGoogle: googleOk, segredo: SEGREDO });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.perfil.nome, 'João G');
  assert.equal(res.body.perfil.foto, 'http://x/p.png');
});

test('google inválido devolve 401', async () => {
  const res = resFake();
  await tratarAuth({ method: 'POST', body: { acao: 'google', idToken: 'x' } }, res, { db: dbFake(), verificarGoogle: async () => null, segredo: SEGREDO });
  assert.equal(res.statusCode, 401);
});

test('método diferente de POST devolve 405', async () => {
  const res = resFake();
  await tratarAuth({ method: 'GET', body: {} }, res, { db: dbFake(), verificarGoogle: googleOk, segredo: SEGREDO });
  assert.equal(res.statusCode, 405);
});
