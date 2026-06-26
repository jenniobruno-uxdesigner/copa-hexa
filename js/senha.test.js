import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPin, verificarPin } from './senha.js';

test('hash e verificação batem para o PIN certo', () => {
  const h = hashPin('1234');
  assert.match(h, /^[0-9a-f]+:[0-9a-f]+$/);
  assert.equal(verificarPin('1234', h), true);
});

test('PIN errado não verifica', () => {
  const h = hashPin('1234');
  assert.equal(verificarPin('9999', h), false);
});

test('hash guardado malformado devolve false', () => {
  assert.equal(verificarPin('1234', 'lixo'), false);
  assert.equal(verificarPin('1234', null), false);
});

test('dois hashes do mesmo PIN são diferentes (salt aleatório)', () => {
  assert.notEqual(hashPin('1234'), hashPin('1234'));
});
