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
  assert.deepEqual(c.params, ['J1', 'u1', 'Ana', 2, 1, null]);
});

test('salvarPalpite grava conta_id quando logado', async () => {
  const consulta = consultaFake();
  await criarDb(consulta).salvarPalpite({ jogoId: 'J1', usuarioId: 'conta-5', apelido: 'Ana', placarBrasil: 2, placarAdversario: 1, contaId: 5 });
  assert.equal(consulta.chamadas[0].params[5], 5);
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

function consultaU(linhasPorChamada = []) {
  const chamadas = [];
  let i = 0;
  const fn = async (texto, params) => {
    chamadas.push({ texto, params });
    return linhasPorChamada[i++] ?? [];
  };
  fn.chamadas = chamadas;
  return fn;
}

test('garantirEsquemaUsuarios cria a tabela usuarios', async () => {
  const c = consultaU();
  await criarDb(c).garantirEsquemaUsuarios();
  assert.match(c.chamadas[0].texto, /CREATE TABLE IF NOT EXISTS usuarios/);
});

test('criarUsuarioPin insere e mapeia o perfil', async () => {
  const c = consultaU([[{ id: 1, nome: 'Ana', foto_url: null }]]);
  const u = await criarDb(c).criarUsuarioPin({ nome: 'Ana', usernameLc: 'ana', pinHash: 'sal:hash' });
  assert.match(c.chamadas[0].texto, /INSERT INTO usuarios/);
  assert.deepEqual(c.chamadas[0].params, ['Ana', 'ana', 'sal:hash']);
  assert.deepEqual(u, { id: 1, nome: 'Ana', foto: null });
});

test('buscarPorUsername devolve perfil + pinHash', async () => {
  const c = consultaU([[{ id: 1, nome: 'Ana', foto_url: null, pin_hash: 'sal:hash' }]]);
  const u = await criarDb(c).buscarPorUsername('ana');
  assert.deepEqual(c.chamadas[0].params, ['ana']);
  assert.equal(u.pinHash, 'sal:hash');
  assert.equal(u.nome, 'Ana');
});

test('buscarPorUsername devolve null quando não acha', async () => {
  const c = consultaU([[]]);
  assert.equal(await criarDb(c).buscarPorUsername('ninguem'), null);
});

test('acharOuCriarGoogle faz upsert por google_sub', async () => {
  const c = consultaU([[{ id: 2, nome: 'João', foto_url: 'http://x/p.png' }]]);
  const u = await criarDb(c).acharOuCriarGoogle({ googleSub: 'g-123', nome: 'João', fotoUrl: 'http://x/p.png' });
  assert.match(c.chamadas[0].texto, /ON CONFLICT \(google_sub\)/);
  assert.deepEqual(c.chamadas[0].params, ['João', 'http://x/p.png', 'g-123']);
  assert.deepEqual(u, { id: 2, nome: 'João', foto: 'http://x/p.png' });
});

test('garantirEsquema também adiciona a coluna conta_id', async () => {
  const c = consultaU();
  await criarDb(c).garantirEsquema();
  assert.match(c.chamadas[1].texto, /ADD COLUMN IF NOT EXISTS conta_id/);
});

test('palpitesDeContas junta com usuarios e mapeia nome+foto', async () => {
  const c = consultaU([[
    { jogo_id: 'J1', conta_id: 5, nome: 'Ana', foto_url: 'http://x/a.png', placar_brasil: 2, placar_adversario: 1 },
  ]]);
  const linhas = await criarDb(c).palpitesDeContas();
  assert.match(c.chamadas[0].texto, /conta_id IS NOT NULL/);
  assert.deepEqual(linhas, [
    { jogoId: 'J1', usuarioId: 5, apelido: 'Ana', foto: 'http://x/a.png', placarBrasil: 2, placarAdversario: 1 },
  ]);
});

test('garantirEsquemaPlacares cria a tabela placares_jogo', async () => {
  const c = consultaU();
  await criarDb(c).garantirEsquemaPlacares();
  assert.match(c.chamadas[0].texto, /CREATE TABLE IF NOT EXISTS placares_jogo/);
});

test('registrarResultadoJogo soma gols e mantém a melhor sequência', async () => {
  const c = consultaU();
  await criarDb(c).registrarResultadoJogo({ contaId: 5, gols: 1, sequencia: 3 });
  assert.match(c.chamadas[0].texto, /gols = placares_jogo.gols \+ EXCLUDED.gols/);
  assert.match(c.chamadas[0].texto, /GREATEST\(placares_jogo.melhor_sequencia, EXCLUDED.melhor_sequencia\)/);
  assert.deepEqual(c.chamadas[0].params, [5, 1, 3]);
});

test('rankingJogo mapeia nome, foto, gols e melhorSequencia', async () => {
  const c = consultaU([[
    { nome: 'Ana', foto_url: 'http://x/a.png', gols: 9, melhor_sequencia: 4 },
  ]]);
  const linhas = await criarDb(c).rankingJogo();
  assert.deepEqual(linhas, [{ nome: 'Ana', foto: 'http://x/a.png', gols: 9, melhorSequencia: 4 }]);
});
