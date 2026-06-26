# Copa pra Leigos — Plano 4: Camada festiva

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar o clima de festa: confete na entrada, bolinhas de futebol saindo do cursor, um joguinho de bater pênalti (com confete ao marcar), termos técnicos clicáveis explicados inline, e botões de compartilhar.

**Architecture:** A lógica pura e testável (marcar termos no texto, montar o link do WhatsApp) fica em módulos `js/` com testes. Os efeitos visuais (confete, bolinhas, joguinho, tooltips) ficam em módulos próprios, autocontidos, verificados no navegador via preview. Tudo respeita `prefers-reduced-motion`.

**Tech Stack:** JavaScript ES Modules, Canvas 2D (confete), CSS animations, `node --test`. Sem libs externas.

> **Git:** repositório `copa-hexa/`, autor `jenni.o.bruno@gmail.com` (Vercel Hobby). Não altere a config.

## File Structure
```
copa-hexa/
  js/
    termos-inline.js       # marcarTermos(texto) (puro) + ativarTooltipsTermos (DOM)
    termos-inline.test.js
    compartilhar.js        # linkWhatsApp(texto, url) (puro)
    compartilhar.test.js
    confete.js             # dispararConfete() (visual, canvas)
    cursor-bolas.js        # ativarCursorBolas(seletores) (visual)
    joguinho.js            # montarJoguinho(el, {onGol}) (interativo)
    render.js              # + renderCompartilhar; marcarTermos no termômetro/jogo; joguinho no glossário
    app.js                 # liga confete, bolinhas, joguinho, tooltips e compartilhar
  styles.css               # + estilos da camada festiva
```

---

## Task 1: Termos inline (`js/termos-inline.js`)

**Files:** Create `js/termos-inline.js`, `js/termos-inline.test.js`.

`marcarTermos(texto)` recebe um texto puro e devolve HTML com a primeira
ocorrência de cada termo conhecido embrulhada num botão clicável
(`<button class="termo" data-termo="chave">…</button>`). As definições vêm de
`js/glossario.js`. `ativarTooltipsTermos()` (parte DOM, sem teste unitário)
mostra a definição num balão ao clicar.

- [ ] **Step 1: Escrever o teste que falha `js/termos-inline.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { marcarTermos } from './termos-inline.js';

test('embrulha um termo conhecido num botão clicável', () => {
  const html = marcarTermos('Isso aí foi impedimento, viu?');
  assert.match(html, /<button[^>]*class="termo"[^>]*data-termo="impedimento"[^>]*>impedimento<\/button>/);
});

test('marca mais de um termo no mesmo texto', () => {
  const html = marcarTermos('Na fase de grupos é diferente do mata-mata.');
  assert.match(html, /data-termo="faseDeGrupos"/);
  assert.match(html, /data-termo="mataMata"/);
});

test('texto sem termo conhecido volta inalterado (mas escapado)', () => {
  assert.equal(marcarTermos('Vamos pra praia'), 'Vamos pra praia');
});

test('escapa HTML do texto de entrada', () => {
  const html = marcarTermos('1 < 2 & 3 > 0');
  assert.match(html, /1 &lt; 2 &amp; 3 &gt; 0/);
});

test('marca só a primeira ocorrência de um termo', () => {
  const html = marcarTermos('pênalti e mais um pênalti');
  const ocorrencias = html.match(/data-termo="penalti"/g) || [];
  assert.equal(ocorrencias.length, 1);
});
```

- [ ] **Step 2: Rodar, esperar FAIL** (`Cannot find module './termos-inline.js'`).

- [ ] **Step 3: Implementar `js/termos-inline.js`**

```js
import { definicao } from './glossario.js';

// Frase (regex sem flag global = só a 1ª ocorrência) -> chave do glossário.
const TERMOS_INLINE = [
  { re: /fase de grupos/i, chave: 'faseDeGrupos' },
  { re: /mata-mata/i, chave: 'mataMata' },
  { re: /impedimento/i, chave: 'impedimento' },
  { re: /escanteio/i, chave: 'escanteio' },
  { re: /pênalti/i, chave: 'penalti' },
  { re: /saldo de gols/i, chave: 'saldoDeGols' },
];

function escaparHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function marcarTermos(texto) {
  let resultado = escaparHtml(texto);
  for (const { re, chave } of TERMOS_INLINE) {
    if (!definicao(chave)) continue;
    resultado = resultado.replace(
      re,
      (m) => `<button type="button" class="termo" data-termo="${chave}">${m}</button>`
    );
  }
  return resultado;
}

export function ativarTooltipsTermos(raiz = document) {
  let balao = null;
  const fechar = () => {
    if (balao) {
      balao.remove();
      balao = null;
    }
  };

  raiz.addEventListener('click', (e) => {
    const alvo = e.target.closest('.termo');
    fechar();
    if (!alvo) return;
    e.preventDefault();
    const def = definicao(alvo.dataset.termo);
    if (!def) return;

    balao = document.createElement('div');
    balao.className = 'termo-balao';
    balao.innerHTML = `<strong>${def.termo}</strong><br>${def.definicao}`;
    document.body.appendChild(balao);

    const r = alvo.getBoundingClientRect();
    balao.style.left = `${Math.max(8, r.left + window.scrollX)}px`;
    balao.style.top = `${r.bottom + window.scrollY + 6}px`;
  });
}
```

- [ ] **Step 4: Rodar, esperar PASS (5 testes).**

- [ ] **Step 5: Commit**
```bash
cd "C:/Users/jenni/Downloads/Sites/copa-hexa"
git add js/termos-inline.js js/termos-inline.test.js
git commit -m "feat: termos técnicos clicáveis explicados inline"
```

---

## Task 2: Link de compartilhamento (`js/compartilhar.js`)

**Files:** Create `js/compartilhar.js`, `js/compartilhar.test.js`.

- [ ] **Step 1: Escrever o teste que falha `js/compartilhar.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { linkWhatsApp } from './compartilhar.js';

test('monta uma URL wa.me com o texto e a URL codificados', () => {
  const link = linkWhatsApp('Bora torcer!', 'https://copa-hexa.vercel.app');
  assert.match(link, /^https:\/\/wa\.me\/\?text=/);
  assert.match(link, /Bora%20torcer!/);
  assert.match(link, /https%3A%2F%2Fcopa-hexa\.vercel\.app/);
});

test('codifica acentos corretamente', () => {
  const link = linkWhatsApp('Hexa é nóis', 'https://x.com');
  assert.match(link, /n%C3%B3is/);
});
```

- [ ] **Step 2: Rodar, esperar FAIL.**

- [ ] **Step 3: Implementar `js/compartilhar.js`**

```js
export function linkWhatsApp(texto, url) {
  const mensagem = `${texto} ${url}`.trim();
  return `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
}
```

- [ ] **Step 4: Rodar, esperar PASS (2 testes).**

- [ ] **Step 5: Commit**
```bash
cd "C:/Users/jenni/Downloads/Sites/copa-hexa"
git add js/compartilhar.js js/compartilhar.test.js
git commit -m "feat: link de compartilhamento no WhatsApp"
```

---

## Task 3: Confete (`js/confete.js`)

**Files:** Create `js/confete.js`. Visual — sem teste unitário (verificado no preview na Task 6). Verificar só a sintaxe.

- [ ] **Step 1: Implementar `js/confete.js`**

```js
export function dispararConfete({ quantidade = 140 } = {}) {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }
  const cores = ['#009c3b', '#ffdf00', '#002776', '#ffffff'];
  const canvas = document.createElement('canvas');
  canvas.style.cssText =
    'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const particulas = Array.from({ length: quantidade }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.3,
    r: 4 + Math.random() * 6,
    cor: cores[Math.floor(Math.random() * cores.length)],
    vx: -2 + Math.random() * 4,
    vy: 2 + Math.random() * 4,
    giro: Math.random() * Math.PI,
    vgiro: -0.2 + Math.random() * 0.4,
  }));

  let frames = 0;
  const maxFrames = 220;
  function quadro() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particulas) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.03;
      p.giro += p.vgiro;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.giro);
      ctx.fillStyle = p.cor;
      ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r);
      ctx.restore();
    }
    frames += 1;
    if (frames < maxFrames) {
      requestAnimationFrame(quadro);
    } else {
      canvas.remove();
    }
  }
  requestAnimationFrame(quadro);
}
```

- [ ] **Step 2: Verificar a sintaxe**
Run: `cd "C:/Users/jenni/Downloads/Sites/copa-hexa" && node --check js/confete.js`
Expected: sem saída (ok).

- [ ] **Step 3: Commit**
```bash
cd "C:/Users/jenni/Downloads/Sites/copa-hexa"
git add js/confete.js
git commit -m "feat: confete (canvas) nas cores do Brasil"
```

---

## Task 4: Bolinhas no cursor (`js/cursor-bolas.js`)

**Files:** Create `js/cursor-bolas.js`. Visual — verificar só a sintaxe.

- [ ] **Step 1: Implementar `js/cursor-bolas.js`**

```js
export function ativarCursorBolas(seletores) {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }
  let ultimo = 0;
  const aoMover = (e) => {
    const agora = Date.now();
    if (agora - ultimo < 60) return; // throttle pra não exagerar
    ultimo = agora;
    criarBola(e.clientX, e.clientY);
  };
  for (const sel of seletores) {
    const el = document.querySelector(sel);
    if (el) el.addEventListener('mousemove', aoMover);
  }
}

function criarBola(x, y) {
  const bola = document.createElement('span');
  bola.className = 'cursor-bola';
  bola.textContent = '⚽';
  bola.style.left = `${x}px`;
  bola.style.top = `${y}px`;
  document.body.appendChild(bola);
  setTimeout(() => bola.remove(), 900);
}
```

- [ ] **Step 2: Verificar a sintaxe**
Run: `cd "C:/Users/jenni/Downloads/Sites/copa-hexa" && node --check js/cursor-bolas.js`

- [ ] **Step 3: Commit**
```bash
cd "C:/Users/jenni/Downloads/Sites/copa-hexa"
git add js/cursor-bolas.js
git commit -m "feat: rastro de bolinhas de futebol no cursor"
```

---

## Task 5: Joguinho de pênalti (`js/joguinho.js`)

**Files:** Create `js/joguinho.js`. Interativo — verificar a sintaxe; comportamento verificado no preview na Task 6.

- [ ] **Step 1: Implementar `js/joguinho.js`**

```js
const CANTOS = [
  { id: 'esquerda', rotulo: '⬅️ Esquerda' },
  { id: 'meio', rotulo: '⬆️ Meio' },
  { id: 'direita', rotulo: 'Direita ➡️' },
];

export function montarJoguinho(el, { onGol } = {}) {
  let gols = 0;
  let chutes = 0;

  el.innerHTML = `
    <h3>Bate um pênalti! ⚽</h3>
    <p class="joguinho__dica">Escolha um canto. Se enganar o goleiro, é gol (e vem confete)!</p>
    <div class="joguinho__gol">🥅</div>
    <div class="joguinho__botoes">
      ${CANTOS.map((c) => `<button type="button" data-canto="${c.id}">${c.rotulo}</button>`).join('')}
    </div>
    <p class="joguinho__msg" id="joguinho-msg" aria-live="polite"></p>
    <p class="joguinho__placar" id="joguinho-placar">Gols: 0 de 0</p>
  `;

  const msg = el.querySelector('#joguinho-msg');
  const placar = el.querySelector('#joguinho-placar');

  el.querySelectorAll('[data-canto]').forEach((botao) => {
    botao.addEventListener('click', () => {
      const escolha = botao.dataset.canto;
      const defesa = CANTOS[Math.floor(Math.random() * CANTOS.length)].id;
      chutes += 1;
      if (escolha !== defesa) {
        gols += 1;
        msg.textContent = 'GOOOOL! 🎉';
        if (onGol) onGol();
      } else {
        msg.textContent = 'O goleiro defendeu! 🧤 Tenta de novo.';
      }
      placar.textContent = `Gols: ${gols} de ${chutes}`;
    });
  });
}
```

- [ ] **Step 2: Verificar a sintaxe**
Run: `cd "C:/Users/jenni/Downloads/Sites/copa-hexa" && node --check js/joguinho.js`

- [ ] **Step 3: Commit**
```bash
cd "C:/Users/jenni/Downloads/Sites/copa-hexa"
git add js/joguinho.js
git commit -m "feat: joguinho de bater pênalti"
```

---

## Task 6: Integração e estilos (`render.js` + `app.js` + `styles.css`)

**Files:** Modify `js/render.js`, `js/app.js`, `styles.css`. Verificação visual via preview.

- [ ] **Step 1: Em `js/render.js`** — adicionar os imports no topo (junto dos imports existentes) e usar `marcarTermos`:

No topo do arquivo, após os imports já existentes (`statusHexa`, `todos`), adicionar:
```js
import { marcarTermos } from './termos-inline.js';
import { linkWhatsApp } from './compartilhar.js';
```

Em `renderTermometro`, trocar a linha do detalhe:
```js
    <p class="termometro__detalhe">${marcarTermos(s.oQuePrecisa)}</p>
```

Em `renderProximoJogo`, trocar a linha da fase:
```js
    <p class="proximo__fase">${marcarTermos(proximoJogo.fase)}</p>
```

Em `renderGlossario`, incluir o container do joguinho logo após o `<h2>` (antes da legenda). Ou seja, o `el.innerHTML` passa a ser:
```js
  el.innerHTML = `
    <h2>Cola da Copa 🥅</h2>
    <div class="joguinho" id="joguinho"></div>
    <p class="glossario__legenda">As regras do futebol explicadas pra quem tem 6 anos (ou age como se tivesse).</p>
    <div class="glossario">${cards}</div>
  `;
```

Adicionar a nova função `renderCompartilhar` ao fim do arquivo:
```js
export function renderCompartilhar(el, { url, texto }) {
  el.innerHTML = `
    <h2>Chama a galera 🇧🇷</h2>
    <p>Manda esse site pra quem também finge que entende de futebol.</p>
    <div class="compartilhar__botoes">
      <a class="botao-wpp" href="${linkWhatsApp(texto, url)}" target="_blank" rel="noopener">Compartilhar no WhatsApp</a>
      <button type="button" class="botao-copiar" id="copiar-link">Copiar link</button>
    </div>
    <p class="compartilhar__status" id="copiar-status" aria-live="polite"></p>
  `;
  el.querySelector('#copiar-link').addEventListener('click', async () => {
    const status = el.querySelector('#copiar-status');
    try {
      await navigator.clipboard.writeText(url);
      status.textContent = 'Link copiado! 📋';
    } catch {
      status.textContent = url;
    }
  });
}
```

- [ ] **Step 2: Em `js/app.js`** — adicionar os imports no topo:
```js
import { dispararConfete } from './confete.js';
import { ativarCursorBolas } from './cursor-bolas.js';
import { montarJoguinho } from './joguinho.js';
import { ativarTooltipsTermos } from './termos-inline.js';
```

E, no fim de `init()` (depois das chamadas de render existentes e do bloco do palpite), adicionar:
```js
  // Camada festiva
  render.renderCompartilhar(document.querySelector('#compartilhar'), {
    url: location.href,
    texto: 'Temos chance ao hexa? Entenda a Copa sem saber nada de futebol:',
  });
  montarJoguinho(document.querySelector('#joguinho'), { onGol: () => dispararConfete({ quantidade: 90 }) });
  ativarCursorBolas(['#proximo-jogo', '#craques']);
  ativarTooltipsTermos();
  dispararConfete();
```

- [ ] **Step 3: Em `styles.css`** — adicionar ao fim, antes do bloco `@media (prefers-reduced-motion...)`:
```css
/* Termos inline */
.termo {
  border: 0; background: none; padding: 0; cursor: pointer;
  color: var(--azul); font: inherit; font-weight: 700;
  border-bottom: 2px dotted var(--azul);
}
.termo-balao {
  position: absolute; max-width: 280px; z-index: 50;
  background: var(--azul); color: var(--branco);
  padding: 0.75rem 1rem; border-radius: 12px; box-shadow: var(--sombra);
  font-size: 0.95rem;
}

/* Bolinhas no cursor */
.cursor-bola {
  position: fixed; transform: translate(-50%, -50%);
  pointer-events: none; z-index: 9998; font-size: 1.1rem;
  animation: subirBola 0.9s ease-out forwards;
}
@keyframes subirBola {
  to { transform: translate(-50%, -160%) scale(0.4) rotate(180deg); opacity: 0; }
}

/* Joguinho */
.joguinho {
  background: linear-gradient(135deg, var(--verde), var(--azul));
  color: var(--branco); border-radius: var(--raio);
  padding: 1.25rem; text-align: center; margin-bottom: 1.5rem;
}
.joguinho__gol { font-size: 3rem; line-height: 1; }
.joguinho__dica { opacity: 0.9; margin: 0.25rem 0 1rem; }
.joguinho__botoes { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
.joguinho__botoes button {
  background: var(--amarelo); color: var(--texto); border: 0;
  border-radius: 10px; padding: 0.6rem 0.9rem; font-weight: 700; cursor: pointer;
}
.joguinho__msg { font-weight: 700; min-height: 1.4em; margin: 0.75rem 0 0; }
.joguinho__placar { margin: 0.25rem 0 0; opacity: 0.9; }

/* Compartilhar */
.compartilhar { text-align: center; }
.compartilhar__botoes { display: flex; gap: 0.6rem; justify-content: center; flex-wrap: wrap; }
.botao-wpp {
  background: #25d366; color: #fff; text-decoration: none;
  padding: 0.7rem 1.1rem; border-radius: 10px; font-weight: 700;
}
.botao-copiar {
  background: var(--azul); color: #fff; border: 0;
  padding: 0.7rem 1.1rem; border-radius: 10px; font-weight: 700; cursor: pointer;
}
```

- [ ] **Step 4: Verificar no preview** (controlador)
- Recarregar a página. No console, conferir que não há erro de JS.
- Ao carregar, o confete deve cair (canvas some sozinho depois).
- Mover o mouse sobre "Próximo jogo" e "Craques" deixa um rastro de ⚽.
- Na seção "Cola da Copa", clicar nos botões do joguinho mostra mensagem e
  placar; ao marcar gol, dispara confete (preview_eval clicando até sair gol).
- Clicar num termo sublinhado (ex.: "fase de grupos" no termômetro) abre o
  balão com a definição.
- A seção "Chama a galera" mostra o botão do WhatsApp (href `wa.me`) e o
  "Copiar link".
- Tirar screenshots do joguinho e do compartilhar.

- [ ] **Step 5: Rodar a suíte completa** (garantir que a lógica nova não quebrou nada)
Run: `cd "C:/Users/jenni/Downloads/Sites/copa-hexa" && npm test`
Expected: 0 falhas (62 anteriores + 7 novos = 69).

- [ ] **Step 6: Commit**
```bash
cd "C:/Users/jenni/Downloads/Sites/copa-hexa"
git add js/render.js js/app.js styles.css
git commit -m "feat: integra confete, bolinhas, joguinho, tooltips e compartilhar"
```

---

## Self-Review (autor do plano)

- **Cobertura do spec:** confete na entrada e ao marcar gol (Tasks 3, 5, 6);
  bolinhas no cursor nas seções 3 e 5 (Tasks 4, 6); joguinho de chute a gol na
  seção 7 com confete (Tasks 5, 6); termos inline clicáveis reusando o
  glossário (Tasks 1, 6); compartilhar WhatsApp + copiar link (Tasks 2, 6);
  `prefers-reduced-motion` respeitado em confete/bolinhas e no CSS global.
- **Placeholders:** nenhum — todo passo tem código completo.
- **Consistência:** `marcarTermos` usa as chaves reais do `glossario.js`
  (impedimento, escanteio, penalti, faseDeGrupos, mataMata, saldoDeGols);
  `data-termo` casa com o que `ativarTooltipsTermos` lê via `definicao()`;
  `#joguinho` é criado por `renderGlossario` e consumido por `montarJoguinho`;
  `#compartilhar` já existe no `index.html`.
- **Riscos:** (1) `navigator.clipboard` exige HTTPS/localhost — no Vercel ok;
  fallback mostra a URL. (2) Em telas de toque não há cursor (bolinhas não
  aparecem — esperado; o conteúdo não depende disso). (3) `marcarTermos` assume
  texto puro (não HTML) — os textos passados (detalhe do termômetro, fase) são
  strings simples.
```
