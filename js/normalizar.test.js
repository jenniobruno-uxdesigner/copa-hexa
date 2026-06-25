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
