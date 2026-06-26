# Copa pra Leigos — Plano 1: Contas & login

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir login opcional por **usuário + PIN** ou **Google**, com sessão assinada, e uma barra de identidade no site. Não altera ainda palpites/rankings (isso é o Plano 2).

**Architecture:** Lógica pura e testável em módulos `js/` (validação, hash de PIN com scrypt, sessão JWT HS256 — tudo com o `crypto` nativo do Node, sem dependência), acesso ao banco via `consulta` injetável, e um serviço de auth orquestrando. A função serverless `api/auth.js` conecta Neon + `google-auth-library`. O front tem `js/conta.js` (estado/sessão no navegador) e `js/conta-ui.js` (barra + modal de login com botão Google).

**Tech Stack:** Vercel Serverless (Node ESM), Neon, Node `crypto` (scrypt + HMAC), `google-auth-library`, Google Identity Services (front), `node --test`.

> **Git:** repo `copa-hexa/`, autor `jenni.o.bruno@gmail.com` (Vercel Hobby). Branch atual: `feat/login-ranking`.

## File Structure
```
copa-hexa/
  js/
    usuario-validacao.js   # usernameValido / pinValido (puro)
    usuario-validacao.test.js
    senha.js               # hashPin / verificarPin (scrypt)
    senha.test.js
    sessao.js              # assinarSessao / verificarSessao (JWT HS256)
    sessao.test.js
    db.js                  # + métodos de usuários (consulta injetável)
    db.test.js             # + testes de usuários
    auth-servico.js        # tratarAuth(req,res,{db,verificarGoogle,segredo})
    auth-servico.test.js
    conta.js               # cliente: token/perfil no localStorage + chamadas (navegador)
    conta-ui.js            # barra de identidade + modal de login (navegador)
  api/
    auth.js                # wiring: Neon + google-auth-library + sessão
    config.js              # devolve o googleClientId público pro front
  index.html               # + container da barra + (Google carregado sob demanda)
  app.js                   # monta a barra de conta
  styles.css               # + estilos da barra e do modal
  package.json             # + dependência google-auth-library
```

---

## Task 1: Validação de usuário e PIN (`js/usuario-validacao.js`)

**Files:** Create `js/usuario-validacao.js`, `js/usuario-validacao.test.js`.

- [ ] **Step 1: Teste que falha**
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { usernameValido, pinValido } from './usuario-validacao.js';

test('username aceita 3-20 letras/números/_/.', () => {
  assert.equal(usernameValido('ana_2026'), true);
  assert.equal(usernameValido('jo'), false);
  assert.equal(usernameValido('com espaço'), false);
  assert.equal(usernameValido('a'.repeat(21)), false);
  assert.equal(usernameValido(123), false);
});

test('PIN aceita 4 a 6 dígitos', () => {
  assert.equal(pinValido('1234'), true);
  assert.equal(pinValido('123456'), true);
  assert.equal(pinValido('123'), false);
  assert.equal(pinValido('1234567'), false);
  assert.equal(pinValido('12a4'), false);
  assert.equal(pinValido(1234), false);
});
```

- [ ] **Step 2: Rodar, esperar FAIL.** `cd "C:/Users/jenni/Downloads/Sites/copa-hexa" && node --test js/usuario-validacao.test.js`

- [ ] **Step 3: Implementar `js/usuario-validacao.js`**
```js
export function usernameValido(u) {
  return typeof u === 'string' && /^[a-zA-Z0-9_.]{3,20}$/.test(u);
}

export function pinValido(p) {
  return typeof p === 'string' && /^[0-9]{4,6}$/.test(p);
}
```

- [ ] **Step 4: Rodar, esperar PASS (2 testes).**

- [ ] **Step 5: Commit**
```bash
cd "C:/Users/jenni/Downloads/Sites/copa-hexa"
git add js/usuario-validacao.js js/usuario-validacao.test.js
git commit -m "feat: validação de username e PIN"
```

---

## Task 2: Hash de PIN com scrypt (`js/senha.js`)

**Files:** Create `js/senha.js`, `js/senha.test.js`.

- [ ] **Step 1: Teste que falha**
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPin, verificarPin } from './senha.js';

test('hash e verificação batem para o PIN certo', () => {
  const h = hashPin('1234');
  assert.match(h, /^[0-9a-f]+:[0-9a-f]+$/);
  assert.equal(verificarPin('1234', h), true);
});

test('PIN errado não verifica', () => {
  const h = hashPin('1234');
  assert.equal(verificarPin('9999', h), false);
});

test('hash guardado malformado devolve false', () => {
  assert.equal(verificarPin('1234', 'lixo'), false);
  assert.equal(verificarPin('1234', null), false);
});

test('dois hashes do mesmo PIN são diferentes (salt aleatório)', () => {
  assert.notEqual(hashPin('1234'), hashPin('1234'));
});
```

- [ ] **Step 2: Rodar, esperar FAIL.**

- [ ] **Step 3: Implementar `js/senha.js`**
```js
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

export function hashPin(pin) {
  const salt = randomBytes(16);
  const hash = scryptSync(String(pin), salt, 32);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verificarPin(pin, guardado) {
  if (typeof guardado !== 'string' || !guardado.includes(':')) return false;
  const [saltHex, hashHex] = guardado.split(':');
  let esperado;
  try {
    esperado = Buffer.from(hashHex, 'hex');
  } catch {
    return false;
  }
  const calculado = scryptSync(String(pin), Buffer.from(saltHex, 'hex'), esperado.length);
  return esperado.length === calculado.length && timingSafeEqual(esperado, calculado);
}
```

- [ ] **Step 4: Rodar, esperar PASS (4 testes).**

- [ ] **Step 5: Commit**
```bash
cd "C:/Users/jenni/Downloads/Sites/copa-hexa"
git add js/senha.js js/senha.test.js
git commit -m "feat: hash de PIN com scrypt"
```

---

## Task 3: Sessão JWT HS256 (`js/sessao.js`)

**Files:** Create `js/sessao.js`, `js/sessao.test.js`.

- [ ] **Step 1: Teste que falha**
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assinarSessao, verificarSessao } from './sessao.js';

const SEGREDO = 'segredo-de-teste';

test('assina e verifica devolvendo o payload', () => {
  const token = assinarSessao({ id: 7, nome: 'Ana' }, SEGREDO);
  const corpo = verificarSessao(token, SEGREDO);
  assert.equal(corpo.id, 7);
  assert.equal(corpo.nome, 'Ana');
});

test('segredo errado rejeita', () => {
  const token = assinarSessao({ id: 7 }, SEGREDO);
  assert.equal(verificarSessao(token, 'outro'), null);
});

test('token adulterado rejeita', () => {
  const token = assinarSessao({ id: 7 }, SEGREDO);
  const ruim = token.slice(0, -2) + (token.slice(-2) === 'aa' ? 'bb' : 'aa');
  assert.equal(verificarSessao(ruim, SEGREDO), null);
});

test('token expirado rejeita', () => {
  const token = assinarSessao({ id: 7 }, SEGREDO, -10);
  assert.equal(verificarSessao(token, SEGREDO), null);
});

test('lixo devolve null', () => {
  assert.equal(verificarSessao('abc', SEGREDO), null);
  assert.equal(verificarSessao(null, SEGREDO), null);
});
```

- [ ] **Step 2: Rodar, esperar FAIL.**

- [ ] **Step 3: Implementar `js/sessao.js`**
```js
import { createHmac, timingSafeEqual } from 'node:crypto';

function b64url(texto) {
  return Buffer.from(texto).toString('base64url');
}

function assinar(parte, segredo) {
  return createHmac('sha256', segredo).update(parte).digest('base64url');
}

export function assinarSessao(payload, segredo, ttlSegundos = 60 * 60 * 24 * 30) {
  const corpo = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSegundos };
  const cabecalho = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const dados = b64url(JSON.stringify(corpo));
  const parte = `${cabecalho}.${dados}`;
  return `${parte}.${assinar(parte, segredo)}`;
}

export function verificarSessao(token, segredo) {
  if (typeof token !== 'string') return null;
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  const parte = `${partes[0]}.${partes[1]}`;
  const esperada = Buffer.from(assinar(parte, segredo));
  const recebida = Buffer.from(partes[2]);
  if (esperada.length !== recebida.length || !timingSafeEqual(esperada, recebida)) {
    return null;
  }
  let corpo;
  try {
    corpo = JSON.parse(Buffer.from(partes[1], 'base64url').toString());
  } catch {
    return null;
  }
  if (corpo.exp && Math.floor(Date.now() / 1000) > corpo.exp) return null;
  return corpo;
}
```

- [ ] **Step 4: Rodar, esperar PASS (5 testes).**

- [ ] **Step 5: Commit**
```bash
cd "C:/Users/jenni/Downloads/Sites/copa-hexa"
git add js/sessao.js js/sessao.test.js
git commit -m "feat: sessão assinada (JWT HS256)"
```

---

## Task 4: Métodos de usuários no banco (`js/db.js`)

**Files:** Modify `js/db.js` (append methods to the object returned by `criarDb`), `js/db.test.js` (append tests).

> Em `js/db.js`, o `criarDb(consulta)` já devolve um objeto com métodos de
> palpites. Acrescente os métodos de usuários a esse MESMO objeto e as
> constantes/`mapaUsuario` no topo do módulo. Não altere os métodos existentes.

- [ ] **Step 1: Acrescentar testes ao fim de `js/db.test.js`**
```js
import { criarDb as criarDbU } from './db.js';

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
  await criarDbU(c).garantirEsquemaUsuarios();
  assert.match(c.chamadas[0].texto, /CREATE TABLE IF NOT EXISTS usuarios/);
});

test('criarUsuarioPin insere e mapeia o perfil', async () => {
  const c = consultaU([[{ id: 1, nome: 'Ana', foto_url: null }]]);
  const u = await criarDbU(c).criarUsuarioPin({ nome: 'Ana', usernameLc: 'ana', pinHash: 'sal:hash' });
  assert.match(c.chamadas[0].texto, /INSERT INTO usuarios/);
  assert.deepEqual(c.chamadas[0].params, ['Ana', 'ana', 'sal:hash']);
  assert.deepEqual(u, { id: 1, nome: 'Ana', foto: null });
});

test('buscarPorUsername devolve perfil + pinHash', async () => {
  const c = consultaU([[{ id: 1, nome: 'Ana', foto_url: null, pin_hash: 'sal:hash' }]]);
  const u = await criarDbU(c).buscarPorUsername('ana');
  assert.deepEqual(c.chamadas[0].params, ['ana']);
  assert.equal(u.pinHash, 'sal:hash');
  assert.equal(u.nome, 'Ana');
});

test('buscarPorUsername devolve null quando não acha', async () => {
  const c = consultaU([[]]);
  assert.equal(await criarDbU(c).buscarPorUsername('ninguem'), null);
});

test('acharOuCriarGoogle faz upsert por google_sub', async () => {
  const c = consultaU([[{ id: 2, nome: 'João', foto_url: 'http://x/p.png' }]]);
  const u = await criarDbU(c).acharOuCriarGoogle({ googleSub: 'g-123', nome: 'João', fotoUrl: 'http://x/p.png' });
  assert.match(c.chamadas[0].texto, /ON CONFLICT \(google_sub\)/);
  assert.deepEqual(c.chamadas[0].params, ['João', 'http://x/p.png', 'g-123']);
  assert.deepEqual(u, { id: 2, nome: 'João', foto: 'http://x/p.png' });
});
```

- [ ] **Step 2: Rodar, esperar FAIL.** `node --test js/db.test.js`

- [ ] **Step 3: No topo de `js/db.js`** (após as constantes existentes) acrescentar:
```js
const CRIAR_USUARIOS = `CREATE TABLE IF NOT EXISTS usuarios (
  id          BIGSERIAL PRIMARY KEY,
  nome        TEXT NOT NULL,
  username_lc TEXT UNIQUE,
  foto_url    TEXT,
  pin_hash    TEXT,
  google_sub  TEXT UNIQUE,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
)`;

function mapaUsuario(r) {
  return { id: r.id, nome: r.nome, foto: r.foto_url };
}
```

- [ ] **Step 4: Dentro do objeto retornado por `criarDb`**, acrescentar estes métodos (junto dos de palpites):
```js
    async garantirEsquemaUsuarios() {
      await consulta(CRIAR_USUARIOS, []);
    },
    async criarUsuarioPin({ nome, usernameLc, pinHash }) {
      const linhas = await consulta(
        `INSERT INTO usuarios (nome, username_lc, pin_hash) VALUES ($1, $2, $3) RETURNING id, nome, foto_url`,
        [nome, usernameLc, pinHash]
      );
      return mapaUsuario(linhas[0]);
    },
    async buscarPorUsername(usernameLc) {
      const linhas = await consulta(
        `SELECT id, nome, foto_url, pin_hash FROM usuarios WHERE username_lc = $1`,
        [usernameLc]
      );
      if (!linhas[0]) return null;
      return { ...mapaUsuario(linhas[0]), pinHash: linhas[0].pin_hash };
    },
    async acharOuCriarGoogle({ googleSub, nome, fotoUrl }) {
      const linhas = await consulta(
        `INSERT INTO usuarios (nome, foto_url, google_sub) VALUES ($1, $2, $3)
         ON CONFLICT (google_sub) DO UPDATE SET nome = EXCLUDED.nome, foto_url = EXCLUDED.foto_url
         RETURNING id, nome, foto_url`,
        [nome, fotoUrl, googleSub]
      );
      return mapaUsuario(linhas[0]);
    },
```

- [ ] **Step 5: Rodar, esperar PASS** (os testes antigos de db + 5 novos).

- [ ] **Step 6: Commit**
```bash
cd "C:/Users/jenni/Downloads/Sites/copa-hexa"
git add js/db.js js/db.test.js
git commit -m "feat: métodos de usuários no banco"
```

---

## Task 5: Serviço de autenticação (`js/auth-servico.js`)

**Files:** Create `js/auth-servico.js`, `js/auth-servico.test.js`.

`tratarAuth(req, res, { db, verificarGoogle, segredo })` orquestra registrar/
entrar/google. `verificarGoogle(idToken)` é injetado (no teste, um fake; na
função serverless, o `google-auth-library`).

- [ ] **Step 1: Teste que falha**
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tratarAuth } from './auth-servico.js';
import { hashPin } from './senha.js';
import { verificarSessao } from './sessao.js';

const SEGREDO = 'seg';

function resFake() {
  return {
    statusCode: null, body: null,
    status(c) { this.statusCode = c; return this; },
    json(o) { this.body = o; return this; },
  };
}

function dbFake(over = {}) {
  return {
    async garantirEsquemaUsuarios() {},
    async criarUsuarioPin({ nome }) { return { id: 1, nome, foto: null }; },
    async buscarPorUsername() { return null; },
    async acharOuCriarGoogle({ nome, fotoUrl }) { return { id: 2, nome, foto: fotoUrl }; },
    ...over,
  };
}

const googleOk = async () => ({ sub: 'g-1', name: 'João G', picture: 'http://x/p.png' });

test('registrar válido cria conta e devolve token + perfil', async () => {
  const res = resFake();
  await tratarAuth({ method: 'POST', body: { acao: 'registrar', username: 'ana_1', pin: '1234' } }, res, { db: dbFake(), verificarGoogle: googleOk, segredo: SEGREDO });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.perfil.nome, 'ana_1');
  assert.equal(verificarSessao(res.body.token, SEGREDO).id, 1);
});

test('registrar inválido devolve 400', async () => {
  const res = resFake();
  await tratarAuth({ method: 'POST', body: { acao: 'registrar', username: 'a', pin: '12' } }, res, { db: dbFake(), verificarGoogle: googleOk, segredo: SEGREDO });
  assert.equal(res.statusCode, 400);
});

test('registrar com nome em uso devolve 409', async () => {
  const db = dbFake({ async criarUsuarioPin() { throw new Error('unique'); } });
  const res = resFake();
  await tratarAuth({ method: 'POST', body: { acao: 'registrar', username: 'ana_1', pin: '1234' } }, res, { db, verificarGoogle: googleOk, segredo: SEGREDO });
  assert.equal(res.statusCode, 409);
});

test('entrar com PIN certo devolve token', async () => {
  const db = dbFake({ async buscarPorUsername() { return { id: 5, nome: 'Ana', foto: null, pinHash: hashPin('1234') }; } });
  const res = resFake();
  await tratarAuth({ method: 'POST', body: { acao: 'entrar', username: 'ana', pin: '1234' } }, res, { db, verificarGoogle: googleOk, segredo: SEGREDO });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.perfil.id, 5);
});

test('entrar com PIN errado devolve 401', async () => {
  const db = dbFake({ async buscarPorUsername() { return { id: 5, nome: 'Ana', foto: null, pinHash: hashPin('1234') }; } });
  const res = resFake();
  await tratarAuth({ method: 'POST', body: { acao: 'entrar', username: 'ana', pin: '0000' } }, res, { db, verificarGoogle: googleOk, segredo: SEGREDO });
  assert.equal(res.statusCode, 401);
});

test('google válido cria/loga e usa nome e foto do Google', async () => {
  const res = resFake();
  await tratarAuth({ method: 'POST', body: { acao: 'google', idToken: 'tok' } }, res, { db: dbFake(), verificarGoogle: googleOk, segredo: SEGREDO });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.perfil.nome, 'João G');
  assert.equal(res.body.perfil.foto, 'http://x/p.png');
});

test('google inválido devolve 401', async () => {
  const res = resFake();
  await tratarAuth({ method: 'POST', body: { acao: 'google', idToken: 'x' } }, res, { db: dbFake(), verificarGoogle: async () => null, segredo: SEGREDO });
  assert.equal(res.statusCode, 401);
});

test('método diferente de POST devolve 405', async () => {
  const res = resFake();
  await tratarAuth({ method: 'GET', body: {} }, res, { db: dbFake(), verificarGoogle: googleOk, segredo: SEGREDO });
  assert.equal(res.statusCode, 405);
});
```

- [ ] **Step 2: Rodar, esperar FAIL.**

- [ ] **Step 3: Implementar `js/auth-servico.js`**
```js
import { usernameValido, pinValido } from './usuario-validacao.js';
import { hashPin, verificarPin } from './senha.js';
import { assinarSessao } from './sessao.js';

function resposta(conta, segredo) {
  const perfil = { id: conta.id, nome: conta.nome, foto: conta.foto || null };
  const token = assinarSessao({ id: conta.id, nome: conta.nome }, segredo);
  return { token, perfil };
}

export async function tratarAuth(req, res, { db, verificarGoogle, segredo }) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'método não suportado' });
  }
  await db.garantirEsquemaUsuarios();
  const b = req.body || {};

  if (b.acao === 'registrar') {
    if (!usernameValido(b.username) || !pinValido(b.pin)) {
      return res.status(400).json({ erro: 'usuário (3-20) ou PIN (4-6 dígitos) inválido' });
    }
    try {
      const conta = await db.criarUsuarioPin({
        nome: b.username,
        usernameLc: b.username.toLowerCase(),
        pinHash: hashPin(b.pin),
      });
      return res.status(200).json(resposta(conta, segredo));
    } catch {
      return res.status(409).json({ erro: 'esse nome já está em uso' });
    }
  }

  if (b.acao === 'entrar') {
    if (!usernameValido(b.username) || !pinValido(b.pin)) {
      return res.status(400).json({ erro: 'usuário ou PIN inválido' });
    }
    const conta = await db.buscarPorUsername(b.username.toLowerCase());
    if (!conta || !conta.pinHash || !verificarPin(b.pin, conta.pinHash)) {
      return res.status(401).json({ erro: 'usuário ou PIN errado' });
    }
    return res.status(200).json(resposta(conta, segredo));
  }

  if (b.acao === 'google') {
    const info = await verificarGoogle(b.idToken);
    if (!info || !info.sub) {
      return res.status(401).json({ erro: 'login com Google falhou' });
    }
    const conta = await db.acharOuCriarGoogle({
      googleSub: info.sub,
      nome: info.name || 'Torcedor',
      fotoUrl: info.picture || null,
    });
    return res.status(200).json(resposta(conta, segredo));
  }

  return res.status(400).json({ erro: 'ação desconhecida' });
}
```

- [ ] **Step 4: Rodar, esperar PASS (8 testes).**

- [ ] **Step 5: Commit**
```bash
cd "C:/Users/jenni/Downloads/Sites/copa-hexa"
git add js/auth-servico.js js/auth-servico.test.js
git commit -m "feat: serviço de autenticação (PIN + Google + sessão)"
```

---

## Task 6: Funções serverless `api/auth.js` e `api/config.js`

**Files:** Create `api/auth.js`, `api/config.js`; Modify `package.json` (dependência).

- [ ] **Step 1: Instalar a dependência**
Run: `cd "C:/Users/jenni/Downloads/Sites/copa-hexa" && npm install google-auth-library`

- [ ] **Step 2: Implementar `api/auth.js`**
```js
import { neon } from '@neondatabase/serverless';
import { OAuth2Client } from 'google-auth-library';
import { criarDb } from '../js/db.js';
import { tratarAuth } from '../js/auth-servico.js';

const clienteGoogle = new OAuth2Client();

async function verificarGoogle(idToken) {
  if (!idToken || !process.env.GOOGLE_CLIENT_ID) return null;
  try {
    const ticket = await clienteGoogle.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const p = ticket.getPayload();
    return { sub: p.sub, name: p.name, picture: p.picture };
  } catch {
    return null;
  }
}

function consultaNeon() {
  const sql = neon(process.env.DATABASE_URL);
  return (texto, params) => sql.query(texto, params);
}

export default async function handler(req, res) {
  try {
    const db = criarDb(consultaNeon());
    await tratarAuth(req, res, { db, verificarGoogle, segredo: process.env.SESSION_SECRET });
  } catch {
    res.status(500).json({ erro: 'falha no servidor de login' });
  }
}
```

- [ ] **Step 3: Implementar `api/config.js`** (entrega o client id público do Google pro front)
```js
export default function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=3600');
  res.status(200).json({ googleClientId: process.env.GOOGLE_CLIENT_ID || null });
}
```

- [ ] **Step 4: Verificar sintaxe e suíte**
Run: `cd "C:/Users/jenni/Downloads/Sites/copa-hexa" && node --check api/auth.js && node --check api/config.js && npm test`
Expected: sintaxe ok; 0 falhas.

- [ ] **Step 5: Commit**
```bash
cd "C:/Users/jenni/Downloads/Sites/copa-hexa"
git add api/auth.js api/config.js package.json package-lock.json
git commit -m "feat: funções serverless de login e config do Google"
```

---

## Task 7: Cliente de conta no navegador (`js/conta.js`)

**Files:** Create `js/conta.js`. Módulo de navegador (localStorage/fetch) — sem teste unitário; verificar a sintaxe.

- [ ] **Step 1: Implementar `js/conta.js`**
```js
const CHAVE_TOKEN = 'copaSessao';
const CHAVE_PERFIL = 'copaPerfil';

export function perfilAtual() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_PERFIL));
  } catch {
    return null;
  }
}

export function tokenAtual() {
  return localStorage.getItem(CHAVE_TOKEN);
}

export function sair() {
  localStorage.removeItem(CHAVE_TOKEN);
  localStorage.removeItem(CHAVE_PERFIL);
}

function salvar({ token, perfil }) {
  localStorage.setItem(CHAVE_TOKEN, token);
  localStorage.setItem(CHAVE_PERFIL, JSON.stringify(perfil));
}

async function postAuth(corpo) {
  const r = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(dados.erro || 'Não rolou agora, tenta de novo.');
  return dados;
}

export async function registrar(username, pin) {
  const d = await postAuth({ acao: 'registrar', username, pin });
  salvar(d);
  return d.perfil;
}

export async function entrar(username, pin) {
  const d = await postAuth({ acao: 'entrar', username, pin });
  salvar(d);
  return d.perfil;
}

export async function entrarComGoogle(idToken) {
  const d = await postAuth({ acao: 'google', idToken });
  salvar(d);
  return d.perfil;
}
```

- [ ] **Step 2: Verificar sintaxe.** `node --check js/conta.js`

- [ ] **Step 3: Commit**
```bash
cd "C:/Users/jenni/Downloads/Sites/copa-hexa"
git add js/conta.js
git commit -m "feat: cliente de conta (sessão no navegador)"
```

---

## Task 8: Barra de identidade + modal de login (`js/conta-ui.js`)

**Files:** Create `js/conta-ui.js`; Modify `index.html` (container da barra), `js/app.js` (montar a barra), `styles.css` (estilos). Verificação visual via preview.

- [ ] **Step 1: Implementar `js/conta-ui.js`**
```js
import { perfilAtual, sair, entrar, registrar, entrarComGoogle } from './conta.js';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

function avatarHtml(p) {
  const letra = esc((p.nome || '?').trim().charAt(0).toUpperCase() || '?');
  const interno = p.foto ? `<img src="${esc(p.foto)}" alt="" />` : letra;
  return `<span class="conta__avatar" data-letra="${letra}">${interno}</span>`;
}

export function montarBarraConta(el, { aoMudar } = {}) {
  function render() {
    const p = perfilAtual();
    if (p) {
      el.innerHTML = `
        <div class="conta">
          ${avatarHtml(p)}
          <span class="conta__nome">Olá, ${esc(p.nome)}</span>
          <button type="button" class="conta__sair" id="conta-sair">sair</button>
        </div>`;
      const img = el.querySelector('.conta__avatar img');
      if (img) {
        img.addEventListener('error', () => {
          const span = img.parentElement;
          span.textContent = span.dataset.letra;
        });
      }
      el.querySelector('#conta-sair').addEventListener('click', () => {
        sair();
        render();
        if (aoMudar) aoMudar();
      });
    } else {
      el.innerHTML = `<button type="button" class="conta__entrar" id="conta-entrar">Entrar pra disputar o pódio 🏆</button>`;
      el.querySelector('#conta-entrar').addEventListener('click', abrirModal);
    }
  }

  function abrirModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-conta';
    overlay.innerHTML = `
      <div class="modal-conta__caixa" role="dialog" aria-label="Entrar pra competir">
        <button class="modal-conta__fechar" id="mc-fechar" aria-label="Fechar">×</button>
        <h3>Entrar pra competir 🏆</h3>
        <p class="modal-conta__sub">Anônimo joga e palpita normal. Logado, você entra no pódio. Sem e-mail.</p>
        <div class="modal-conta__abas">
          <button type="button" class="aba ativa" data-aba="entrar">Entrar</button>
          <button type="button" class="aba" data-aba="criar">Criar conta</button>
        </div>
        <form id="mc-form">
          <input id="mc-user" placeholder="Usuário" maxlength="20" autocomplete="username" />
          <input id="mc-pin" placeholder="PIN (4 a 6 números)" inputmode="numeric" maxlength="6" autocomplete="off" />
          <button type="submit" id="mc-enviar">Entrar</button>
        </form>
        <p class="modal-conta__aviso">O PIN não tem recuperação — anota num cantinho. 🙂</p>
        <div class="modal-conta__ou" id="mc-ou">ou</div>
        <div id="mc-google"></div>
        <p class="modal-conta__erro" id="mc-erro" aria-live="polite"></p>
      </div>`;
    document.body.appendChild(overlay);

    let aba = 'entrar';
    const erro = overlay.querySelector('#mc-erro');
    const fechar = () => overlay.remove();
    const aoLogar = () => { fechar(); render(); if (aoMudar) aoMudar(); };

    overlay.querySelector('#mc-fechar').addEventListener('click', fechar);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) fechar(); });

    overlay.querySelectorAll('.aba').forEach((b) => {
      b.addEventListener('click', () => {
        aba = b.dataset.aba;
        overlay.querySelectorAll('.aba').forEach((x) => x.classList.toggle('ativa', x === b));
        overlay.querySelector('#mc-enviar').textContent = aba === 'criar' ? 'Criar conta' : 'Entrar';
      });
    });

    overlay.querySelector('#mc-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      erro.textContent = '';
      const u = overlay.querySelector('#mc-user').value.trim();
      const pin = overlay.querySelector('#mc-pin').value.trim();
      try {
        if (aba === 'criar') await registrar(u, pin);
        else await entrar(u, pin);
        aoLogar();
      } catch (err) {
        erro.textContent = err.message;
      }
    });

    prepararGoogle(overlay, erro, aoLogar);
  }

  render();
}

async function prepararGoogle(overlay, erro, aoLogar) {
  let cfg = {};
  try {
    cfg = await (await fetch('/api/config')).json();
  } catch {
    cfg = {};
  }
  if (!cfg.googleClientId) {
    overlay.querySelector('#mc-ou').style.display = 'none';
    return;
  }
  await carregarGIS();
  window.google.accounts.id.initialize({
    client_id: cfg.googleClientId,
    callback: async (resp) => {
      try {
        await entrarComGoogle(resp.credential);
        aoLogar();
      } catch (err) {
        erro.textContent = err.message;
      }
    },
  });
  window.google.accounts.id.renderButton(overlay.querySelector('#mc-google'), {
    theme: 'filled_black', size: 'large', text: 'continue_with', shape: 'pill',
  });
}

function carregarGIS() {
  return new Promise((resolve) => {
    if (window.google && window.google.accounts) return resolve();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    document.head.appendChild(s);
  });
}
```

- [ ] **Step 2: Em `index.html`**, adicionar o container da barra como primeiro filho do `<body>` (antes do `<header class="hero ...">`):
```html
  <div id="barra-conta" class="barra-conta"></div>
```

- [ ] **Step 3: Em `js/app.js`**, importar e montar a barra. Adicionar ao topo, junto dos outros imports:
```js
import { montarBarraConta } from './conta-ui.js';
```
E como primeira linha dentro de `init()` (antes de `const dados = ...`):
```js
  montarBarraConta(document.querySelector('#barra-conta'), { aoMudar: () => location.reload() });
```

- [ ] **Step 4: Em `styles.css`**, acrescentar antes do bloco `@media (prefers-reduced-motion...)`:
```css
/* Barra de conta */
.barra-conta { position: sticky; top: 0; z-index: 70; display: flex; justify-content: flex-end; gap: 0.5rem; padding: 0.5rem 1rem; background: var(--noite); }
.conta__entrar { background: var(--ouro); color: var(--tinta); border: 0; border-radius: 999px; padding: 0.5rem 1rem; font-family: var(--display); font-weight: 700; cursor: pointer; }
.conta { display: flex; align-items: center; gap: 0.6rem; color: var(--creme); }
.conta__avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--verde); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; overflow: hidden; }
.conta__avatar img { width: 100%; height: 100%; object-fit: cover; }
.conta__nome { font-weight: 600; }
.conta__sair { background: none; border: 0; color: var(--ouro); cursor: pointer; text-decoration: underline; font: inherit; }

/* Modal de conta */
.modal-conta { position: fixed; inset: 0; z-index: 100; background: rgba(8,22,13,0.7); display: flex; align-items: center; justify-content: center; padding: 1rem; }
.modal-conta__caixa { background: var(--creme); color: var(--tinta); border-radius: var(--raio); padding: 1.5rem; max-width: 380px; width: 100%; position: relative; box-shadow: var(--sombra); }
.modal-conta__caixa h3 { font-family: var(--display); text-transform: uppercase; font-size: 1.6rem; margin: 0 0 0.25rem; }
.modal-conta__sub { font-size: 0.9rem; opacity: 0.8; margin: 0 0 1rem; }
.modal-conta__fechar { position: absolute; top: 0.5rem; right: 0.75rem; background: none; border: 0; font-size: 1.5rem; cursor: pointer; line-height: 1; }
.modal-conta__abas { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
.modal-conta__abas .aba { flex: 1; background: #fff; border: 2px solid var(--noite-2); border-radius: 10px; padding: 0.5rem; cursor: pointer; font-weight: 700; }
.modal-conta__abas .aba.ativa { background: var(--verde); color: #fff; border-color: var(--verde); }
#mc-form { display: grid; gap: 0.6rem; }
#mc-form input { padding: 0.7rem; border: 2px solid var(--noite-2); border-radius: 10px; font-size: 1rem; }
#mc-form button { background: var(--ouro); color: var(--tinta); border: 0; border-radius: 10px; padding: 0.75rem; font-family: var(--display); font-weight: 700; text-transform: uppercase; cursor: pointer; }
.modal-conta__aviso { font-size: 0.8rem; opacity: 0.7; margin: 0.5rem 0; }
.modal-conta__ou { text-align: center; opacity: 0.6; margin: 0.5rem 0; font-family: var(--mono); }
#mc-google { display: flex; justify-content: center; min-height: 40px; }
.modal-conta__erro { color: var(--coral); font-weight: 700; min-height: 1.2em; margin: 0.5rem 0 0; }
```

- [ ] **Step 5: Verificar no preview** (controlador)
- `node --check js/conta-ui.js`; recarregar a página.
- A barra no topo mostra "Entrar pra disputar o pódio 🏆".
- Clicar abre o modal com abas Entrar/Criar, campos usuário/PIN e o aviso do PIN.
- Conferir no console que não há erro de JS. (O `/api/config` e `/api/auth` dão 404 no dev estático — o modal abre mesmo assim; o botão Google só aparece com `GOOGLE_CLIENT_ID` setado em produção. Registrar/entrar de verdade só funcionam no deploy com banco.)
- Tirar screenshot do modal aberto.

- [ ] **Step 6: Commit**
```bash
cd "C:/Users/jenni/Downloads/Sites/copa-hexa"
git add js/conta-ui.js index.html js/app.js styles.css
git commit -m "feat: barra de identidade e modal de login"
```

---

## Self-Review (autor do plano)

- **Cobertura do spec (Plano 1):** tabela `usuarios` com nome/foto (Task 4);
  PIN com scrypt (Task 2); sessão JWT (Task 3); validação (Task 1); serviço de
  auth com registrar/entrar/google usando nome+foto do Google (Task 5);
  serverless + config do client id (Task 6); cliente de sessão (Task 7); barra
  + modal com Google e aviso de PIN sem recuperação, login opcional (Task 8).
  Persistência de palpites por conta, placar do jogo e rankings ficam para o
  Plano 2 (fora do escopo aqui).
- **Placeholders:** nenhum — todo passo tem código completo.
- **Consistência de tipos:** o "perfil" `{ id, nome, foto }` é o mesmo
  devolvido por `db.mapaUsuario`, por `auth-servico.resposta` e consumido por
  `conta.js`/`conta-ui.js`; `buscarPorUsername` acrescenta `pinHash` usado por
  `verificarPin`; `verificarGoogle` devolve `{ sub, name, picture }` consumido
  por `tratarAuth` → `acharOuCriarGoogle({ googleSub, nome, fotoUrl })`. O
  token é assinado com `{ id, nome }` e o segredo vem de `SESSION_SECRET`.
- **Segurança:** `esc()` escapa nome/foto vindos do Google antes de ir pro
  HTML (evita injeção); PIN com scrypt + `timingSafeEqual`; sessão com
  `timingSafeEqual` e expiração.
