import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pontuarPalpite } from './pontuacao.js';

test('placar exato vale 3 pontos', () => {
  const p = pontuarPalpite({ placarBrasil: 2, placarAdversario: 1 }, { placarBrasil: 2, placarAdversario: 1 });
  assert.equal(p, 3);
});

test('acertar só o vencedor vale 1 ponto', () => {
  const p = pontuarPalpite({ placarBrasil: 2, placarAdversario: 1 }, { placarBrasil: 3, placarAdversario: 0 });
  assert.equal(p, 1);
});

test('acertar o empate (placares diferentes) vale 1 ponto', () => {
  const p = pontuarPalpite({ placarBrasil: 1, placarAdversario: 1 }, { placarBrasil: 2, placarAdversario: 2 });
  assert.equal(p, 1);
});

test('acertar uma derrota do Brasil vale 1 ponto', () => {
  const p = pontuarPalpite({ placarBrasil: 0, placarAdversario: 2 }, { placarBrasil: 1, placarAdversario: 3 });
  assert.equal(p, 1);
});

test('errar o resultado vale 0', () => {
  const p = pontuarPalpite({ placarBrasil: 2, placarAdversario: 1 }, { placarBrasil: 0, placarAdversario: 1 });
  assert.equal(p, 0);
});
