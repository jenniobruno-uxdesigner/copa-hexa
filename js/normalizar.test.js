import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  traduzTime,
  traduzFase,
  proximoJogoDoBrasil,
  grupoDoBrasil,
  artilheiros,
} from './normalizar.js';

test('traduz times conhecidos e mantém o original quando desconhecido', () => {
  assert.equal(traduzTime('Brazil'), 'Brasil');
  assert.equal(traduzTime('Serbia'), 'Sérvia');
  assert.equal(traduzTime('Narnia'), 'Narnia');
});

test('traduz a fase com e sem grupo', () => {
  assert.equal(traduzFase('GROUP_STAGE', 'GROUP_G'), 'Fase de grupos - Grupo G');
  assert.equal(traduzFase('LAST_16', null), 'Oitavas de final');
});

test('traduz a rodada de 32 (LAST_32) de forma amigável', () => {
  assert.equal(traduzFase('LAST_32', null), 'Mata-mata (rodada de 32)');
});

test('traduz seleções como Japão e Coreia do Sul', () => {
  assert.equal(traduzTime('Japan'), 'Japão');
  assert.equal(traduzTime('South Korea'), 'Coreia do Sul');
});

test('próximo jogo do Brasil é o pendente mais próximo, traduzido', () => {
  const raw = {
    matches: [
      { id: 1, homeTeam: { name: 'Brazil' }, awayTeam: { name: 'Serbia' }, utcDate: '2026-06-28T19:00:00Z', status: 'TIMED', stage: 'GROUP_STAGE', group: 'GROUP_G', score: { fullTime: { home: null, away: null } } },
      { id: 2, homeTeam: { name: 'Brazil' }, awayTeam: { name: 'Switzerland' }, utcDate: '2026-07-02T19:00:00Z', status: 'SCHEDULED', stage: 'GROUP_STAGE', group: 'GROUP_G', score: { fullTime: { home: null, away: null } } },
      { id: 3, homeTeam: { name: 'Brazil' }, awayTeam: { name: 'Cameroon' }, utcDate: '2026-06-24T19:00:00Z', status: 'FINISHED', stage: 'GROUP_STAGE', group: 'GROUP_G', score: { fullTime: { home: 2, away: 0 } } },
    ],
  };
  const pj = proximoJogoDoBrasil(raw);
  assert.equal(pj.adversario, 'Sérvia');
  assert.equal(pj.data, '2026-06-28T19:00:00Z');
  assert.equal(pj.fase, 'Fase de grupos - Grupo G');
  assert.equal(pj.encerrado, false);
});

test('próximo jogo é null quando não há jogo pendente', () => {
  const raw = { matches: [
    { id: 9, homeTeam: { name: 'Brazil' }, awayTeam: { name: 'Cameroon' }, utcDate: '2026-06-24T19:00:00Z', status: 'FINISHED', stage: 'GROUP_STAGE', group: 'GROUP_G', score: { fullTime: { home: 2, away: 0 } } },
  ] };
  assert.equal(proximoJogoDoBrasil(raw), null);
});

test('grupo do Brasil sai do standing TOTAL que contém o Brasil', () => {
  const raw = {
    standings: [
      { stage: 'GROUP_STAGE', type: 'HOME', group: 'GROUP_G', table: [] },
      { stage: 'GROUP_STAGE', type: 'TOTAL', group: 'GROUP_A', table: [ { position: 1, team: { name: 'France' }, points: 9, playedGames: 3, goalDifference: 5 } ] },
      { stage: 'GROUP_STAGE', type: 'TOTAL', group: 'GROUP_G', table: [
        { position: 1, team: { name: 'Brazil' }, points: 6, playedGames: 2, goalDifference: 3 },
        { position: 2, team: { name: 'Switzerland' }, points: 3, playedGames: 2, goalDifference: 0 },
      ] },
    ],
  };
  const g = grupoDoBrasil(raw);
  assert.equal(g.nome, 'Grupo G');
  assert.equal(g.times.length, 2);
  assert.equal(g.times[0].nome, 'Brasil');
  assert.equal(g.times[0].posicao, 1);
  assert.equal(g.times[0].saldo, 3);
});

test('artilheiros prioriza brasileiros e limita a 5', () => {
  const raw = { scorers: [
    { player: { name: 'Jogador A' }, team: { name: 'France' }, goals: 5 },
    { player: { name: 'Vinicius' }, team: { name: 'Brazil' }, goals: 3 },
    { player: { name: 'Rodrygo' }, team: { name: 'Brazil' }, goals: 2 },
  ] };
  const a = artilheiros(raw);
  assert.equal(a.length, 2);
  assert.equal(a[0].nome, 'Vinicius');
  assert.equal(a[0].time, 'Brasil');
});

test('artilheiros cai para a lista geral quando não há brasileiro', () => {
  const raw = { scorers: [
    { player: { name: 'Jogador A' }, team: { name: 'France' }, goals: 5 },
    { player: { name: 'Jogador B' }, team: { name: 'Spain' }, goals: 4 },
  ] };
  const a = artilheiros(raw);
  assert.equal(a.length, 2);
  assert.equal(a[0].nome, 'Jogador A');
});

import { derivarEstado, montarDados } from './normalizar.js';

const grupoBrasil1o = { nome: 'Grupo G', times: [
  { nome: 'Brasil', posicao: 1, pontos: 6, jogos: 2, saldo: 3 },
  { nome: 'Suíça', posicao: 2, pontos: 3, jogos: 2, saldo: 0 },
] };
const grupoBrasil3o = { nome: 'Grupo G', times: [
  { nome: 'Suíça', posicao: 1, pontos: 6, jogos: 3, saldo: 4 },
  { nome: 'Sérvia', posicao: 2, pontos: 4, jogos: 3, saldo: 1 },
  { nome: 'Brasil', posicao: 3, pontos: 3, jogos: 3, saldo: -1 },
] };

function jogoBrasil(over) {
  return { homeTeam: { name: 'Brazil' }, awayTeam: { name: 'Serbia' }, utcDate: '2026-06-28T19:00:00Z', status: 'TIMED', stage: 'GROUP_STAGE', group: 'GROUP_G', score: { fullTime: { home: null, away: null }, winner: null, penalties: null }, ...over };
}

test('estado: ainda na fase de grupos com jogo pendente', () => {
  const matches = { matches: [jogoBrasil({})] };
  const e = derivarEstado(grupoBrasil1o, { adversario: 'Sérvia' }, matches);
  assert.equal(e.situacao, 'grupos');
  assert.equal(e.posicaoGrupo, 1);
  assert.equal(e.proximoAdversario, 'Sérvia');
});

test('estado: mata-mata quando há jogo de mata-mata pela frente', () => {
  const matches = { matches: [jogoBrasil({ stage: 'LAST_16', status: 'TIMED' })] };
  const e = derivarEstado(grupoBrasil1o, { adversario: 'Sérvia' }, matches);
  assert.equal(e.situacao, 'mata-mata');
});

test('estado: campeão quando venceu a final', () => {
  const matches = { matches: [jogoBrasil({ stage: 'FINAL', status: 'FINISHED', score: { fullTime: { home: 2, away: 1 }, winner: 'HOME_TEAM', penalties: null } })] };
  const e = derivarEstado(grupoBrasil1o, null, matches);
  assert.equal(e.situacao, 'campeao');
});

test('estado: campeão venceu a final nos pênaltis', () => {
  const matches = { matches: [jogoBrasil({ stage: 'FINAL', status: 'FINISHED', score: { fullTime: { home: 1, away: 1 }, winner: 'DRAW', penalties: { home: 4, away: 2 } } })] };
  const e = derivarEstado(grupoBrasil1o, null, matches);
  assert.equal(e.situacao, 'campeao');
});

test('estado: eliminado ao perder no mata-mata sem mais jogos', () => {
  const matches = { matches: [jogoBrasil({ stage: 'LAST_16', status: 'FINISHED', score: { fullTime: { home: 0, away: 1 }, winner: 'AWAY_TEAM', penalties: null } })] };
  const e = derivarEstado(grupoBrasil1o, null, matches);
  assert.equal(e.situacao, 'eliminado');
});

test('estado: eliminado na fase de grupos (fora das vagas, sem jogos)', () => {
  const matches = { matches: [jogoBrasil({ status: 'FINISHED', score: { fullTime: { home: 0, away: 1 }, winner: 'AWAY_TEAM', penalties: null } })] };
  const e = derivarEstado(grupoBrasil3o, null, matches);
  assert.equal(e.situacao, 'eliminado');
});

test('estado: perdeu a semi mas venceu o 3º lugar NÃO é eliminado', () => {
  const matches = { matches: [
    jogoBrasil({ stage: 'SEMI_FINALS', utcDate: '2026-07-14T19:00:00Z', status: 'FINISHED', score: { fullTime: { home: 1, away: 2 }, winner: 'AWAY_TEAM', penalties: null } }),
    jogoBrasil({ stage: 'THIRD_PLACE', utcDate: '2026-07-18T19:00:00Z', status: 'FINISHED', score: { fullTime: { home: 3, away: 1 }, winner: 'HOME_TEAM', penalties: null } }),
  ] };
  const e = derivarEstado(grupoBrasil1o, null, matches);
  assert.notEqual(e.situacao, 'eliminado');
  assert.equal(e.situacao, 'mata-mata');
});

test('estado: campeão jogando como visitante (winner AWAY_TEAM)', () => {
  const matches = { matches: [jogoBrasil({ homeTeam: { name: 'Argentina' }, awayTeam: { name: 'Brazil' }, stage: 'FINAL', status: 'FINISHED', score: { fullTime: { home: 0, away: 1 }, winner: 'AWAY_TEAM', penalties: null } })] };
  const e = derivarEstado(grupoBrasil1o, null, matches);
  assert.equal(e.situacao, 'campeao');
});

test('estado: mata-mata finalizado com resultado indefinido não vira eliminado', () => {
  const matches = { matches: [jogoBrasil({ stage: 'LAST_16', status: 'FINISHED', score: { fullTime: { home: 1, away: 1 }, winner: null, penalties: null } })] };
  const e = derivarEstado(grupoBrasil1o, null, matches);
  assert.notEqual(e.situacao, 'eliminado');
});

test('montarDados com entrada vazia devolve um contrato válido', () => {
  const d = montarDados({});
  assert.equal(d.fonte, 'api');
  assert.equal(d.proximoJogo, null);
  assert.equal(d.grupo, null);
  assert.deepEqual(d.artilheiros, []);
  assert.equal(d.estado.situacao, 'grupos');
});

test('montarDados compõe o contrato completo com fonte api', () => {
  const raw = {
    standings: { standings: [ { type: 'TOTAL', group: 'GROUP_G', table: [
      { position: 1, team: { name: 'Brazil' }, points: 6, playedGames: 2, goalDifference: 3 },
    ] } ] },
    matches: { matches: [jogoBrasil({})] },
    scorers: { scorers: [ { player: { name: 'Vinicius' }, team: { name: 'Brazil' }, goals: 3 } ] },
  };
  const d = montarDados(raw, new Date('2026-06-25T12:00:00Z'));
  assert.equal(d.fonte, 'api');
  assert.equal(d.atualizadoEm, '2026-06-25T12:00:00.000Z');
  assert.equal(d.estado.situacao, 'grupos');
  assert.equal(d.proximoJogo.adversario, 'Sérvia');
  assert.equal(d.grupo.nome, 'Grupo G');
  assert.equal(d.artilheiros[0].nome, 'Vinicius');
});

import { montarResultados } from './normalizar.js';

test('montarResultados mapeia jogos encerrados do Brasil (casa e fora)', () => {
  const raw = { matches: [
    { id: 100, homeTeam: { name: 'Brazil' }, awayTeam: { name: 'Serbia' }, status: 'FINISHED', stage: 'GROUP_STAGE', utcDate: '2026-06-24T19:00:00Z', score: { fullTime: { home: 2, away: 0 } } },
    { id: 101, homeTeam: { name: 'Switzerland' }, awayTeam: { name: 'Brazil' }, status: 'FINISHED', stage: 'GROUP_STAGE', utcDate: '2026-06-28T19:00:00Z', score: { fullTime: { home: 1, away: 3 } } },
    { id: 102, homeTeam: { name: 'Brazil' }, awayTeam: { name: 'Cameroon' }, status: 'TIMED', stage: 'GROUP_STAGE', utcDate: '2026-07-02T19:00:00Z', score: { fullTime: { home: null, away: null } } },
    { id: 200, homeTeam: { name: 'France' }, awayTeam: { name: 'Spain' }, status: 'FINISHED', stage: 'GROUP_STAGE', utcDate: '2026-06-24T19:00:00Z', score: { fullTime: { home: 1, away: 1 } } },
  ] };
  const r = montarResultados(raw);
  assert.deepEqual(r['100'], { placarBrasil: 2, placarAdversario: 0 });
  assert.deepEqual(r['101'], { placarBrasil: 3, placarAdversario: 1 });
  assert.equal(r['102'], undefined);
  assert.equal(r['200'], undefined);
});

test('montarResultados com entrada vazia devolve objeto vazio', () => {
  assert.deepEqual(montarResultados({}), {});
});

import { jogosPassadosDoBrasil } from './normalizar.js';

test('jogosPassadosDoBrasil lista só os encerrados do Brasil, do mais antigo ao recente', () => {
  const raw = { matches: [
    { id: 1, homeTeam: { name: 'Brazil' }, awayTeam: { name: 'Serbia' }, status: 'TIMED', stage: 'GROUP_STAGE', group: 'GROUP_G', utcDate: '2026-06-28T19:00:00Z', score: { fullTime: { home: null, away: null }, winner: null } },
    { id: 2, homeTeam: { name: 'Brazil' }, awayTeam: { name: 'Cameroon' }, status: 'FINISHED', stage: 'GROUP_STAGE', group: 'GROUP_G', utcDate: '2026-06-24T19:00:00Z', score: { fullTime: { home: 2, away: 0 }, winner: 'HOME_TEAM' } },
    { id: 3, homeTeam: { name: 'Switzerland' }, awayTeam: { name: 'Brazil' }, status: 'FINISHED', stage: 'GROUP_STAGE', group: 'GROUP_G', utcDate: '2026-06-20T19:00:00Z', score: { fullTime: { home: 1, away: 1 }, winner: 'DRAW' } },
    { id: 9, homeTeam: { name: 'France' }, awayTeam: { name: 'Spain' }, status: 'FINISHED', stage: 'GROUP_STAGE', group: 'GROUP_A', utcDate: '2026-06-22T19:00:00Z', score: { fullTime: { home: 0, away: 0 }, winner: 'DRAW' } },
  ] };
  const jogos = jogosPassadosDoBrasil(raw);
  assert.equal(jogos.length, 2);
  // mais antigo primeiro: empate fora contra a Suíça
  assert.equal(jogos[0].adversario, 'Suíça');
  assert.equal(jogos[0].placarBrasil, 1);
  assert.equal(jogos[0].placarAdversario, 1);
  assert.equal(jogos[0].resultado, 'empate');
  // vitória em casa sobre Camarões
  assert.equal(jogos[1].adversario, 'Camarões');
  assert.equal(jogos[1].placarBrasil, 2);
  assert.equal(jogos[1].placarAdversario, 0);
  assert.equal(jogos[1].resultado, 'vitoria');
});

test('jogosPassadosDoBrasil marca derrota como visitante', () => {
  const raw = { matches: [
    { id: 5, homeTeam: { name: 'Argentina' }, awayTeam: { name: 'Brazil' }, status: 'FINISHED', stage: 'LAST_16', utcDate: '2026-07-05T19:00:00Z', score: { fullTime: { home: 2, away: 1 }, winner: 'HOME_TEAM' } },
  ] };
  const jogos = jogosPassadosDoBrasil(raw);
  assert.equal(jogos[0].adversario, 'Argentina');
  assert.equal(jogos[0].placarBrasil, 1);
  assert.equal(jogos[0].placarAdversario, 2);
  assert.equal(jogos[0].resultado, 'derrota');
  assert.equal(jogos[0].fase, 'Oitavas de final');
});

test('jogosPassadosDoBrasil vazio quando não há jogos encerrados', () => {
  assert.deepEqual(jogosPassadosDoBrasil({}), []);
});
