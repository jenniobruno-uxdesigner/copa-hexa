import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import handler from './dados.js';

const raw = JSON.parse(
  await readFile(new URL('../fixtures/raw-football-data.json', import.meta.url), 'utf-8')
);

function resFake() {
  return {
    statusCode: null,
    headers: {},
    body: null,
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(obj) { this.body = obj; return this; },
  };
}

test('com API_KEY e fetch ok, devolve dados normalizados (fonte api)', async () => {
  process.env.API_KEY = 'chave-teste';
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    const corpo = url.includes('/standings') ? raw.standings
      : url.includes('/matches') ? raw.matches
      : raw.scorers;
    return { ok: true, status: 200, json: async () => corpo };
  };
  try {
    const res = resFake();
    await handler({}, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.fonte, 'api');
    assert.equal(res.body.grupo.nome, 'Grupo G');
    assert.equal(res.body.proximoJogo.adversario, 'Sérvia');
    assert.equal(res.body.estado.situacao, 'grupos');
  } finally {
    global.fetch = originalFetch;
  }
});

test('quando o fetch falha, cai para o fallback manual (fonte manual)', async () => {
  process.env.API_KEY = 'chave-teste';
  const originalFetch = global.fetch;
  global.fetch = async () => { throw new Error('rede fora'); };
  try {
    const res = resFake();
    await handler({}, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.fonte, 'manual');
    assert.ok(res.body.grupo);
  } finally {
    global.fetch = originalFetch;
  }
});

test('sem API_KEY, cai para o fallback manual', async () => {
  delete process.env.API_KEY;
  const res = resFake();
  await handler({}, res);
  assert.equal(res.body.fonte, 'manual');
});
