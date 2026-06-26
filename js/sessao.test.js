import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assinarSessao, verificarSessao } from './sessao.js';

const SEGREDO = 'segredo-de-teste';

test('assina e verifica devolvendo o payload', () => {
  const token = assinarSessao({ id: 7, nome: 'Ana' }, SEGREDO);
  const corpo = verificarSessao(token, SEGREDO);
  assert.equal(corpo.id, 7);
  assert.equal(corpo.nome, 'Ana');
});

test('segredo errado rejeita', () => {
  const token = assinarSessao({ id: 7 }, SEGREDO);
  assert.equal(verificarSessao(token, 'outro'), null);
});

test('token adulterado rejeita', () => {
  const token = assinarSessao({ id: 7 }, SEGREDO);
  const ruim = token.slice(0, -2) + (token.slice(-2) === 'aa' ? 'bb' : 'aa');
  assert.equal(verificarSessao(ruim, SEGREDO), null);
});

test('token expirado rejeita', () => {
  const token = assinarSessao({ id: 7 }, SEGREDO, -10);
  assert.equal(verificarSessao(token, SEGREDO), null);
});

test('lixo devolve null', () => {
  assert.equal(verificarSessao('abc', SEGREDO), null);
  assert.equal(verificarSessao(null, SEGREDO), null);
});
