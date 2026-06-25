import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularVibe } from './distribuicao.js';

test('lista vazia devolve total 0 e nenhum placar', () => {
  const v = calcularVibe([]);
  assert.equal(v.total, 0);
  assert.deepEqual(v.placares, []);
});

test('conta e ordena os placares mais palpitados primeiro', () => {
  const v = calcularVibe([
    { placarBrasil: 2, placarAdversario: 1 },
    { placarBrasil: 2, placarAdversario: 1 },
    { placarBrasil: 1, placarAdversario: 0 },
  ]);
  assert.equal(v.total, 3);
  assert.equal(v.placares[0].rotulo, '2x1');
  assert.equal(v.placares[0].quantidade, 2);
  assert.equal(v.placares[0].percentual, 67);
});

test('o percentual é arredondado e relativo ao total', () => {
  const v = calcularVibe([
    { placarBrasil: 1, placarAdversario: 0 },
    { placarBrasil: 0, placarAdversario: 1 },
  ]);
  assert.equal(v.placares[0].percentual, 50);
});

test('percentuais arredondados não precisam somar 100', () => {
  const v = calcularVibe([
    { placarBrasil: 1, placarAdversario: 0 },
    { placarBrasil: 2, placarAdversario: 0 },
    { placarBrasil: 3, placarAdversario: 0 },
  ]);
  assert.deepEqual(
    v.placares.map((p) => p.percentual),
    [33, 33, 33]
  );
});
