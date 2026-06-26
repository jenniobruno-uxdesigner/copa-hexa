import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tratarRequisicao } from './palpites-servico.js';

function resFake() {
  return {
    statusCode: null, body: null,
    status(c) { this.statusCode = c; return this; },
    json(o) { this.body = o; return this; },
  };
}

function dbFake(palpites = []) {
  return {
    salvos: [],
    async garantirEsquema() {},
    async salvarPalpite(p) { this.salvos.push(p); },
    async palpitesDoJogo(jogoId) { return palpites.filter((p) => p.jogoId === jogoId); },
    async todosPalpites() { return palpites; },
  };
}

const semResultados = async () => ({});

test('POST válido salva o palpite e responde ok', async () => {
  const db = dbFake();
  const req = { method: 'POST', query: {}, body: { jogoId: 'J1', usuarioId: 'u1', apelido: 'Ana', placarBrasil: 2, placarAdversario: 1 } };
  const res = resFake();
  await tratarRequisicao(req, res, { db, resultados: semResultados });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(db.salvos.length, 1);
  assert.equal(db.salvos[0].apelido, 'Ana');
});

test('POST com apelido vazio é rejeitado (400) e não salva', async () => {
  const db = dbFake();
  const req = { method: 'POST', query: {}, body: { jogoId: 'J1', usuarioId: 'u1', apelido: '   ', placarBrasil: 2, placarAdversario: 1 } };
  const res = resFake();
  await tratarRequisicao(req, res, { db, resultados: semResultados });
  assert.equal(res.statusCode, 400);
  assert.equal(db.salvos.length, 0);
});

test('POST com placar inválido é rejeitado (400)', async () => {
  const db = dbFake();
  const req = { method: 'POST', query: {}, body: { jogoId: 'J1', usuarioId: 'u1', apelido: 'Ana', placarBrasil: -1, placarAdversario: 1 } };
  const res = resFake();
  await tratarRequisicao(req, res, { db, resultados: semResultados });
  assert.equal(res.statusCode, 400);
});

test('GET ?jogoId devolve a vibe (distribuição)', async () => {
  const db = dbFake([
    { jogoId: 'J1', usuarioId: 'u1', apelido: 'Ana', placarBrasil: 2, placarAdversario: 1 },
    { jogoId: 'J1', usuarioId: 'u2', apelido: 'Beto', placarBrasil: 2, placarAdversario: 1 },
  ]);
  const req = { method: 'GET', query: { jogoId: 'J1' }, body: null };
  const res = resFake();
  await tratarRequisicao(req, res, { db, resultados: semResultados });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.total, 2);
  assert.equal(res.body.placares[0].rotulo, '2x1');
});

test('GET ?ranking devolve o ranking calculado', async () => {
  const db = dbFake([
    { jogoId: 'J1', usuarioId: 'u1', apelido: 'Ana', placarBrasil: 2, placarAdversario: 1 },
  ]);
  const resultados = async () => ({ J1: { placarBrasil: 2, placarAdversario: 1 } });
  const req = { method: 'GET', query: { ranking: '' }, body: null };
  const res = resFake();
  await tratarRequisicao(req, res, { db, resultados });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ranking[0].apelido, 'Ana');
  assert.equal(res.body.ranking[0].pontos, 3);
});
