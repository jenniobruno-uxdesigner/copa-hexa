import { test } from 'node:test';
import assert from 'node:assert/strict';
import { usernameValido, pinValido } from './usuario-validacao.js';

test('username aceita 3-20 letras/números/_/.', () => {
  assert.equal(usernameValido('ana_2026'), true);
  assert.equal(usernameValido('jo'), false);
  assert.equal(usernameValido('com espaço'), false);
  assert.equal(usernameValido('a'.repeat(21)), false);
  assert.equal(usernameValido(123), false);
});

test('PIN aceita 4 a 6 dígitos', () => {
  assert.equal(pinValido('1234'), true);
  assert.equal(pinValido('123456'), true);
  assert.equal(pinValido('123'), false);
  assert.equal(pinValido('1234567'), false);
  assert.equal(pinValido('12a4'), false);
  assert.equal(pinValido(1234), false);
});
