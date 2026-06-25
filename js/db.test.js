import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarDb } from './db.js';

function consultaFake(linhasPorChamada = []) {
  const chamadas = [];
  let i = 0;
  const fn = async (texto, params) => {
    chamadas.push({ texto, params });
    return linhasPorChamada[i++] ?? [];
  };
  fn.chamadas = chamadas;
  return fn;
}

test('garantirEsquema cria a tabela se não existir', async () => {
  const consulta = consultaFake();
  await criarDb(consulta).garantirEsquema();
  assert.match(consulta.chamadas[0].texto, /CREATE TABLE IF NOT EXISTS palpites/);
});

test('salvarPalpite faz upsert com os parâmetros certos', async () => {
  const consulta = consultaFake();
  await criarDb(consulta).salvarPalpite({
    jogoId: 'J1', usuarioId: 'u1', apelido: 'Ana', placarBrasil: 2, placarAdversario: 1,
  });
  const c = consulta.chamadas[0];
  assert.match(c.texto, /INSERT INTO palpites/);
  assert.match(c.texto, /ON CONFLICT \(jogo_id, usuario_id\)/);
  assert.deepEqual(c.params, ['J1', 'u1', 'Ana', 2, 1]);
});

test('palpitesDoJogo mapeia as linhas para o formato interno', async () => {
  const consulta = consultaFake([[
    { jogo_id: 'J1', usuario_id: 'u1', apelido: 'Ana', placar_brasil: 2, placar_adversario: 1 },
  ]]);
  const linhas = await criarDb(consulta).palpitesDoJogo('J1');
  assert.deepEqual(linhas, [
    { jogoId: 'J1', usuarioId: 'u1', apelido: 'Ana', placarBrasil: 2, placarAdversario: 1 },
  ]);
  assert.deepEqual(consulta.chamadas[0].params, ['J1']);
});

test('todosPalpites mapeia todas as linhas', async () => {
  const consulta = consultaFake([[
    { jogo_id: 'J1', usuario_id: 'u1', apelido: 'Ana', placar_brasil: 2, placar_adversario: 1 },
    { jogo_id: 'J2', usuario_id: 'u2', apelido: 'Beto', placar_brasil: 0, placar_adversario: 0 },
  ]]);
  const linhas = await criarDb(consulta).todosPalpites();
  assert.equal(linhas.length, 2);
  assert.equal(linhas[1].apelido, 'Beto');
});
