// Jogo de pênalti: puxe a bola (estilingue), mire e solte. Mouse e toque.

const W = 360;
const H = 480;
const GOL_ESQ = 70;
const GOL_DIR = 290;
const GOL_Y = 96; // linha do gol
const TRAVE_TOP = 44;
const BOLA_R = 14;
const BOLA_INICIO = { x: 180, y: 430 };
const GOLEIRO_W = 64;
const GOLEIRO_Y = 60;
const FORCA = 0.16;
const GRAVIDADE = 0.12;
const PUXAO_MAX = 200;

// Pura e testável: dado o x da bola na linha do gol e os limites, diz o resultado.
export function resultadoChute(x, { golEsquerda, golDireita, goleiroEsq, goleiroDir }) {
  if (x < golEsquerda || x > golDireita) return 'fora';
  if (x >= goleiroEsq && x <= goleiroDir) return 'defesa';
  return 'gol';
}

export function montarJogoGol(container, { onGol } = {}) {
  container.innerHTML = `
    <canvas class="jogo__canvas" width="${W}" height="${H}"></canvas>
    <p class="jogo__msg" id="jogo-msg">Puxe a bola pra trás e solte pra chutar 👆</p>
    <p class="jogo__placar" id="jogo-placar">Gols: 0 de 0</p>
  `;
  const canvas = container.querySelector('.jogo__canvas');
  const ctx = canvas.getContext('2d');
  const msg = container.querySelector('#jogo-msg');
  const placar = container.querySelector('#jogo-placar');

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);

  let gols = 0;
  let chutes = 0;
  let sequencia = 0;
  const bola = { ...BOLA_INICIO, vx: 0, vy: 0 };
  const goleiro = { x: 180, alvo: 180 };
  let arrastando = false;
  let puxao = null; // ponto atual do ponteiro
  let voando = false;
  let travado = false; // pausa após resolver

  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * W,
      y: ((e.clientY - r.top) / r.height) * H,
    };
  }

  function aoPressionar(e) {
    if (voando || travado) return;
    arrastando = true;
    puxao = pos(e);
    canvas.setPointerCapture(e.pointerId);
  }
  function aoMover(e) {
    if (!arrastando) return;
    puxao = pos(e);
  }
  function aoSoltar() {
    if (!arrastando) return;
    arrastando = false;
    let dx = BOLA_INICIO.x - puxao.x;
    let dy = BOLA_INICIO.y - puxao.y;
    const tam = Math.hypot(dx, dy);
    puxao = null;
    if (tam < 20) return; // toque sem força
    const escala = Math.min(tam, PUXAO_MAX) / tam;
    bola.vx = dx * escala * FORCA;
    bola.vy = dy * escala * FORCA;
    goleiro.alvo = GOL_ESQ + GOLEIRO_W / 2 + Math.random() * (GOL_DIR - GOL_ESQ - GOLEIRO_W);
    voando = true;
    msg.textContent = '...';
  }

  canvas.addEventListener('pointerdown', aoPressionar);
  canvas.addEventListener('pointermove', aoMover);
  canvas.addEventListener('pointerup', aoSoltar);
  canvas.addEventListener('pointercancel', aoSoltar);

  function resolver(texto, foiGol) {
    voando = false;
    travado = true;
    chutes += 1;
    if (foiGol) {
      gols += 1;
      sequencia += 1;
      if (onGol) onGol({ sequencia });
    } else {
      sequencia = 0;
    }
    msg.textContent = texto;
    placar.textContent = `Gols: ${gols} de ${chutes}`;
    setTimeout(() => {
      bola.x = BOLA_INICIO.x;
      bola.y = BOLA_INICIO.y;
      bola.vx = 0;
      bola.vy = 0;
      goleiro.alvo = 180;
      travado = false;
    }, 1100);
  }

  function passo() {
    if (voando) {
      bola.x += bola.vx;
      bola.y += bola.vy;
      bola.vy += GRAVIDADE;
      goleiro.x += (goleiro.alvo - goleiro.x) * 0.18;

      if (bola.y <= GOL_Y) {
        const r = resultadoChute(bola.x, {
          golEsquerda: GOL_ESQ,
          golDireita: GOL_DIR,
          goleiroEsq: goleiro.x - GOLEIRO_W / 2,
          goleiroDir: goleiro.x + GOLEIRO_W / 2,
        });
        if (r === 'gol') resolver('GOOOOL! 🎉', true);
        else if (r === 'defesa') resolver('O goleiro pegou! 🧤', false);
        else resolver('Foi pra fora! 😅', false);
      } else if (bola.x < -30 || bola.x > W + 30 || bola.y > H + 30) {
        resolver('Isso foi longe! 😂', false);
      } else if (bola.vy > 0 && bola.y > BOLA_INICIO.y) {
        resolver('Chute fraco, capricha! 💪', false);
      }
    }
    desenhar();
  }

  // Só roda o loop quando o canvas está visível (economiza CPU fora da tela).
  let rodando = false;
  function loop() {
    if (!rodando) return;
    passo();
    requestAnimationFrame(loop);
  }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      ([e]) => {
        const visivel = e.isIntersecting;
        if (visivel && !rodando) {
          rodando = true;
          requestAnimationFrame(loop);
        } else if (!visivel) {
          rodando = false;
        }
      },
      { threshold: 0.1 }
    );
    io.observe(canvas);
  } else {
    rodando = true;
    requestAnimationFrame(loop);
  }

  function desenhar() {
    // gramado
    ctx.fillStyle = '#0a3d1f';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let y = 0; y < H; y += 48) ctx.fillRect(0, y, W, 24);

    // gol (traves + rede)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.strokeRect(GOL_ESQ, TRAVE_TOP, GOL_DIR - GOL_ESQ, GOL_Y - TRAVE_TOP);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    for (let x = GOL_ESQ + 12; x < GOL_DIR; x += 12) {
      ctx.beginPath();
      ctx.moveTo(x, TRAVE_TOP);
      ctx.lineTo(x, GOL_Y);
      ctx.stroke();
    }

    // goleiro (bonequinho de braços abertos; o vão dos braços = a hitbox da defesa)
    desenharGoleiro(goleiro.x);

    // linha de mira (enquanto arrasta)
    if (arrastando && puxao) {
      ctx.strokeStyle = 'rgba(255,203,5,0.9)';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(BOLA_INICIO.x, BOLA_INICIO.y);
      ctx.lineTo(2 * BOLA_INICIO.x - puxao.x, 2 * BOLA_INICIO.y - puxao.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // bola
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#08160d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bola.x, bola.y, BOLA_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#08160d';
    ctx.beginPath();
    ctx.arc(bola.x, bola.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  // Bonequinho de goleiro no mesmo estilo flat do jogo (paleta da marca +
  // contorno escuro, igual à bola). cy é a referência vertical; os braços
  // abertos têm exatamente GOLEIRO_W de vão, casando com a hitbox da defesa.
  function desenharGoleiro(cx) {
    const cy = GOLEIRO_Y;
    const meia = GOLEIRO_W / 2;
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#08160d';
    ctx.lineJoin = 'round';

    // pernas (atrás do corpo)
    ctx.fillStyle = '#08160d';
    roundRect(ctx, cx - 9, cy + 22, 6, 12, 2);
    ctx.fill();
    roundRect(ctx, cx + 3, cy + 22, 6, 12, 2);
    ctx.fill();

    // braços abertos: barra arredondada (o vão = GOLEIRO_W)
    ctx.fillStyle = '#ffcb05';
    roundRect(ctx, cx - meia, cy + 8, GOLEIRO_W, 10, 5);
    ctx.fill();
    ctx.stroke();

    // camisa (corpo)
    roundRect(ctx, cx - 12, cy + 4, 24, 22, 7);
    ctx.fill();
    ctx.stroke();

    // luvas nas pontas dos braços
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - meia, cy + 13, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + meia, cy + 13, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // cabeça
    ctx.fillStyle = '#f4ecd6';
    ctx.beginPath();
    ctx.arc(cx, cy - 4, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}
