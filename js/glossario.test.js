import { test } from 'node:test';
import assert from 'node:assert/strict';
import { definicao, todos } from './glossario.js';

test('devolve a definição de um termo conhecido', () => {
  const d = definicao('impedimento');
  assert.ok(d);
  assert.match(d.termo, /^Impedimento/);
  assert.ok(d.definicao.length > 0);
});

test('termo desconhecido devolve undefined', () => {
  assert.equal(definicao('xablau'), undefined);
});

test('todos() devolve a lista completa de termos', () => {
  const lista = todos();
  assert.ok(lista.length >= 6);
  for (const item of lista) {
    assert.ok(item.termo.length > 0);
    assert.ok(item.definicao.length > 0);
  }
});
