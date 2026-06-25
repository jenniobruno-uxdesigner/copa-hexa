import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularRanking } from './ranking.js';

const resultados = {
  J1: { placarBrasil: 2, placarAdversario: 1 },
  J2: { placarBrasil: 0, placarAdversario: 0 },
};

test('lista vazia devolve ranking vazio', () => {
  assert.deepEqual(calcularRanking([], resultados), []);
});

test('soma pontos por usuário e ordena do maior para o menor', () => {
  const palpites = [
    { usuarioId: 'u1', apelido: 'Ana', jogoId: 'J1', placarBrasil: 2, placarAdversario: 1 },
    { usuarioId: 'u1', apelido: 'Ana', jogoId: 'J2', placarBrasil: 1, placarAdversario: 1 },
    { usuarioId: 'u2', apelido: 'Beto', jogoId: 'J1', placarBrasil: 3, placarAdversario: 0 },
  ];
  const r = calcularRanking(palpites, resultados);
  assert.equal(r.length, 2);
  assert.equal(r[0].apelido, 'Ana');
  assert.equal(r[0].pontos, 4);
  assert.equal(r[0].acertos, 1);
  assert.equal(r[1].apelido, 'Beto');
  assert.equal(r[1].pontos, 1);
});

test('ignora palpites de jogos ainda não encerrados', () => {
  const palpites = [
    { usuarioId: 'u1', apelido: 'Ana', jogoId: 'JX', placarBrasil: 1, placarAdversario: 0 },
  ];
  assert.deepEqual(calcularRanking(palpites, resultados), []);
});

test('desempata por mais acertos exatos', () => {
  const palpites = [
    { usuarioId: 'u1', apelido: 'Ana', jogoId: 'J1', placarBrasil: 2, placarAdversario: 1 },
    { usuarioId: 'u2', apelido: 'Beto', jogoId: 'J1', placarBrasil: 5, placarAdversario: 4 },
    { usuarioId: 'u2', apelido: 'Beto', jogoId: 'J2', placarBrasil: 9, placarAdversario: 8 },
  ];
  const r = calcularRanking(palpites, resultados);
  assert.equal(r[0].apelido, 'Ana');
});
