# Copa pra Leigos — Plano 1: Fundação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Montar o esqueleto do site e a lógica de domínio (termômetro do hexa, pontuação de palpites, distribuição da "vibe", glossário), com testes, renderizando todas as seções de informação a partir de dados mock.

**Architecture:** Site de página única em HTML/CSS/JS puro (ES Modules). A lógica de domínio fica em módulos `js/*.js` puros e testáveis com o runner nativo do Node (`node --test`), importados tanto pelo navegador quanto pelos testes. A camada de renderização (`render.js`) transforma um JSON normalizado em DOM. Neste plano os dados vêm de um arquivo mock (`fixtures/estado-mock.json`); planos seguintes trocam a origem para `/api/dados` sem mexer na renderização.

**Tech Stack:** HTML5, CSS3, JavaScript ES Modules, Node.js (test runner nativo `node --test`). Sem frameworks. Deploy futuro na Vercel.

**Planos seguintes (fora do escopo deste):** Plano 2 (dados ao vivo via serverless), Plano 3 (palpites + ranking no Neon), Plano 4 (animações e compartilhamento).

> **Git:** o repositório `copa-hexa/` já está inicializado com `user.email = jenni.o.bruno@gmail.com` e `user.name = jenniobruno-uxdesigner` (exigência do Vercel Hobby). Não altere essa config. Commite com mensagens em português, no padrão `tipo: descrição`.

---

## File Structure

```
copa-hexa/
  package.json              # type:module, scripts test/dev
  index.html               # esqueleto com os containers de cada seção
  styles.css               # base visual festiva (cores do Brasil)
  fixtures/
    estado-mock.json       # dados normalizados de exemplo (Plano 1)
  js/
    termometro.js          # statusHexa(estado) -> status do hexa
    termometro.test.js
    pontuacao.js           # pontuarPalpite(palpite, resultado) -> 0|1|3
    pontuacao.test.js
    distribuicao.js        # calcularVibe(palpites) -> distribuição
    distribuicao.test.js
    glossario.js           # definicao(chave), todos() — fonte única de termos
    glossario.test.js
    render.js              # funções que montam o DOM de cada seção
    app.js                 # ponto de entrada: carrega dados e renderiza
```

Cada módulo `js/*.js` tem uma responsabilidade única. `render.js` depende dos módulos de domínio; `app.js` orquestra. Os módulos de domínio não dependem do DOM (por isso são testáveis no Node).

---

## Task 1: Scaffold do projeto

**Files:**
- Create: `copa-hexa/package.json`
- Create: `copa-hexa/index.html`
- Create: `copa-hexa/fixtures/estado-mock.json`
- Create: `copa-hexa/styles.css` (vazio por ora, preenchido na Task 7)

- [ ] **Step 1: Criar `package.json`**

```json
{
  "name": "copa-hexa",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test",
    "dev": "npx --yes serve -l 3000"
  }
}
```

- [ ] **Step 2: Criar `fixtures/estado-mock.json`** (formato normalizado do spec)

```json
{
  "atualizadoEm": "2026-06-25T12:00:00Z",
  "fonte": "manual",
  "proximoJogo": {
    "id": "BRA-SRB-2026-06-28",
    "adversario": "Sérvia",
    "data": "2026-06-28T19:00:00Z",
    "fase": "Fase de grupos - 2ª rodada",
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

- [ ] **Step 3: Criar `index.html`** (esqueleto com containers de cada seção)

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Temos chance ao hexa? — A Copa pra quem não saca de futebol</title>
  <link rel="stylesheet" href="./styles.css" />
</head>
<body>
  <header class="topo">
    <h1 class="topo__titulo">Temos chance ao hexa? 🇧🇷</h1>
    <section id="termometro" class="termometro" aria-live="polite"></section>
  </header>

  <main>
    <section class="intro">
      <h2>Calma, eu te explico 😄</h2>
      <p>
        Esse site é pra quem quer entrar na festa da Copa e torcer pelo Brasil
        <strong>sem saber nada de futebol</strong>. Aqui a gente traduz tudo:
        como o Brasil está indo, o que precisa acontecer no próximo jogo e o
        que cada palavra esquisita significa. Sem vergonha de perguntar. 🎉
      </p>
    </section>

    <section id="proximo-jogo" class="proximo"></section>
    <section id="grupo" class="grupo"></section>
    <section id="craques" class="craques-secao"></section>

    <section id="palpite" class="palpite">
      <!-- Preenchido no Plano 3 (palpites + ranking) -->
    </section>

    <section id="glossario" class="glossario-secao"></section>

    <section id="compartilhar" class="compartilhar">
      <!-- Preenchido no Plano 4 (compartilhamento) -->
    </section>
  </main>

  <script type="module" src="./js/app.js"></script>
</body>
</html>
```

- [ ] **Step 4: Criar `styles.css` vazio** (placeholder de arquivo, estilizado na Task 7)

```css
/* Estilos preenchidos na Task 7 */
```

- [ ] **Step 5: Rodar os testes (ainda não há testes)**

Run: `cd copa-hexa && npm test`
Expected: o `node --test` roda sem encontrar testes e termina com sucesso (0 testes, exit 0).

- [ ] **Step 6: Commit**

```bash
cd copa-hexa
git add package.json index.html fixtures/estado-mock.json styles.css
git commit -m "feat: scaffold do projeto Copa pra Leigos"
```

---

## Task 2: Termômetro do hexa (`termometro.js`)

**Files:**
- Create: `copa-hexa/js/termometro.js`
- Test: `copa-hexa/js/termometro.test.js`

A função `statusHexa(estado)` recebe um objeto com a situação do Brasil e
devolve `{ nivel, emoji, titulo, oQuePrecisa }`.

Formato do `estado` de entrada:
```js
{
  situacao: 'grupos' | 'mata-mata' | 'eliminado' | 'campeao',
  posicaoGrupo: number,          // usado quando situacao === 'grupos'
  vagasNoGrupo: number,          // quantos passam de fase (ex.: 2)
  classificadoGarantido: boolean,// já garantiu vaga mesmo ainda nos grupos
  proximoAdversario: string | null
}
```

- [ ] **Step 1: Escrever os testes que falham**

```js
// js/termometro.test.js
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
```

- [ ] **Step 2: Rodar para confirmar que falha**

Run: `cd copa-hexa && node --test js/termometro.test.js`
Expected: FAIL — `Cannot find module './termometro.js'` (arquivo ainda não existe).

- [ ] **Step 3: Implementar `termometro.js`**

```js
// js/termometro.js

function ordinal(n) {
  return `${n}º`;
}

function comAdversario(estado, base) {
  if (estado.proximoAdversario) {
    return `${base} Próximo jogo: contra ${estado.proximoAdversario}.`;
  }
  return base;
}

export function statusHexa(estado) {
  if (estado.situacao === 'campeao') {
    return {
      nivel: 'hexa',
      emoji: '🏆',
      titulo: 'HEXA!',
      oQuePrecisa: 'Acabou: o Brasil é campeão! Pode comemorar até cansar. 🎉',
    };
  }

  if (estado.situacao === 'eliminado') {
    return {
      nivel: 'eliminado',
      emoji: '😢',
      titulo: 'A Copa acabou pra gente desta vez',
      oQuePrecisa:
        'O Brasil foi eliminado. Agora é torcer pra próxima — e você já aprendeu um monte de regras pelo caminho.',
    };
  }

  if (estado.situacao === 'mata-mata') {
    return {
      nivel: 'muito-bem',
      emoji: '🟢',
      titulo: 'Indo muito bem!',
      oQuePrecisa: comAdversario(
        estado,
        'O Brasil já está no mata-mata: agora cada jogo é decisão. Quem perde, vai pra casa.'
      ),
    };
  }

  // situacao === 'grupos'
  if (estado.classificadoGarantido) {
    return {
      nivel: 'muito-bem',
      emoji: '🟢',
      titulo: 'Indo muito bem!',
      oQuePrecisa:
        'O Brasil já garantiu a vaga na próxima fase. Agora é manter o ritmo.',
    };
  }

  if (estado.posicaoGrupo <= estado.vagasNoGrupo) {
    return {
      nivel: 'no-caminho',
      emoji: '🙂',
      titulo: 'No caminho',
      oQuePrecisa: comAdversario(
        estado,
        `O Brasil está em ${ordinal(estado.posicaoGrupo)} e os ${estado.vagasNoGrupo} primeiros do grupo passam de fase. Bem encaminhado, falta confirmar.`
      ),
    };
  }

  return {
    nivel: 'alerta',
    emoji: '🟡',
    titulo: 'Sinal de alerta',
    oQuePrecisa: comAdversario(
      estado,
      `O Brasil está em ${ordinal(estado.posicaoGrupo)} e só os ${estado.vagasNoGrupo} primeiros passam. Precisa vencer pra voltar pro grupo dos classificados.`
    ),
  };
}
```

- [ ] **Step 4: Rodar para confirmar que passa**

Run: `cd copa-hexa && node --test js/termometro.test.js`
Expected: PASS — 8 testes passando.

- [ ] **Step 5: Commit**

```bash
cd copa-hexa
git add js/termometro.js js/termometro.test.js
git commit -m "feat: termômetro do hexa por regras transparentes"
```

---

## Task 3: Pontuação de palpites (`pontuacao.js`)

**Files:**
- Create: `copa-hexa/js/pontuacao.js`
- Test: `copa-hexa/js/pontuacao.test.js`

`pontuarPalpite(palpite, resultado)` compara dois objetos
`{ placarBrasil, placarAdversario }` e devolve: **3** (placar exato),
**1** (acertou só o vencedor/empate) ou **0** (errou).

- [ ] **Step 1: Escrever os testes que falham**

```js
// js/pontuacao.test.js
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

test('errar o resultado vale 0', () => {
  const p = pontuarPalpite({ placarBrasil: 2, placarAdversario: 1 }, { placarBrasil: 0, placarAdversario: 1 });
  assert.equal(p, 0);
});
```

- [ ] **Step 2: Rodar para confirmar que falha**

Run: `cd copa-hexa && node --test js/pontuacao.test.js`
Expected: FAIL — `Cannot find module './pontuacao.js'`.

- [ ] **Step 3: Implementar `pontuacao.js`**

```js
// js/pontuacao.js

function resultado(placarBrasil, placarAdversario) {
  return Math.sign(placarBrasil - placarAdversario);
}

export function pontuarPalpite(palpite, real) {
  const exato =
    palpite.placarBrasil === real.placarBrasil &&
    palpite.placarAdversario === real.placarAdversario;
  if (exato) return 3;

  const mesmoResultado =
    resultado(palpite.placarBrasil, palpite.placarAdversario) ===
    resultado(real.placarBrasil, real.placarAdversario);
  if (mesmoResultado) return 1;

  return 0;
}
```

- [ ] **Step 4: Rodar para confirmar que passa**

Run: `cd copa-hexa && node --test js/pontuacao.test.js`
Expected: PASS — 4 testes passando.

- [ ] **Step 5: Commit**

```bash
cd copa-hexa
git add js/pontuacao.js js/pontuacao.test.js
git commit -m "feat: pontuação de palpites (3/1/0)"
```

---

## Task 4: Distribuição da "vibe da galera" (`distribuicao.js`)

**Files:**
- Create: `copa-hexa/js/distribuicao.js`
- Test: `copa-hexa/js/distribuicao.test.js`

`calcularVibe(palpites)` recebe uma lista de `{ placarBrasil, placarAdversario }`
e devolve `{ total, placares }`, onde `placares` é uma lista de
`{ rotulo, quantidade, percentual }` ordenada do mais palpitado para o menos.

- [ ] **Step 1: Escrever os testes que falham**

```js
// js/distribuicao.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularVibe } from './distribuicao.js';

test('lista vazia devolve total 0 e nenhum placar', () => {
  const v = calcularVibe([]);
  assert.equal(v.total, 0);
  assert.deepEqual(v.placares, []);
});

test('conta e ordena os placares mais palpitados primeiro', () => {
  const v = calcularVibe([
    { placarBrasil: 2, placarAdversario: 1 },
    { placarBrasil: 2, placarAdversario: 1 },
    { placarBrasil: 1, placarAdversario: 0 },
  ]);
  assert.equal(v.total, 3);
  assert.equal(v.placares[0].rotulo, '2x1');
  assert.equal(v.placares[0].quantidade, 2);
  assert.equal(v.placares[0].percentual, 67);
});

test('o percentual é arredondado e relativo ao total', () => {
  const v = calcularVibe([
    { placarBrasil: 1, placarAdversario: 0 },
    { placarBrasil: 0, placarAdversario: 1 },
  ]);
  assert.equal(v.placares[0].percentual, 50);
});
```

- [ ] **Step 2: Rodar para confirmar que falha**

Run: `cd copa-hexa && node --test js/distribuicao.test.js`
Expected: FAIL — `Cannot find module './distribuicao.js'`.

- [ ] **Step 3: Implementar `distribuicao.js`**

```js
// js/distribuicao.js

export function calcularVibe(palpites) {
  const total = palpites.length;
  const contagem = new Map();

  for (const p of palpites) {
    const rotulo = `${p.placarBrasil}x${p.placarAdversario}`;
    contagem.set(rotulo, (contagem.get(rotulo) || 0) + 1);
  }

  const placares = [...contagem.entries()]
    .map(([rotulo, quantidade]) => ({
      rotulo,
      quantidade,
      percentual: total ? Math.round((quantidade / total) * 100) : 0,
    }))
    .sort((a, b) => b.quantidade - a.quantidade);

  return { total, placares };
}
```

- [ ] **Step 4: Rodar para confirmar que passa**

Run: `cd copa-hexa && node --test js/distribuicao.test.js`
Expected: PASS — 3 testes passando.

- [ ] **Step 5: Commit**

```bash
cd copa-hexa
git add js/distribuicao.js js/distribuicao.test.js
git commit -m "feat: distribuição da vibe da galera"
```

---

## Task 5: Glossário — fonte única de termos (`glossario.js`)

**Files:**
- Create: `copa-hexa/js/glossario.js`
- Test: `copa-hexa/js/glossario.test.js`

Fonte única dos termos, usada tanto pela seção "Cola da Copa" quanto pelos
tooltips inline (Plano 4). `definicao(chave)` devolve `{ termo, definicao }`
ou `undefined`; `todos()` devolve a lista completa.

- [ ] **Step 1: Escrever os testes que falham**

```js
// js/glossario.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { definicao, todos } from './glossario.js';

test('devolve a definição de um termo conhecido', () => {
  const d = definicao('impedimento');
  assert.ok(d);
  assert.equal(d.termo, 'Impedimento');
  assert.ok(d.definicao.length > 0);
});

test('termo desconhecido devolve undefined', () => {
  assert.equal(definicao('xablau'), undefined);
});

test('todos() devolve a lista completa de termos', () => {
  const lista = todos();
  assert.ok(lista.length >= 6);
  for (const item of lista) {
    assert.ok(item.termo.length > 0);
    assert.ok(item.definicao.length > 0);
  }
});
```

- [ ] **Step 2: Rodar para confirmar que falha**

Run: `cd copa-hexa && node --test js/glossario.test.js`
Expected: FAIL — `Cannot find module './glossario.js'`.

- [ ] **Step 3: Implementar `glossario.js`** (linguagem de criança de 6 anos)

```js
// js/glossario.js

const TERMOS = {
  impedimento: {
    termo: 'Impedimento',
    definicao:
      'É quando um jogador do time que ataca está "adiantado demais", mais perto do gol do que quase todos os adversários, na hora que a bola é tocada pra ele. Aí o juiz não deixa valer, pra ninguém ficar só esperando o gol perto da trave.',
  },
  escanteio: {
    termo: 'Escanteio',
    definicao:
      'Quando a bola sai pela linha do fundo e quem tocou por último foi o time que defende, o outro time bate a bola lá do cantinho do campo. É uma boa chance de fazer gol.',
  },
  penalti: {
    termo: 'Pênalti',
    definicao:
      'Uma falta feia bem pertinho do gol. O time que sofreu ganha um chute só, de frente pro goleiro, da marca branca. É quase um gol na certa.',
  },
  faseDeGrupos: {
    termo: 'Fase de grupos',
    definicao:
      'No começo da Copa, os times são divididos em grupinhos. Todo mundo joga contra todo mundo do seu grupo, e os melhores de cada grupo passam para a próxima fase.',
  },
  mataMata: {
    termo: 'Mata-mata',
    definicao:
      'Depois da fase de grupos, é "ganhou, passa; perdeu, vai pra casa". Não tem segunda chance: cada jogo é uma final.',
  },
  saldoDeGols: {
    termo: 'Saldo de gols',
    definicao:
      'É a conta dos gols que o time fez menos os gols que tomou. Serve de critério de desempate: quem fez mais e tomou menos fica na frente.',
  },
  cartaoAmarelo: {
    termo: 'Cartão amarelo',
    definicao:
      'Um aviso do juiz: "ó, pegou pesado". Dois amarelos no mesmo jogo viram vermelho, e aí o jogador é expulso.',
  },
  cartaoVermelho: {
    termo: 'Cartão vermelho',
    definicao:
      'O jogador fez algo grave e tem que sair do jogo na hora. O time dele fica com um jogador a menos até o fim.',
  },
};

export function definicao(chave) {
  return TERMOS[chave];
}

export function todos() {
  return Object.values(TERMOS);
}
```

- [ ] **Step 4: Rodar para confirmar que passa**

Run: `cd copa-hexa && node --test js/glossario.test.js`
Expected: PASS — 3 testes passando.

- [ ] **Step 5: Commit**

```bash
cd copa-hexa
git add js/glossario.js js/glossario.test.js
git commit -m "feat: glossário (fonte única de termos)"
```

---

## Task 6: Renderização e orquestração (`render.js` + `app.js`)

**Files:**
- Create: `copa-hexa/js/render.js`
- Create: `copa-hexa/js/app.js`

Verificação visual (não há teste unitário de DOM neste plano — o conteúdo é
verificado pelo preview).

> Nota: em `app.js`, `estadoDoBrasil()` deriva o `estado` do termômetro de
> forma simplificada (assume `situacao: 'grupos'`). O Plano 2 refina isso com
> a fase real vinda da API. Para os dados mock, isso é suficiente.

- [ ] **Step 1: Implementar `render.js`**

```js
// js/render.js
import { statusHexa } from './termometro.js';
import { todos } from './glossario.js';

export function renderTermometro(el, estado) {
  const s = statusHexa(estado);
  el.className = `termometro nivel-${s.nivel}`;
  el.innerHTML = `
    <div class="termometro__emoji">${s.emoji}</div>
    <h2 class="termometro__titulo">${s.titulo}</h2>
    <p class="termometro__detalhe">${s.oQuePrecisa}</p>
  `;
}

export function renderProximoJogo(el, proximoJogo) {
  if (!proximoJogo) {
    el.innerHTML = '<h2>Próximo jogo</h2><p>Sem jogo marcado no momento.</p>';
    return;
  }
  const quando = new Date(proximoJogo.data).toLocaleString('pt-BR', {
    dateStyle: 'full',
    timeStyle: 'short',
  });
  el.innerHTML = `
    <h2>Próximo jogo ⚽</h2>
    <p class="proximo__adversario">Brasil <span>x</span> ${proximoJogo.adversario}</p>
    <p class="proximo__quando">${quando}</p>
    <p class="proximo__fase">${proximoJogo.fase}</p>
  `;
}

export function renderGrupo(el, grupo) {
  const linhas = grupo.times
    .map(
      (t) => `
      <tr${t.nome === 'Brasil' ? ' class="destaque"' : ''}>
        <td>${t.posicao}º</td>
        <td>${t.nome}</td>
        <td>${t.pontos}</td>
        <td>${t.jogos}</td>
        <td>${t.saldo > 0 ? '+' : ''}${t.saldo}</td>
      </tr>`
    )
    .join('');
  el.innerHTML = `
    <h2>O grupo do Brasil — ${grupo.nome}</h2>
    <p class="grupo__legenda">Os 2 primeiros passam de fase. Quanto mais pontos, melhor.</p>
    <table class="grupo__tabela">
      <thead>
        <tr><th>Pos</th><th>Time</th><th>Pontos</th><th>Jogos</th><th>Saldo</th></tr>
      </thead>
      <tbody>${linhas}</tbody>
    </table>
  `;
}

export function renderCraques(el, artilheiros) {
  if (!artilheiros || artilheiros.length === 0) {
    el.innerHTML = '<h2>Craques pra torcer</h2><p>Ainda sem gols na conta.</p>';
    return;
  }
  const itens = artilheiros
    .map(
      (a) => `
      <li>
        <span class="craque__nome">${a.nome}</span>
        <span class="craque__time">${a.time}</span>
        <span class="craque__gols">⚽ ${a.gols}</span>
      </li>`
    )
    .join('');
  el.innerHTML = `<h2>Craques pra torcer</h2><ul class="craques">${itens}</ul>`;
}

export function renderGlossario(el) {
  const cards = todos()
    .map(
      (t) => `
      <div class="glossario__card">
        <h3>${t.termo}</h3>
        <p>${t.definicao}</p>
      </div>`
    )
    .join('');
  el.innerHTML = `
    <h2>Cola da Copa 🥅</h2>
    <p class="glossario__legenda">As regras do futebol explicadas pra quem tem 6 anos (ou age como se tivesse).</p>
    <div class="glossario">${cards}</div>
  `;
}
```

- [ ] **Step 2: Implementar `app.js`**

```js
// js/app.js
import * as render from './render.js';

function estadoDoBrasil(dados) {
  const brasil = dados.grupo.times.find((t) => t.nome === 'Brasil');
  return {
    situacao: 'grupos',
    posicaoGrupo: brasil ? brasil.posicao : 99,
    vagasNoGrupo: 2,
    classificadoGarantido: false,
    proximoAdversario: dados.proximoJogo ? dados.proximoJogo.adversario : null,
  };
}

async function init() {
  const resp = await fetch('./fixtures/estado-mock.json');
  const dados = await resp.json();

  render.renderTermometro(document.querySelector('#termometro'), estadoDoBrasil(dados));
  render.renderProximoJogo(document.querySelector('#proximo-jogo'), dados.proximoJogo);
  render.renderGrupo(document.querySelector('#grupo'), dados.grupo);
  render.renderCraques(document.querySelector('#craques'), dados.artilheiros);
  render.renderGlossario(document.querySelector('#glossario'));
}

init();
```

- [ ] **Step 3: Subir o servidor de preview**

Use a ferramenta de preview (preview_start) apontando para `copa-hexa/`
(comando `npm run dev`, porta 3000). Abra `http://localhost:3000/`.

- [ ] **Step 4: Verificar no preview**

- Conferir no console (preview_console_logs) que não há erros de JS nem de
  carregamento de módulo.
- Conferir com preview_snapshot que aparecem: o termômetro com "No caminho"
  (Brasil em 1º, dentro das 2 vagas), o próximo jogo (Brasil x Sérvia), a
  tabela do grupo com o Brasil destacado, os craques e os cards do glossário.

- [ ] **Step 5: Commit**

```bash
cd copa-hexa
git add js/render.js js/app.js
git commit -m "feat: renderização das seções a partir de dados mock"
```

---

## Task 7: Estilo festivo base (`styles.css`)

**Files:**
- Modify: `copa-hexa/styles.css`

Visual festivo com as cores do Brasil (verde, amarelo, azul), mobile-first,
bom contraste. As animações pesadas (confete, bolinhas no cursor, joguinho)
ficam para o Plano 4 — aqui é a base estática.

- [ ] **Step 1: Escrever `styles.css`**

```css
:root {
  --verde: #009c3b;
  --amarelo: #ffdf00;
  --azul: #002776;
  --branco: #ffffff;
  --texto: #14213d;
  --alerta: #f4a300;
  --perigo: #c1121f;
  --sombra: 0 8px 24px rgba(0, 0, 0, 0.12);
  --raio: 16px;
  font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  color: var(--texto);
  background:
    radial-gradient(circle at 20% 10%, rgba(255, 223, 0, 0.25), transparent 40%),
    radial-gradient(circle at 80% 0%, rgba(0, 156, 59, 0.25), transparent 40%),
    var(--branco);
  line-height: 1.5;
}

main { max-width: 720px; margin: 0 auto; padding: 0 1rem 4rem; }

section { margin: 2.5rem 0; }

h2 { font-size: 1.5rem; margin-bottom: 0.75rem; }

/* Topo */
.topo {
  text-align: center;
  padding: 2.5rem 1rem 2rem;
  background: linear-gradient(135deg, var(--verde), var(--azul));
  color: var(--branco);
}
.topo__titulo { font-size: 2rem; margin: 0 0 1.5rem; }

/* Termômetro */
.termometro {
  max-width: 520px;
  margin: 0 auto;
  background: var(--branco);
  color: var(--texto);
  border-radius: var(--raio);
  padding: 1.5rem;
  box-shadow: var(--sombra);
  border-top: 8px solid var(--verde);
}
.termometro__emoji { font-size: 3rem; line-height: 1; }
.termometro__titulo { margin: 0.5rem 0; }
.termometro__detalhe { margin: 0; }
.termometro.nivel-alerta { border-top-color: var(--alerta); }
.termometro.nivel-eliminado { border-top-color: var(--perigo); }
.termometro.nivel-no-caminho { border-top-color: var(--amarelo); }
.termometro.nivel-muito-bem,
.termometro.nivel-hexa { border-top-color: var(--verde); }

/* Intro */
.intro {
  background: var(--amarelo);
  border-radius: var(--raio);
  padding: 1.5rem;
}

/* Próximo jogo */
.proximo__adversario { font-size: 1.5rem; font-weight: 700; }
.proximo__adversario span { color: var(--verde); margin: 0 0.4rem; }
.proximo__quando { font-weight: 600; }
.proximo__fase { opacity: 0.7; }

/* Tabela do grupo */
.grupo__tabela { width: 100%; border-collapse: collapse; }
.grupo__tabela th,
.grupo__tabela td { padding: 0.6rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
.grupo__tabela tr.destaque { background: rgba(255, 223, 0, 0.35); font-weight: 700; }
.grupo__legenda { opacity: 0.75; }

/* Craques */
.craques { list-style: none; padding: 0; display: grid; gap: 0.5rem; }
.craques li {
  display: flex; align-items: center; gap: 0.75rem;
  background: var(--branco); border-radius: 12px; padding: 0.75rem 1rem;
  box-shadow: var(--sombra);
}
.craque__nome { font-weight: 700; }
.craque__time { opacity: 0.7; }
.craque__gols { margin-left: auto; font-weight: 700; color: var(--verde); }

/* Glossário */
.glossario { display: grid; gap: 1rem; }
.glossario__card {
  background: var(--branco); border-radius: var(--raio);
  padding: 1.25rem; box-shadow: var(--sombra); border-left: 6px solid var(--azul);
}
.glossario__card h3 { margin: 0 0 0.5rem; color: var(--azul); }
.glossario__legenda { opacity: 0.75; }

@media (min-width: 560px) {
  .glossario { grid-template-columns: 1fr 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```

- [ ] **Step 2: Recarregar o preview e verificar**

- Recarregar a página no preview (preview_eval: `window.location.reload()`).
- preview_screenshot para conferir o visual festivo: topo verde/azul com o
  termômetro em destaque, intro amarela, tabela com Brasil destacado, cards
  do glossário em duas colunas no desktop.
- preview_resize para 375px de largura e novo screenshot, confirmando que no
  celular as seções empilham e continuam legíveis.

- [ ] **Step 3: Commit**

```bash
cd copa-hexa
git add styles.css
git commit -m "style: visual festivo base do site"
```

---

## Self-Review (preenchido pelo autor do plano)

- **Cobertura do spec (Plano 1):** termômetro (Task 2), pontuação (Task 3),
  distribuição (Task 4), glossário/fonte única (Task 5), seções de
  informação renderizadas — topo, intro, próximo jogo, grupo, craques,
  glossário (Tasks 1, 6, 7). Os containers de palpite e compartilhar existem
  vazios para os Planos 3 e 4. Dados ao vivo (Plano 2), palpites/Neon
  (Plano 3) e animações/compartilhamento (Plano 4) estão explicitamente fora
  deste plano.
- **Placeholders:** os únicos "vazios" são os containers `#palpite` e
  `#compartilhar`, que são escopo declarado de planos futuros — não são
  lacunas de implementação dentro de uma task.
- **Consistência de tipos:** o formato `{ placarBrasil, placarAdversario }`
  é usado igual em `pontuacao.js` e `distribuicao.js`; o `estado` do
  termômetro tem o mesmo formato no teste, na implementação e em
  `app.js#estadoDoBrasil`; o JSON normalizado do mock casa com o que
  `render.js` consome.
```
