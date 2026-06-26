import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ordenarRankingJogo } from './ranking-jogo.js';

test('lista vazia devolve vazio', () => {
  assert.deepEqual(ordenarRankingJogo([]), []);
});

test('ordena por gols (desc)', () => {
  const r = ordenarRankingJogo([
    { nome: 'Ana', foto: null, gols: 3, melhorSequencia: 2 },
    { nome: 'Beto', foto: null, gols: 9, melhorSequencia: 1 },
  ]);
  assert.equal(r[0].nome, 'Beto');
  assert.equal(r[1].nome, 'Ana');
});

test('empate em gols desempata pela melhor sequência (desc)', () => {
  const r = ordenarRankingJogo([
    { nome: 'Ana', foto: null, gols: 5, melhorSequencia: 2 },
    { nome: 'Beto', foto: null, gols: 5, melhorSequencia: 4 },
  ]);
  assert.equal(r[0].nome, 'Beto');
});

test('não muta a lista original', () => {
  const lista = [
    { nome: 'Ana', foto: null, gols: 1, melhorSequencia: 0 },
    { nome: 'Beto', foto: null, gols: 2, melhorSequencia: 0 },
  ];
  ordenarRankingJogo(lista);
  assert.equal(lista[0].nome, 'Ana');
});
