# Copa pra Leigos — Plano 3: Palpites + ranking (Neon)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar a galera palpitar o placar do próximo jogo, ver a "vibe" dos palpites e um ranking dos melhores palpiteiros — tudo guardado no Neon (Postgres serverless).

**Architecture:** Lógica pura e testável em módulos `js/` (cálculo de ranking, resultados finais, acesso ao banco sobre uma função `consulta` injetável, e o serviço de palpites que orquestra validação + vibe + ranking). A função serverless `api/palpites.js` apenas conecta o Neon e a fonte de resultados a esse serviço. O front-end ganha o formulário de palpite, a vibe e o ranking na seção `#palpite`.

**Tech Stack:** Vercel Serverless Functions (Node ESM), Neon (`@neondatabase/serverless`), `node --test`. Sem login — identidade leve por `apelido` + `usuarioId` gerado no navegador (localStorage).

> **Git:** repositório `copa-hexa/`, autor `jenni.o.bruno@gmail.com` (Vercel Hobby). Não altere a config.

## Pontuação e identidade (do spec)
- Placar exato = 3 pts; só o vencedor/empate = 1 pt; erro = 0 (reusa `js/pontuacao.js`).
- Um palpite por (jogo, usuário); repalpitar antes do jogo sobrescreve.
- Sem login: `usuarioId` é um id aleatório guardado no `localStorage`.

## Esquema do banco (Neon / Postgres)
```sql
CREATE TABLE IF NOT EXISTS palpites (
  id                BIGSERIAL PRIMARY KEY,
  jogo_id           TEXT NOT NULL,
  usuario_id        TEXT NOT NULL,
  apelido           TEXT NOT NULL,
  placar_brasil     INT NOT NULL,
  placar_adversario INT NOT NULL,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (jogo_id, usuario_id)
);
```

## File Structure
```
copa-hexa/
  js/
    ranking.js           # calcularRanking(palpites, resultados) (puro)
    ranking.test.js
    db.js                # criarDb(consulta): salvar/ler palpites (puro s/ rede)
    db.test.js
    palpites-servico.js  # tratarRequisicao(req,res,{db,resultados}) (puro)
    palpites-servico.test.js
    normalizar.js        # + montarResultados(matchesRaw) (puro)
    normalizar.test.js   # + testes de montarResultados
    render.js            # + renderPalpite(...) (DOM)
    app.js               # + fluxo de palpite/vibe/ranking
  api/
    palpites.js          # wiring: Neon + resultados + serviço
  package.json           # + dependência @neondatabase/serverless
```

---

## Task 1: Ranking (`js/ranking.js`)

**Files:** Create `js/ranking.js`, `js/ranking.test.js`.

`calcularRanking(palpites, resultados)` soma os pontos por usuário, ignorando
jogos ainda não encerrados. `palpites`: lista de
`{ usuarioId, apelido, jogoId, placarBrasil, placarAdversario }`. `resultados`:
mapa `{ [jogoId]: { placarBrasil, placarAdversario } }` (só jogos encerrados).

- [ ] **Step 1: Escrever o teste que falha `js/ranking.test.js`**

```js
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
    { usuarioId: 'u1', apelido: 'Ana', jogoId: 'J1', placarBrasil: 2, placarAdversario: 1 }, // exato = 3
    { usuarioId: 'u1', apelido: 'Ana', jogoId: 'J2', placarBrasil: 1, placarAdversario: 1 }, // empate certo = 1
    { usuarioId: 'u2', apelido: 'Beto', jogoId: 'J1', placarBrasil: 3, placarAdversario: 0 }, // vencedor = 1
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
    { usuarioId: 'u1', apelido: 'Ana', jogoId: 'J1', placarBrasil: 2, placarAdversario: 1 }, // 3, acerto
    { usuarioId: 'u2', apelido: 'Beto', jogoId: 'J1', placarBrasil: 5, placarAdversario: 4 }, // 1
    { usuarioId: 'u2', apelido: 'Beto', jogoId: 'J2', placarBrasil: 9, placarAdversario: 8 }, // 0 (J2 é 0x0)
  ];
  const r = calcularRanking(palpites, resultados);
  // Ana: 3 pts / 1 acerto; Beto: 1 pt → Ana na frente
  assert.equal(r[0].apelido, 'Ana');
});
```

- [ ] **Step 2: Rodar, esperar FAIL** (`Cannot find module './ranking.js'`).

- [ ] **Step 3: Implementar `js/ranking.js`**

```js
import { pontuarPalpite } from './pontuacao.js';

export function calcularRanking(palpites, resultados) {
  const porUsuario = new Map();

  for (const p of palpites) {
    const resultado = resultados[p.jogoId];
    if (!resultado) continue; // jogo ainda não encerrado

    const pontos = pontuarPalpite(p, resultado);
    const atual = porUsuario.get(p.usuarioId) || {
      usuarioId: p.usuarioId,
      apelido: p.apelido,
      pontos: 0,
      acertos: 0,
    };
    atual.pontos += pontos;
    if (pontos === 3) atual.acertos += 1;
    atual.apelido = p.apelido; // mantém o apelido mais recente
    porUsuario.set(p.usuarioId, atual);
  }

  return [...porUsuario.values()].sort(
    (a, b) => b.pontos - a.pontos || b.acertos - a.acertos
  );
}
```

- [ ] **Step 4: Rodar, esperar PASS (4 testes).**

- [ ] **Step 5: Commit**
```bash
cd "C:/Users/jenni/Downloads/Sites/copa-hexa"
git add js/ranking.js js/ranking.test.js
git commit -m "feat: cálculo de ranking dos palpiteiros"
```

---

## Task 2: Resultados finais (`montarResultados` em `js/normalizar.js`)

**Files:** Modify `js/normalizar.js` (append), `js/normalizar.test.js` (append).

`montarResultados(matchesRaw)` mapeia os jogos do Brasil **já encerrados** para
`{ [jogoId]: { placarBrasil, placarAdversario } }`, usando o mesmo `jogoId` que
`proximoJogoDoBrasil` produz (`String(m.id)`).

- [ ] **Step 1: Acrescentar testes ao fim de `js/normalizar.test.js`**

```js
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
  assert.equal(r['102'], undefined); // ainda não encerrado
  assert.equal(r['200'], undefined); // não é jogo do Brasil
});

test('montarResultados com entrada vazia devolve objeto vazio', () => {
  assert.deepEqual(montarResultados({}), {});
});
```

- [ ] **Step 2: Rodar, esperar FAIL** (`montarResultados` não exportado).

- [ ] **Step 3: Acrescentar ao fim de `js/normalizar.js`**

```js
export function montarResultados(matchesRaw) {
  const resultados = {};
  for (const m of matchesRaw.matches || []) {
    const ehCasa = m.homeTeam && m.homeTeam.name === TIME_BRASIL;
    const ehFora = m.awayTeam && m.awayTeam.name === TIME_BRASIL;
    if (!ehCasa && !ehFora) continue;
    if (!FINALIZADOS.has(m.status)) continue;
    if (!m.score || !m.score.fullTime) continue;

    const id = m.id != null ? String(m.id) : `${m.homeTeam.name}-${m.awayTeam.name}-${m.utcDate}`;
    const ft = m.score.fullTime;
    resultados[id] = ehCasa
      ? { placarBrasil: ft.home, placarAdversario: ft.away }
      : { placarBrasil: ft.away, placarAdversario: ft.home };
  }
  return resultados;
}
```

- [ ] **Step 4: Rodar, esperar PASS** (todos os testes de normalização passam, agora com +2).

- [ ] **Step 5: Commit**
```bash
cd "C:/Users/jenni/Downloads/Sites/copa-hexa"
git add js/normalizar.js js/normalizar.test.js
git commit -m "feat: montarResultados (jogos encerrados do Brasil) para o ranking"
```

---

## Task 3: Acesso ao banco (`js/db.js`)

**Files:** Create `js/db.js`, `js/db.test.js`.

`criarDb(consulta)` recebe uma função `consulta(texto, params) => linhas` (assim
o módulo é testável sem rede; a função serverless injeta o cliente Neon). Expõe
`garantirEsquema`, `salvarPalpite`, `palpitesDoJogo`, `todosPalpites`.

- [ ] **Step 1: Escrever o teste que falha `js/db.test.js`**

```js
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
```

- [ ] **Step 2: Rodar, esperar FAIL** (`Cannot find module './db.js'`).

- [ ] **Step 3: Implementar `js/db.js`**

```js
const CRIAR_TABELA = `CREATE TABLE IF NOT EXISTS palpites (
  id                BIGSERIAL PRIMARY KEY,
  jogo_id           TEXT NOT NULL,
  usuario_id        TEXT NOT NULL,
  apelido           TEXT NOT NULL,
  placar_brasil     INT NOT NULL,
  placar_adversario INT NOT NULL,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (jogo_id, usuario_id)
)`;

const UPSERT = `INSERT INTO palpites (jogo_id, usuario_id, apelido, placar_brasil, placar_adversario)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (jogo_id, usuario_id)
DO UPDATE SET apelido = EXCLUDED.apelido,
              placar_brasil = EXCLUDED.placar_brasil,
              placar_adversario = EXCLUDED.placar_adversario,
              criado_em = now()`;

function mapaPalpite(r) {
  return {
    jogoId: r.jogo_id,
    usuarioId: r.usuario_id,
    apelido: r.apelido,
    placarBrasil: r.placar_brasil,
    placarAdversario: r.placar_adversario,
  };
}

export function criarDb(consulta) {
  return {
    async garantirEsquema() {
      await consulta(CRIAR_TABELA, []);
    },
    async salvarPalpite(p) {
      await consulta(UPSERT, [p.jogoId, p.usuarioId, p.apelido, p.placarBrasil, p.placarAdversario]);
    },
    async palpitesDoJogo(jogoId) {
      const linhas = await consulta(
        `SELECT jogo_id, usuario_id, apelido, placar_brasil, placar_adversario FROM palpites WHERE jogo_id = $1`,
        [jogoId]
      );
      return linhas.map(mapaPalpite);
    },
    async todosPalpites() {
      const linhas = await consulta(
        `SELECT jogo_id, usuario_id, apelido, placar_brasil, placar_adversario FROM palpites`,
        []
      );
      return linhas.map(mapaPalpite);
    },
  };
}
```

- [ ] **Step 4: Rodar, esperar PASS (4 testes).**

- [ ] **Step 5: Commit**
```bash
cd "C:/Users/jenni/Downloads/Sites/copa-hexa"
git add js/db.js js/db.test.js
git commit -m "feat: acesso ao banco de palpites (consulta injetável)"
```

---

## Task 4: Serviço de palpites (`js/palpites-servico.js`)

**Files:** Create `js/palpites-servico.js`, `js/palpites-servico.test.js`.

`tratarRequisicao(req, res, { db, resultados })` orquestra: POST grava um
palpite válido; GET `?ranking` devolve o ranking; GET `?jogoId=...` devolve a
vibe (via `calcularVibe`). `req` = `{ method, query, body }`; `res` no estilo
Vercel (`status().json()`). `resultados` é uma função async sem argumentos que
devolve o mapa de resultados finais.

- [ ] **Step 1: Escrever o teste que falha `js/palpites-servico.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tratarRequisicao } from './palpites-servico.js';

function resFake() {
  return {
    statusCode: null, body: null,
    status(c) { this.statusCode = c; return this; },
    json(o) { this.body = o; return this; },
  };
}

function dbFake(palpites = []) {
  return {
    salvos: [],
    async garantirEsquema() {},
    async salvarPalpite(p) { this.salvos.push(p); },
    async palpitesDoJogo(jogoId) { return palpites.filter((p) => p.jogoId === jogoId); },
    async todosPalpites() { return palpites; },
  };
}

const semResultados = async () => ({});

test('POST válido salva o palpite e responde ok', async () => {
  const db = dbFake();
  const req = { method: 'POST', query: {}, body: { jogoId: 'J1', usuarioId: 'u1', apelido: 'Ana', placarBrasil: 2, placarAdversario: 1 } };
  const res = resFake();
  await tratarRequisicao(req, res, { db, resultados: semResultados });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(db.salvos.length, 1);
  assert.equal(db.salvos[0].apelido, 'Ana');
});

test('POST com apelido vazio é rejeitado (400) e não salva', async () => {
  const db = dbFake();
  const req = { method: 'POST', query: {}, body: { jogoId: 'J1', usuarioId: 'u1', apelido: '   ', placarBrasil: 2, placarAdversario: 1 } };
  const res = resFake();
  await tratarRequisicao(req, res, { db, resultados: semResultados });
  assert.equal(res.statusCode, 400);
  assert.equal(db.salvos.length, 0);
});

test('POST com placar inválido é rejeitado (400)', async () => {
  const db = dbFake();
  const req = { method: 'POST', query: {}, body: { jogoId: 'J1', usuarioId: 'u1', apelido: 'Ana', placarBrasil: -1, placarAdversario: 1 } };
  const res = resFake();
  await tratarRequisicao(req, res, { db, resultados: semResultados });
  assert.equal(res.statusCode, 400);
});

test('GET ?jogoId devolve a vibe (distribuição)', async () => {
  const db = dbFake([
    { jogoId: 'J1', usuarioId: 'u1', apelido: 'Ana', placarBrasil: 2, placarAdversario: 1 },
    { jogoId: 'J1', usuarioId: 'u2', apelido: 'Beto', placarBrasil: 2, placarAdversario: 1 },
  ]);
  const req = { method: 'GET', query: { jogoId: 'J1' }, body: null };
  const res = resFake();
  await tratarRequisicao(req, res, { db, resultados: semResultados });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.total, 2);
  assert.equal(res.body.placares[0].rotulo, '2x1');
});

test('GET ?ranking devolve o ranking calculado', async () => {
  const db = dbFake([
    { jogoId: 'J1', usuarioId: 'u1', apelido: 'Ana', placarBrasil: 2, placarAdversario: 1 },
  ]);
  const resultados = async () => ({ J1: { placarBrasil: 2, placarAdversario: 1 } });
  const req = { method: 'GET', query: { ranking: '' }, body: null };
  const res = resFake();
  await tratarRequisicao(req, res, { db, resultados });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ranking[0].apelido, 'Ana');
  assert.equal(res.body.ranking[0].pontos, 3);
});
```

- [ ] **Step 2: Rodar, esperar FAIL** (`Cannot find module './palpites-servico.js'`).

- [ ] **Step 3: Implementar `js/palpites-servico.js`**

```js
import { calcularVibe } from './distribuicao.js';
import { calcularRanking } from './ranking.js';

const PLACAR_MAX = 30;

function placarValido(n) {
  return Number.isInteger(n) && n >= 0 && n <= PLACAR_MAX;
}

function palpiteValido(b) {
  return (
    b &&
    typeof b.jogoId === 'string' && b.jogoId.length > 0 &&
    typeof b.usuarioId === 'string' && b.usuarioId.length > 0 &&
    typeof b.apelido === 'string' && b.apelido.trim().length > 0 &&
    placarValido(b.placarBrasil) && placarValido(b.placarAdversario)
  );
}

export async function tratarRequisicao(req, res, { db, resultados }) {
  await db.garantirEsquema();

  if (req.method === 'POST') {
    const b = req.body;
    if (!palpiteValido(b)) {
      return res.status(400).json({ ok: false, erro: 'palpite inválido' });
    }
    await db.salvarPalpite({
      jogoId: b.jogoId,
      usuarioId: b.usuarioId,
      apelido: b.apelido.trim().slice(0, 40),
      placarBrasil: b.placarBrasil,
      placarAdversario: b.placarAdversario,
    });
    return res.status(200).json({ ok: true });
  }

  if (req.query.ranking !== undefined) {
    const [palpites, mapa] = await Promise.all([db.todosPalpites(), resultados()]);
    return res.status(200).json({ ranking: calcularRanking(palpites, mapa) });
  }

  const jogoId = req.query.jogoId;
  if (!jogoId) {
    return res.status(400).json({ erro: 'jogoId é obrigatório' });
  }
  const palpites = await db.palpitesDoJogo(jogoId);
  return res.status(200).json(calcularVibe(palpites));
}
```

- [ ] **Step 4: Rodar, esperar PASS (5 testes).**

- [ ] **Step 5: Commit**
```bash
cd "C:/Users/jenni/Downloads/Sites/copa-hexa"
git add js/palpites-servico.js js/palpites-servico.test.js
git commit -m "feat: serviço de palpites (validação, vibe e ranking)"
```

---

## Task 5: Função serverless e dependência (`api/palpites.js`)

**Files:** Create `api/palpites.js`; Modify `package.json` (dependência).

Conecta o Neon e a fonte de resultados ao serviço. Não tem teste unitário
próprio (o wiring é fino; a lógica já é testada na Task 4). Verificação: a suíte
completa passa e o módulo importa sem erro de sintaxe.

- [ ] **Step 1: Instalar a dependência do Neon**

Run: `cd "C:/Users/jenni/Downloads/Sites/copa-hexa" && npm install @neondatabase/serverless`
Isso cria/atualiza `package.json` (campo `dependencies`) e `package-lock.json`.

- [ ] **Step 2: Implementar `api/palpites.js`**

```js
import { neon } from '@neondatabase/serverless';
import { criarDb } from '../js/db.js';
import { montarResultados } from '../js/normalizar.js';
import { tratarRequisicao } from '../js/palpites-servico.js';

const BASE = 'https://api.football-data.org/v4';
const COMPETICAO = 'WC';

function consultaNeon() {
  const sql = neon(process.env.DATABASE_URL);
  return (texto, params) => sql.query(texto, params);
}

async function resultadosFinais() {
  const chave = process.env.API_KEY;
  if (!chave) return {};
  try {
    const resp = await fetch(`${BASE}/competitions/${COMPETICAO}/matches`, {
      headers: { 'X-Auth-Token': chave },
    });
    if (!resp.ok) return {};
    return montarResultados(await resp.json());
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  try {
    const db = criarDb(consultaNeon());
    await tratarRequisicao(req, res, { db, resultados: resultadosFinais });
  } catch (erro) {
    res.status(500).json({ ok: false, erro: 'falha no servidor de palpites' });
  }
}
```

- [ ] **Step 3: Verificar sintaxe e suíte**

Run: `cd "C:/Users/jenni/Downloads/Sites/copa-hexa" && node --check api/palpites.js && npm test`
Expected: `node --check` sem saída (ok); suíte com 0 falhas.

- [ ] **Step 4: Commit**
```bash
cd "C:/Users/jenni/Downloads/Sites/copa-hexa"
git add api/palpites.js package.json package-lock.json
git commit -m "feat: função serverless /api/palpites (Neon + resultados)"
```

---

## Task 6: Front-end do palpite (`render.js` + `app.js`)

**Files:** Modify `js/render.js` (add `renderPalpite`), `js/app.js` (wire palpite flow). Verificação visual via preview.

A seção `#palpite` ganha: um campo de apelido, seletores de placar (Brasil x
adversário), botão de enviar, a "vibe da galera" e o ranking. Sem login: gera
um `usuarioId` no `localStorage`.

- [ ] **Step 1: Adicionar a `js/render.js`** (no fim, antes do `export function renderGlossario` ou após — qualquer posição; é um novo export)

```js
export function renderPalpite(el, proximoJogo, { onEnviar }) {
  if (!proximoJogo) {
    el.innerHTML = '<h2>Dar seu palpite</h2><p>Sem jogo aberto pra palpite agora. Volta na véspera do próximo jogo! 😉</p>';
    return;
  }
  const opcoes = (sel) =>
    Array.from({ length: 6 }, (_, n) => `<option value="${n}"${n === sel ? ' selected' : ''}>${n}</option>`).join('');

  el.innerHTML = `
    <h2>Dar seu palpite 🔮</h2>
    <p class="palpite__jogo">Brasil x ${proximoJogo.adversario}</p>
    <form class="palpite__form" id="palpite-form">
      <input class="palpite__apelido" id="palpite-apelido" type="text" maxlength="40" placeholder="Seu apelido" required />
      <div class="palpite__placar">
        <label>Brasil <select id="palpite-br">${opcoes(1)}</select></label>
        <span>x</span>
        <label><select id="palpite-adv">${opcoes(0)}</select> ${proximoJogo.adversario}</label>
      </div>
      <button type="submit">Enviar palpite</button>
    </form>
    <p class="palpite__status" id="palpite-status" aria-live="polite"></p>
    <div class="palpite__vibe" id="palpite-vibe"></div>
    <div class="palpite__ranking" id="palpite-ranking"></div>
  `;

  el.querySelector('#palpite-form').addEventListener('submit', (e) => {
    e.preventDefault();
    onEnviar({
      apelido: el.querySelector('#palpite-apelido').value,
      placarBrasil: Number(el.querySelector('#palpite-br').value),
      placarAdversario: Number(el.querySelector('#palpite-adv').value),
    });
  });
}

export function renderVibe(el, vibe, adversario) {
  if (!vibe || vibe.total === 0) {
    el.innerHTML = '<p class="vibe__vazio">Seja o primeiro a palpitar! 🎉</p>';
    return;
  }
  const linhas = vibe.placares
    .slice(0, 5)
    .map(
      (p) => `<li><span class="vibe__rotulo">Brasil ${p.rotulo.replace('x', `x ${adversario} `)}</span>
        <span class="vibe__barra"><span style="width:${p.percentual}%"></span></span>
        <span class="vibe__pct">${p.percentual}%</span></li>`
    )
    .join('');
  el.innerHTML = `<h3>A vibe da galera (${vibe.total})</h3><ul class="vibe">${linhas}</ul>`;
}

export function renderRanking(el, ranking) {
  if (!ranking || ranking.length === 0) {
    el.innerHTML = '';
    return;
  }
  const itens = ranking
    .slice(0, 10)
    .map((r, i) => `<li><span class="rank__pos">${i + 1}º</span> <span class="rank__nome">${r.apelido}</span> <span class="rank__pts">${r.pontos} pts</span></li>`)
    .join('');
  el.innerHTML = `<h3>🏅 Ranking dos palpiteiros</h3><ol class="ranking">${itens}</ol>`;
}
```

- [ ] **Step 2: Atualizar `js/app.js`** — após renderizar as outras seções, adicionar o fluxo de palpite. Substituir a função `init` por esta versão (mantém o resto do arquivo igual):

```js
function usuarioId() {
  let id = localStorage.getItem('copaUsuarioId');
  if (!id) {
    id = (crypto.randomUUID && crypto.randomUUID()) || String(Math.random()).slice(2);
    localStorage.setItem('copaUsuarioId', id);
  }
  return id;
}

async function carregarVibe(jogoId) {
  try {
    const r = await fetch(`/api/palpites?jogoId=${encodeURIComponent(jogoId)}`);
    if (r.ok) return await r.json();
  } catch {}
  return { total: 0, placares: [] };
}

async function carregarRanking() {
  try {
    const r = await fetch('/api/palpites?ranking');
    if (r.ok) return (await r.json()).ranking || [];
  } catch {}
  return [];
}

async function atualizarPalpite(proximoJogo) {
  if (!proximoJogo) return;
  const vibe = await carregarVibe(proximoJogo.id);
  render.renderVibe(document.querySelector('#palpite-vibe'), vibe, proximoJogo.adversario);
  render.renderRanking(document.querySelector('#palpite-ranking'), await carregarRanking());
}

async function init() {
  const dados = await carregarDados();
  render.renderTermometro(document.querySelector('#termometro'), dados.estado);
  render.renderProximoJogo(document.querySelector('#proximo-jogo'), dados.proximoJogo);
  render.renderGrupo(document.querySelector('#grupo'), dados.grupo);
  render.renderCraques(document.querySelector('#craques'), dados.artilheiros);
  render.renderGlossario(document.querySelector('#glossario'));

  const proximoJogo = dados.proximoJogo;
  render.renderPalpite(document.querySelector('#palpite'), proximoJogo, {
    onEnviar: async ({ apelido, placarBrasil, placarAdversario }) => {
      const status = document.querySelector('#palpite-status');
      if (!apelido.trim()) {
        status.textContent = 'Põe um apelido pra valer o palpite. 🙂';
        return;
      }
      status.textContent = 'Enviando...';
      try {
        const r = await fetch('/api/palpites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jogoId: proximoJogo.id,
            usuarioId: usuarioId(),
            apelido,
            placarBrasil,
            placarAdversario,
          }),
        });
        status.textContent = r.ok ? 'Palpite registrado! 🎉' : 'Não rolou agora, tenta de novo.';
      } catch {
        status.textContent = 'Sem conexão com o placar agora. Tenta mais tarde.';
      }
      atualizarPalpite(proximoJogo);
    },
  });

  atualizarPalpite(proximoJogo);
}

init();
```

> Nota: no dev estático (sem serverless) os `fetch` de `/api/palpites` falham e
> caem nos defaults (vibe vazia, ranking vazio) — o formulário aparece e mostra
> "Seja o primeiro a palpitar!". O fluxo real só roda na Vercel com `DATABASE_URL`.

- [ ] **Step 3: Adicionar estilos ao `styles.css`** (no fim do arquivo)

```css
/* Palpite */
.palpite__form { display: grid; gap: 0.75rem; max-width: 420px; }
.palpite__apelido { padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 1rem; }
.palpite__placar { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; }
.palpite__placar select { padding: 0.4rem; border-radius: 8px; }
.palpite__form button { background: var(--verde); color: var(--branco); border: 0; border-radius: 10px; padding: 0.7rem 1rem; font-weight: 700; cursor: pointer; }
.palpite__status { font-weight: 600; min-height: 1.2em; }
.vibe { list-style: none; padding: 0; display: grid; gap: 0.4rem; }
.vibe li { display: grid; grid-template-columns: 1fr 2fr auto; align-items: center; gap: 0.5rem; }
.vibe__barra { background: #e5e7eb; border-radius: 999px; overflow: hidden; height: 10px; }
.vibe__barra span { display: block; height: 100%; background: var(--amarelo); }
.ranking { padding-left: 1.2rem; display: grid; gap: 0.3rem; }
.ranking li { display: flex; gap: 0.5rem; }
.rank__pts { margin-left: auto; font-weight: 700; color: var(--verde); }
```

- [ ] **Step 4: Verificar no preview** (controlador)

- Recarregar a página. Conferir no console que não há erro de JS (os 404 de
  `/api/palpites` são esperados no dev estático e tratados).
- Conferir via snapshot que a seção "Dar seu palpite" mostra: campo de apelido,
  seletores Brasil x Sérvia, botão, e "Seja o primeiro a palpitar!".
- Testar o submit com um apelido e ver o status mudar (vai falhar o POST no dev
  estático, mas a mensagem de erro amigável deve aparecer — sem exceção no
  console).
- Screenshot da seção.

- [ ] **Step 5: Commit**
```bash
cd "C:/Users/jenni/Downloads/Sites/copa-hexa"
git add js/render.js js/app.js styles.css
git commit -m "feat: UI de palpite, vibe da galera e ranking"
```

---

## Task 7: Documentação e esquema

**Files:** Modify `README.md`.

- [ ] **Step 1: Acrescentar ao `README.md`** (seção nova ao fim)

```markdown
## Palpites e ranking (Neon)

Os palpites ficam no Neon (Postgres serverless). A função `api/palpites.js`
cria a tabela `palpites` automaticamente na primeira chamada
(`CREATE TABLE IF NOT EXISTS`). Endpoints:

- `POST /api/palpites` — body `{ jogoId, usuarioId, apelido, placarBrasil, placarAdversario }`
- `GET /api/palpites?jogoId=...` — a "vibe" (distribuição) do jogo
- `GET /api/palpites?ranking` — o ranking acumulado

Pontuação: placar exato = 3, só o vencedor/empate = 1, erro = 0.

Defina `DATABASE_URL` (string de conexão do Neon) nas variáveis de ambiente da
Vercel. O ranking usa também `API_KEY` para pegar os resultados finais.
```

- [ ] **Step 2: Commit**
```bash
cd "C:/Users/jenni/Downloads/Sites/copa-hexa"
git add README.md
git commit -m "docs: instruções de palpites/ranking e Neon"
```

---

## Self-Review (autor do plano)

- **Cobertura do spec:** palpite com apelido + placar (Tasks 4, 6); um por
  jogo/usuário com upsert (Task 3 UNIQUE + ON CONFLICT); vibe antes do jogo
  (Tasks 4, 6); pontuação 3/1/0 e ranking (Tasks 1, 4); Neon (Tasks 3, 5);
  identidade por localStorage sem login (Task 6). Esquema e env vars (Tasks 5, 7).
- **Placeholders:** nenhum — todo passo tem código completo.
- **Consistência de tipos:** o palpite `{ jogoId, usuarioId, apelido,
  placarBrasil, placarAdversario }` é o mesmo em db.js, palpites-servico.js,
  ranking.js e no POST do front; `resultados` é `{ [jogoId]: { placarBrasil,
  placarAdversario } }` em montarResultados, ranking e serviço; `jogoId` =
  `proximoJogo.id` (String do id da football-data), consistente com
  montarResultados. `calcularVibe` (Plano 1) e `pontuarPalpite` (Plano 1)
  reusados sem alteração.
- **Riscos (deploy real):** (1) provisionar o Neon e setar `DATABASE_URL`; (2)
  sem login, ranking é vulnerável a apelidos repetidos/trapaça (aceitável,
  festivo); (3) `garantirEsquema` roda a cada request (barato e idempotente,
  mas dá pra otimizar depois); (4) o ranking faz 1 chamada à football-data por
  request de ranking — ok no plano grátis com o cache, reavaliar se crescer.
```
