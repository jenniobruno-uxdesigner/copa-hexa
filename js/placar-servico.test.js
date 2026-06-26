import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tratarPlacar } from './placar-servico.js';

function resFake() {
  return {
    statusCode: null, body: null,
    status(c) { this.statusCode = c; return this; },
    json(o) { this.body = o; return this; },
  };
}

function dbFake(over = {}) {
  return {
    salvos: [],
    async garantirEsquemaPlacares() {},
    async registrarResultadoJogo(r) { this.salvos.push(r); },
    async rankingJogo() {
      return [
        { nome: 'Ana', foto: null, gols: 3, melhorSequencia: 1 },
        { nome: 'Beto', foto: null, gols: 9, melhorSequencia: 2 },
      ];
    },
    ...over,
  };
}

const logado = () => ({ id: 5, nome: 'Ana' });
const anonimo = () => null;

test('GET ?ranking devolve o ranking já ordenado por gols', async () => {
  const res = resFake();
  await tratarPlacar({ method: 'GET', query: { ranking: '' } }, res, { db: dbFake(), usuarioDaSessao: logado });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ranking[0].nome, 'Beto');
});

test('POST logado registra o resultado', async () => {
  const db = dbFake();
  const res = resFake();
  await tratarPlacar({ method: 'POST', query: {}, body: { golsNaPartida: 1, sequenciaNaPartida: 3 } }, res, { db, usuarioDaSessao: logado });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.deepEqual(db.salvos[0], { contaId: 5, gols: 1, sequencia: 3 });
});

test('POST anônimo é rejeitado com 401', async () => {
  const db = dbFake();
  const res = resFake();
  await tratarPlacar({ method: 'POST', query: {}, body: { golsNaPartida: 1, sequenciaNaPartida: 3 } }, res, { db, usuarioDaSessao: anonimo });
  assert.equal(res.statusCode, 401);
  assert.equal(db.salvos.length, 0);
});

test('POST com resultado inválido devolve 400', async () => {
  const db = dbFake();
  const res = resFake();
  await tratarPlacar({ method: 'POST', query: {}, body: { golsNaPartida: -1, sequenciaNaPartida: 3 } }, res, { db, usuarioDaSessao: logado });
  assert.equal(res.statusCode, 400);
});

test('método não suportado devolve 405', async () => {
  const res = resFake();
  await tratarPlacar({ method: 'PUT', query: {} }, res, { db: dbFake(), usuarioDaSessao: logado });
  assert.equal(res.statusCode, 405);
});
