import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resultadoChute } from './jogo-gol.js';

const alvo = { golEsquerda: 70, golDireita: 290, goleiroEsq: 150, goleiroDir: 210 };

test('bola fora das traves é "fora"', () => {
  assert.equal(resultadoChute(40, alvo), 'fora');
  assert.equal(resultadoChute(320, alvo), 'fora');
});

test('bola em cima do goleiro é "defesa"', () => {
  assert.equal(resultadoChute(180, alvo), 'defesa');
});

test('bola dentro das traves longe do goleiro é "gol"', () => {
  assert.equal(resultadoChute(90, alvo), 'gol');
  assert.equal(resultadoChute(270, alvo), 'gol');
});
