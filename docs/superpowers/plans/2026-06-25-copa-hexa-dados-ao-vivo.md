# Copa pra Leigos — Plano 2: Dados ao vivo

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar os dados mock por dados reais da Copa: uma função serverless na Vercel busca a API football-data.org, normaliza para o contrato interno do site, e cai num arquivo manual de segurança quando a API falha.

**Architecture:** A lógica de normalização (raw football-data.org → contrato interno) vive em `js/normalizar.js`, módulo puro e testado com fixtures de respostas reais. A função serverless `api/dados.js` busca os 3 endpoints, chama `montarDados()`, faz cache curto e, em qualquer erro, devolve `dados-manual.json`. O front-end (`app.js`) passa a consumir `/api/dados`, com fallback para o fixture local quando rodando estático (sem serverless).

**Tech Stack:** Vercel Serverless Functions (Node ESM, `export default handler`), `fetch` global (Node 24), football-data.org v4 (header `X-Auth-Token`, competição `WC`), `node --test`.

> **Git:** repositório `copa-hexa/`, já configurado com autor `jenni.o.bruno@gmail.com` (exigência do Vercel Hobby). Não altere a config. Branch de trabalho será criada pelo controlador.

## Contrato interno (atualizado)

A partir deste plano, `/api/dados` e o fixture devolvem este formato. A novidade é o campo `estado` (antes derivado no `app.js`):

```json
{
  "atualizadoEm": "ISO-8601",
  "fonte": "api | manual",
  "estado": {
    "situacao": "grupos | mata-mata | eliminado | campeao",
    "posicaoGrupo": 1,
    "vagasNoGrupo": 2,
    "classificadoGarantido": false,
    "proximoAdversario": "Sérvia"
  },
  "proximoJogo": { "id": "...", "adversario": "Sérvia", "data": "ISO", "fase": "...", "encerrado": false, "placarBrasil": null, "placarAdversario": null },
  "grupo": { "nome": "Grupo G", "times": [ { "nome": "Brasil", "posicao": 1, "pontos": 3, "jogos": 1, "saldo": 2 } ] },
  "artilheiros": [ { "nome": "...", "time": "Brasil", "gols": 2 } ]
}
```

## File Structure

```
copa-hexa/
  js/
    normalizar.js          # raw football-data.org -> contrato interno (puro)
    normalizar.test.js
    app.js                 # MODIFICADO: consome /api/dados com fallback p/ fixture
  api/
    dados.js               # serverless: fetch + montarDados + cache + fallback
    dados.test.js          # testa handler com fetch e fs mockados
  dados-manual.json        # NOVO: rede de segurança (contrato interno, em PT)
  fixtures/
    estado-mock.json       # MODIFICADO: ganha o campo "estado"
    raw-football-data.json # NOVO: amostra de resposta crua p/ testes
  README.md                # NOVO: como rodar e variáveis de ambiente
```

---

## Task 1: Normalização — mapeadores (`js/normalizar.js`)

**Files:**
- Create: `copa-hexa/js/normalizar.js`
- Test: `copa-hexa/js/normalizar.test.js`

Converte respostas cruas da football-data.org para o contrato interno. O Brasil
vem como `"Brazil"` na API (nomes em inglês); traduzimos para exibição.

- [ ] **Step 1: Escrever os testes que falham**

```js
// js/normalizar.test.js
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
```

- [ ] **Step 2: Rodar para confirmar que falha**

Run: `cd "C:/Users/jenni/Downloads/Sites/copa-hexa" && node --test js/normalizar.test.js`
Expected: FAIL — `Cannot find module './normalizar.js'`.

- [ ] **Step 3: Implementar `js/normalizar.js`** (parte 1 — mapeadores)

```js
// js/normalizar.js
const TIME_BRASIL = 'Brazil';

const TRADUCAO_TIMES = {
  Brazil: 'Brasil',
  Serbia: 'Sérvia',
  Switzerland: 'Suíça',
  Cameroon: 'Camarões',
  Argentina: 'Argentina',
  France: 'França',
  Spain: 'Espanha',
  Germany: 'Alemanha',
  England: 'Inglaterra',
  Portugal: 'Portugal',
};

const FASES = {
  GROUP_STAGE: 'Fase de grupos',
  LAST_16: 'Oitavas de final',
  QUARTER_FINALS: 'Quartas de final',
  SEMI_FINALS: 'Semifinal',
  THIRD_PLACE: 'Disputa de 3º lugar',
  FINAL: 'Final',
};

const PENDENTES = new Set(['SCHEDULED', 'TIMED', 'IN_PLAY', 'PAUSED']);

export function traduzTime(nome) {
  return TRADUCAO_TIMES[nome] || nome;
}

export function traduzFase(stage, group) {
  const base = FASES[stage] || stage;
  if (group) {
    return `${base} - ${group.replace('GROUP_', 'Grupo ')}`;
  }
  return base;
}

export function proximoJogoDoBrasil(matchesRaw) {
  const jogos = (matchesRaw.matches || [])
    .filter((m) => m.homeTeam.name === TIME_BRASIL || m.awayTeam.name === TIME_BRASIL)
    .filter((m) => PENDENTES.has(m.status))
    .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));

  const m = jogos[0];
  if (!m) return null;

  const ehCasa = m.homeTeam.name === TIME_BRASIL;
  const adversarioRaw = ehCasa ? m.awayTeam.name : m.homeTeam.name;
  return {
    id: m.id != null ? String(m.id) : `${m.homeTeam.name}-${m.awayTeam.name}-${m.utcDate}`,
    adversario: traduzTime(adversarioRaw),
    data: m.utcDate,
    fase: traduzFase(m.stage, m.group),
    encerrado: false,
    placarBrasil: null,
    placarAdversario: null,
  };
}

export function grupoDoBrasil(standingsRaw) {
  const totais = (standingsRaw.standings || []).filter((s) => s.type === 'TOTAL');
  const entrada = totais.find((s) =>
    (s.table || []).some((r) => r.team.name === TIME_BRASIL)
  );
  if (!entrada) return null;

  return {
    nome: entrada.group ? entrada.group.replace('GROUP_', 'Grupo ') : 'Grupo do Brasil',
    times: entrada.table.map((r) => ({
      nome: traduzTime(r.team.name),
      posicao: r.position,
      pontos: r.points,
      jogos: r.playedGames,
      saldo: r.goalDifference,
    })),
  };
}

export function artilheiros(scorersRaw, limite = 5) {
  const lista = (scorersRaw.scorers || []).map((s) => ({
    nome: s.player.name,
    time: traduzTime(s.team.name),
    gols: s.goals,
  }));
  const brasileiros = lista.filter((s) => s.time === 'Brasil');
  return (brasileiros.length ? brasileiros : lista).slice(0, limite);
}
```

- [ ] **Step 4: Rodar para confirmar que passa**

Run: `cd "C:/Users/jenni/Downloads/Sites/copa-hexa" && node --test js/normalizar.test.js`
Expected: PASS — 7 testes.

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/jenni/Downloads/Sites/copa-hexa"
git add js/normalizar.js js/normalizar.test.js
git commit -m "feat: mapeadores de normalização da football-data.org"
```

---

## Task 2: Normalização — estado e composição (`js/normalizar.js`)

**Files:**
- Modify: `copa-hexa/js/normalizar.js` (adiciona `derivarEstado` e `montarDados`)
- Modify: `copa-hexa/js/normalizar.test.js` (adiciona testes)

`derivarEstado` deduz a situação do Brasil (grupos / mata-mata / eliminado /
campeao) a partir dos jogos e do grupo. `montarDados` compõe o contrato inteiro.

- [ ] **Step 1: Acrescentar os testes que falham** (no fim de `js/normalizar.test.js`)

```js
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
```

- [ ] **Step 2: Rodar para confirmar que falha**

Run: `cd "C:/Users/jenni/Downloads/Sites/copa-hexa" && node --test js/normalizar.test.js`
Expected: FAIL — `derivarEstado is not exported` / `montarDados is not exported`.

- [ ] **Step 3: Acrescentar a `js/normalizar.js`** (no fim do arquivo)

```js
const FINALIZADOS = new Set(['FINISHED', 'AWARDED']);

function jogosDoBrasil(matchesRaw) {
  return (matchesRaw.matches || [])
    .filter((m) => m.homeTeam.name === TIME_BRASIL || m.awayTeam.name === TIME_BRASIL)
    .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
}

function brasilVenceu(m) {
  const ehCasa = m.homeTeam.name === TIME_BRASIL;
  const w = m.score.winner;
  if (w === 'HOME_TEAM') return ehCasa;
  if (w === 'AWAY_TEAM') return !ehCasa;
  const pen = m.score.penalties;
  if (pen && pen.home != null && pen.away != null) {
    return ehCasa ? pen.home > pen.away : pen.away > pen.home;
  }
  return false;
}

export function derivarEstado(grupo, proximoJogo, matchesRaw, vagasNoGrupo = 2) {
  const jogos = jogosDoBrasil(matchesRaw);
  const brasil = grupo ? grupo.times.find((t) => t.nome === 'Brasil') : null;
  const base = {
    posicaoGrupo: brasil ? brasil.posicao : 99,
    vagasNoGrupo,
    classificadoGarantido: false,
    proximoAdversario: proximoJogo ? proximoJogo.adversario : null,
  };

  if (jogos.some((m) => m.stage === 'FINAL' && FINALIZADOS.has(m.status) && brasilVenceu(m))) {
    return { ...base, situacao: 'campeao' };
  }

  const pendentes = jogos.filter((m) => !FINALIZADOS.has(m.status));

  if (pendentes.some((m) => m.stage !== 'GROUP_STAGE')) {
    return { ...base, situacao: 'mata-mata' };
  }

  const perdeuMataMata = jogos.some(
    (m) => m.stage !== 'GROUP_STAGE' && FINALIZADOS.has(m.status) && !brasilVenceu(m)
  );
  if (perdeuMataMata && pendentes.length === 0) {
    return { ...base, situacao: 'eliminado' };
  }

  if (pendentes.length === 0 && base.posicaoGrupo > vagasNoGrupo) {
    return { ...base, situacao: 'eliminado' };
  }

  return { ...base, situacao: 'grupos' };
}

export function montarDados(raw, agora = new Date()) {
  const grupo = grupoDoBrasil(raw.standings || {});
  const proximoJogo = proximoJogoDoBrasil(raw.matches || {});
  const estado = derivarEstado(grupo, proximoJogo, raw.matches || {});
  return {
    atualizadoEm: agora.toISOString(),
    fonte: 'api',
    estado,
    proximoJogo,
    grupo,
    artilheiros: artilheiros(raw.scorers || {}),
  };
}
```

- [ ] **Step 4: Rodar para confirmar que passa**

Run: `cd "C:/Users/jenni/Downloads/Sites/copa-hexa" && node --test js/normalizar.test.js`
Expected: PASS — 14 testes (7 da Task 1 + 7 novos).

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/jenni/Downloads/Sites/copa-hexa"
git add js/normalizar.js js/normalizar.test.js
git commit -m "feat: derivação de estado e composição do contrato (montarDados)"
```

---

## Task 3: Atualizar contrato no front-end e fallback manual

**Files:**
- Modify: `copa-hexa/fixtures/estado-mock.json` (adiciona `estado`)
- Create: `copa-hexa/dados-manual.json`
- Modify: `copa-hexa/js/app.js`

Verificação visual via preview (com fallback para o fixture, já que o serverless
não roda no http-server estático).

- [ ] **Step 1: Atualizar `fixtures/estado-mock.json`** — adicionar o bloco `estado` logo após `"fonte": "manual",`:

```json
  "estado": {
    "situacao": "grupos",
    "posicaoGrupo": 1,
    "vagasNoGrupo": 2,
    "classificadoGarantido": false,
    "proximoAdversario": "Sérvia"
  },
```

O arquivo final deve ser um JSON válido com as chaves nesta ordem:
`atualizadoEm`, `fonte`, `estado`, `proximoJogo`, `grupo`, `artilheiros`
(os outros campos permanecem como já estão).

- [ ] **Step 2: Criar `dados-manual.json`** (cópia em PT do contrato, editável à mão quando a API cair)

```json
{
  "atualizadoEm": "2026-06-25T12:00:00Z",
  "fonte": "manual",
  "estado": {
    "situacao": "grupos",
    "posicaoGrupo": 1,
    "vagasNoGrupo": 2,
    "classificadoGarantido": false,
    "proximoAdversario": "Sérvia"
  },
  "proximoJogo": {
    "id": "BRA-SRB-2026-06-28",
    "adversario": "Sérvia",
    "data": "2026-06-28T19:00:00Z",
    "fase": "Fase de grupos - Grupo G",
    "encerrado": false,
    "placarBrasil": null,
    "placarAdversario": null
  },
  "grupo": {
    "nome": "Grupo G",
    "times": [
      { "nome": "Brasil", "posicao": 1, "pontos": 3, "jogos": 1, "saldo": 2 },
      { "nome": "Suíça", "posicao": 2, "pontos": 3, "jogos": 1, "saldo": 1 },
      { "nome": "Sérvia", "posicao": 3, "pontos": 0, "jogos": 1, "saldo": -1 },
      { "nome": "Camarões", "posicao": 4, "pontos": 0, "jogos": 1, "saldo": -2 }
    ]
  },
  "artilheiros": [
    { "nome": "Vinícius Jr.", "time": "Brasil", "gols": 2 },
    { "nome": "Rodrygo", "time": "Brasil", "gols": 1 }
  ]
}
```

- [ ] **Step 3: Reescrever `js/app.js`** para consumir `/api/dados` com fallback ao fixture e usar `dados.estado` (remove `estadoDoBrasil`):

```js
// js/app.js
import * as render from './render.js';

async function carregarDados() {
  try {
    const r = await fetch('/api/dados');
    if (!r.ok) throw new Error(`/api/dados respondeu ${r.status}`);
    return await r.json();
  } catch {
    // Fallback para dev estático (sem serverless): usa o fixture local.
    const r = await fetch('./fixtures/estado-mock.json');
    return r.json();
  }
}

async function init() {
  const dados = await carregarDados();
  render.renderTermometro(document.querySelector('#termometro'), dados.estado);
  render.renderProximoJogo(document.querySelector('#proximo-jogo'), dados.proximoJogo);
  render.renderGrupo(document.querySelector('#grupo'), dados.grupo);
  render.renderCraques(document.querySelector('#craques'), dados.artilheiros);
  render.renderGlossario(document.querySelector('#glossario'));
}

init();
```

- [ ] **Step 4: Rodar a suíte completa** (garantir que nada quebrou)

Run: `cd "C:/Users/jenni/Downloads/Sites/copa-hexa" && npm test`
Expected: PASS — 34 testes (20 anteriores + 14 de normalização).

- [ ] **Step 5: Verificar no preview** (controlador)

- Reiniciar/recarregar o servidor `copa-hexa` (porta 3000) e a página.
- Conferir no console que NÃO há erro de JS. (Haverá um 404 de `/api/dados`
  no Network — esperado no dev estático; o fallback carrega o fixture.)
- Conferir via snapshot/eval que o termômetro ("No caminho"), próximo jogo,
  tabela e craques continuam aparecendo exatamente como antes (o `estado`
  agora vem do JSON, não mais derivado no `app.js`).

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/jenni/Downloads/Sites/copa-hexa"
git add fixtures/estado-mock.json dados-manual.json js/app.js
git commit -m "feat: front consome /api/dados com fallback e estado no contrato"
```

---

## Task 4: Função serverless (`api/dados.js`)

**Files:**
- Create: `copa-hexa/api/dados.js`
- Test: `copa-hexa/api/dados.test.js`
- Create: `copa-hexa/fixtures/raw-football-data.json`

A função busca os 3 endpoints da football-data.org, normaliza e cai no
`dados-manual.json` em qualquer erro. O teste usa `fetch` global mockado (sem
rede) e cobre o caminho de sucesso e o de fallback.

- [ ] **Step 1: Criar fixture cru `fixtures/raw-football-data.json`** (amostra mínima das 3 respostas)

```json
{
  "standings": { "standings": [
    { "type": "TOTAL", "group": "GROUP_G", "table": [
      { "position": 1, "team": { "name": "Brazil" }, "points": 6, "playedGames": 2, "goalDifference": 3 },
      { "position": 2, "team": { "name": "Switzerland" }, "points": 3, "playedGames": 2, "goalDifference": 0 }
    ] }
  ] },
  "matches": { "matches": [
    { "id": 100, "homeTeam": { "name": "Brazil" }, "awayTeam": { "name": "Serbia" }, "utcDate": "2026-06-28T19:00:00Z", "status": "TIMED", "stage": "GROUP_STAGE", "group": "GROUP_G", "score": { "fullTime": { "home": null, "away": null }, "winner": null, "penalties": null } }
  ] },
  "scorers": { "scorers": [
    { "player": { "name": "Vinicius" }, "team": { "name": "Brazil" }, "goals": 3 }
  ] }
}
```

- [ ] **Step 2: Escrever o teste que falha `api/dados.test.js`**

```js
// api/dados.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import handler from './dados.js';

const raw = JSON.parse(
  await readFile(new URL('../fixtures/raw-football-data.json', import.meta.url), 'utf-8')
);

function resFake() {
  return {
    statusCode: null,
    headers: {},
    body: null,
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(obj) { this.body = obj; return this; },
  };
}

test('com API_KEY e fetch ok, devolve dados normalizados (fonte api)', async () => {
  process.env.API_KEY = 'chave-teste';
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    const corpo = url.includes('/standings') ? raw.standings
      : url.includes('/matches') ? raw.matches
      : raw.scorers;
    return { ok: true, status: 200, json: async () => corpo };
  };
  try {
    const res = resFake();
    await handler({}, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.fonte, 'api');
    assert.equal(res.body.grupo.nome, 'Grupo G');
    assert.equal(res.body.proximoJogo.adversario, 'Sérvia');
    assert.equal(res.body.estado.situacao, 'grupos');
  } finally {
    global.fetch = originalFetch;
  }
});

test('quando o fetch falha, cai para o fallback manual (fonte manual)', async () => {
  process.env.API_KEY = 'chave-teste';
  const originalFetch = global.fetch;
  global.fetch = async () => { throw new Error('rede fora'); };
  try {
    const res = resFake();
    await handler({}, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.fonte, 'manual');
    assert.ok(res.body.grupo);
  } finally {
    global.fetch = originalFetch;
  }
});

test('sem API_KEY, cai para o fallback manual', async () => {
  delete process.env.API_KEY;
  const res = resFake();
  await handler({}, res);
  assert.equal(res.body.fonte, 'manual');
});
```

- [ ] **Step 3: Rodar para confirmar que falha**

Run: `cd "C:/Users/jenni/Downloads/Sites/copa-hexa" && node --test api/dados.test.js`
Expected: FAIL — `Cannot find module './dados.js'`.

- [ ] **Step 4: Implementar `api/dados.js`**

```js
// api/dados.js
import { readFile } from 'node:fs/promises';
import { montarDados } from '../js/normalizar.js';

const BASE = 'https://api.football-data.org/v4';
const COMPETICAO = 'WC'; // código da Copa do Mundo na football-data.org

async function buscar(caminho, chave) {
  const resp = await fetch(`${BASE}/competitions/${COMPETICAO}/${caminho}`, {
    headers: { 'X-Auth-Token': chave },
  });
  if (!resp.ok) {
    throw new Error(`football-data /${caminho} respondeu ${resp.status}`);
  }
  return resp.json();
}

async function fallbackManual() {
  const conteudo = await readFile(
    new URL('../dados-manual.json', import.meta.url),
    'utf-8'
  );
  const manual = JSON.parse(conteudo);
  return { ...manual, fonte: 'manual', atualizadoEm: new Date().toISOString() };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  const chave = process.env.API_KEY;
  try {
    if (!chave) throw new Error('API_KEY ausente');
    const [standings, matches, scorers] = await Promise.all([
      buscar('standings', chave),
      buscar('matches', chave),
      buscar('scorers', chave),
    ]);
    res.status(200).json(montarDados({ standings, matches, scorers }));
  } catch (erro) {
    res.status(200).json(await fallbackManual());
  }
}
```

- [ ] **Step 5: Rodar para confirmar que passa**

Run: `cd "C:/Users/jenni/Downloads/Sites/copa-hexa" && node --test api/dados.test.js`
Expected: PASS — 3 testes.

- [ ] **Step 6: Rodar a suíte completa**

Run: `cd "C:/Users/jenni/Downloads/Sites/copa-hexa" && npm test`
Expected: PASS — 37 testes.

- [ ] **Step 7: Commit**

```bash
cd "C:/Users/jenni/Downloads/Sites/copa-hexa"
git add api/dados.js api/dados.test.js fixtures/raw-football-data.json
git commit -m "feat: função serverless /api/dados com fallback manual"
```

---

## Task 5: Documentação de deploy (`README.md`)

**Files:**
- Create: `copa-hexa/README.md`

- [ ] **Step 1: Criar `README.md`**

```markdown
# Copa pra Leigos — "Temos chance ao hexa?"

A Copa explicada pra quem quer torcer pelo Brasil sem saber nada de futebol.

## Rodar localmente

```bash
npm test        # roda os testes (node --test)
npm run dev     # site estático em http://localhost:3000
```

No `npm run dev` o site usa o fixture `fixtures/estado-mock.json` como dados
(o `/api/dados` só existe na Vercel). Para testar a função serverless de
verdade localmente, use `vercel dev` com a variável `API_KEY` definida.

## Dados ao vivo

A função `api/dados.js` busca a football-data.org (competição `WC`) e
normaliza para o contrato interno. Em qualquer falha, devolve
`dados-manual.json` (editável à mão durante a Copa).

## Variáveis de ambiente (Vercel)

- `API_KEY` — token da football-data.org (header `X-Auth-Token`).
- `DATABASE_URL` — string de conexão do Neon (usada no Plano 3, palpites).

## Deploy

Deploy na Vercel (conta Hobby). Os commits precisam ter como autor
`jenni.o.bruno@gmail.com`, senão o Vercel Hobby bloqueia o deploy.
```

- [ ] **Step 2: Commit**

```bash
cd "C:/Users/jenni/Downloads/Sites/copa-hexa"
git add README.md
git commit -m "docs: README com instruções de deploy e variáveis de ambiente"
```

---

## Self-Review (autor do plano)

- **Cobertura do spec (dados ao vivo):** API football-data.org com header e
  endpoints reais (Task 4); normalização raw→contrato (Tasks 1–2); fallback
  manual `dados-manual.json` (Tasks 3–4); front consumindo `/api/dados` com
  fallback ao fixture (Task 3); cache curto na função (Task 4); termômetro
  agora alimentado por estado derivado de dados reais (Task 2). Doc de env
  vars (Task 5).
- **Placeholders:** nenhum — todo passo tem código completo.
- **Consistência de tipos:** o contrato (`estado`, `proximoJogo`, `grupo`,
  `artilheiros`) é o mesmo produzido por `montarDados`, consumido por
  `app.js` e por `render.js` (inalterado do Plano 1); `dados.estado` casa com
  o formato que `statusHexa` espera (`situacao`, `posicaoGrupo`,
  `vagasNoGrupo`, `classificadoGarantido`, `proximoAdversario`).
- **Riscos (confirmar no deploy real, com chave):** (1) código `WC` e
  disponibilidade da Copa 2026 no plano grátis da football-data.org; (2)
  valores reais de `stage`/`group`/`status` podem exigir ajuste dos mapas;
  (3) `classificadoGarantido` fica sempre `false` neste plano (refinamento
  futuro — exige cálculo de cenários restantes); (4) `derivarEstado` trata
  empate em mata-mata sem pênaltis como derrota (raro; football-data traz
  `winner`/`penalties`).
```
