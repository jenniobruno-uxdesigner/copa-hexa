import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statusHexa } from './termometro.js';

const base = {
  situacao: 'grupos',
  posicaoGrupo: 1,
  vagasNoGrupo: 2,
  classificadoGarantido: false,
  proximoAdversario: 'Sérvia',
};

test('campeão vira nível hexa', () => {
  const s = statusHexa({ ...base, situacao: 'campeao' });
  assert.equal(s.nivel, 'hexa');
});

test('eliminado vira nível eliminado', () => {
  const s = statusHexa({ ...base, situacao: 'eliminado' });
  assert.equal(s.nivel, 'eliminado');
});

test('classificado para o mata-mata vai muito bem', () => {
  const s = statusHexa({ ...base, situacao: 'mata-mata' });
  assert.equal(s.nivel, 'muito-bem');
});

test('nos grupos, dentro das vagas, está no caminho', () => {
  const s = statusHexa({ ...base, posicaoGrupo: 2, vagasNoGrupo: 2 });
  assert.equal(s.nivel, 'no-caminho');
});

test('nos grupos, fora das vagas, é sinal de alerta', () => {
  const s = statusHexa({ ...base, posicaoGrupo: 3, vagasNoGrupo: 2 });
  assert.equal(s.nivel, 'alerta');
});

test('vaga já garantida nos grupos vai muito bem', () => {
  const s = statusHexa({ ...base, posicaoGrupo: 1, classificadoGarantido: true });
  assert.equal(s.nivel, 'muito-bem');
});

test('o texto cita o próximo adversário quando há um', () => {
  const s = statusHexa({ ...base, posicaoGrupo: 3, vagasNoGrupo: 2 });
  assert.match(s.oQuePrecisa, /Sérvia/);
});

test('todo status tem emoji e título não vazios', () => {
  const s = statusHexa(base);
  assert.ok(s.emoji.length > 0);
  assert.ok(s.titulo.length > 0);
});
