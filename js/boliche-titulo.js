// Quebra o título do herói em caracteres e os "derruba" (efeito pino de
// boliche) quando a bola passa por cima. Devolve uma função checar(bolaRect)
// que o controlador chama enquanto a bola se move.

export function ativarBolicheTitulo(seletor) {
  const titulo = document.querySelector(seletor);
  if (!titulo) return () => {};

  const linhas = [...titulo.querySelectorAll('.linha')];
  const textoCompleto = linhas.map((l) => l.textContent).join(' ');
  titulo.setAttribute('aria-label', textoCompleto);

  for (const linha of linhas) {
    const texto = linha.textContent;
    linha.textContent = '';
    for (const ch of texto) {
      const span = document.createElement('span');
      span.setAttribute('aria-hidden', 'true');
      if (ch === ' ') {
        span.className = 'char char--espaco';
        span.innerHTML = '&nbsp;';
      } else {
        span.className = 'char';
        span.textContent = ch;
      }
      linha.appendChild(span);
    }
  }

  const reduz = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduz) return () => {};

  const chars = [...titulo.querySelectorAll('.char:not(.char--espaco)')];

  return function checar(bolaRect) {
    if (!bolaRect) return;
    const bx = bolaRect.left + bolaRect.width / 2;
    const by = bolaRect.top + bolaRect.height / 2;
    const raioBola = Math.min(bolaRect.width, bolaRect.height) / 2;

    for (const c of chars) {
      if (c.dataset.atingido === '1') continue;
      const r = c.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = cx - bx;
      const dy = cy - by;
      const dist = Math.hypot(dx, dy);
      const alcance = raioBola + Math.max(r.width, r.height) / 2;
      if (dist <= alcance) lancar(c, dx, dy);
    }
  };
}

function lancar(c, dx, dy) {
  c.dataset.atingido = '1';
  // direção pra longe da bola (com leve aleatoriedade se o impacto for central)
  const ang = dx === 0 && dy === 0 ? Math.random() * Math.PI * 2 : Math.atan2(dy, dx);
  const forca = 130 + Math.random() * 170;
  const tx = Math.cos(ang) * forca;
  const ty = Math.sin(ang) * forca - (50 + Math.random() * 90); // viés pra cima
  const giro = (Math.random() - 0.5) * 720;

  c.style.zIndex = '5';
  c.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) rotate(${giro.toFixed(0)}deg)`;

  window.setTimeout(() => {
    c.style.transform = '';
    window.setTimeout(() => {
      delete c.dataset.atingido;
      c.style.zIndex = '';
    }, 700);
  }, 2200 + Math.random() * 700);
}
