import { test } from 'node:test';
import assert from 'node:assert/strict';
import { marcarTermos } from './termos-inline.js';

test('embrulha um termo conhecido num botão clicável', () => {
  const html = marcarTermos('Isso aí foi impedimento, viu?');
  assert.match(html, /<button[^>]*class="termo"[^>]*data-termo="impedimento"[^>]*>impedimento<\/button>/);
});

test('marca mais de um termo no mesmo texto', () => {
  const html = marcarTermos('Na fase de grupos é diferente do mata-mata.');
  assert.match(html, /data-termo="faseDeGrupos"/);
  assert.match(html, /data-termo="mataMata"/);
});

test('texto sem termo conhecido volta inalterado (mas escapado)', () => {
  assert.equal(marcarTermos('Vamos pra praia'), 'Vamos pra praia');
});

test('escapa HTML do texto de entrada', () => {
  const html = marcarTermos('1 < 2 & 3 > 0');
  assert.match(html, /1 &lt; 2 &amp; 3 &gt; 0/);
});

test('marca só a primeira ocorrência de um termo', () => {
  const html = marcarTermos('pênalti e mais um pênalti');
  const ocorrencias = html.match(/data-termo="penalti"/g) || [];
  assert.equal(ocorrencias.length, 1);
});
