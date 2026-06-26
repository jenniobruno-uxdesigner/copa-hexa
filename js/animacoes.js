const reduzMovimento =
  window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function ativarReveals() {
  const els = document.querySelectorAll('.reveal');
  if (reduzMovimento || !('IntersectionObserver' in window)) {
    els.forEach((e) => e.classList.add('visivel'));
    return;
  }
  const io = new IntersectionObserver(
    (entradas) => {
      for (const en of entradas) {
        if (en.isIntersecting) {
          en.target.classList.add('visivel');
          io.unobserve(en.target);
        }
      }
    },
    { threshold: 0.15 }
  );
  els.forEach((e) => io.observe(e));
}

// Bola do herói: dá pra agarrar e arremessar; ela volta pro lugar com mola.
export function ativarHeroBola() {
  const bola = document.querySelector('#hero-bola');
  if (!bola) return;
  bola.classList.add('bobinha');

  let x = 0, y = 0, vx = 0, vy = 0;
  let modo = 'idle';
  let grab = null;
  let ultimo = null;
  let raf = 0;

  const aplicar = () => { bola.style.transform = `translate(${x}px, ${y}px)`; };
  const pararEIdle = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    modo = 'idle';
    x = 0; y = 0;
    bola.style.transform = '';
    bola.classList.add('bobinha');
  };

  function passo() {
    if (modo === 'voa') {
      vx += -x * 0.06; vx *= 0.86; x += vx;
      vy += -y * 0.06; vy *= 0.86; y += vy;
      if (Math.hypot(x, y) < 0.6 && Math.hypot(vx, vy) < 0.6) {
        pararEIdle();
        return;
      }
      aplicar();
    }
    raf = requestAnimationFrame(passo);
  }

  bola.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    bola.setPointerCapture(e.pointerId);
    bola.classList.remove('bobinha');
    bola.style.cursor = 'grabbing';
    modo = 'arrasta';
    grab = { x: e.clientX - x, y: e.clientY - y };
    ultimo = { x: e.clientX, y: e.clientY, t: performance.now() };
    if (!raf) raf = requestAnimationFrame(passo);
  });

  bola.addEventListener('pointermove', (e) => {
    if (modo !== 'arrasta') return;
    x = e.clientX - grab.x;
    y = e.clientY - grab.y;
    const agora = performance.now();
    const dt = Math.max(1, agora - ultimo.t);
    vx = ((e.clientX - ultimo.x) / dt) * 16;
    vy = ((e.clientY - ultimo.y) / dt) * 16;
    ultimo = { x: e.clientX, y: e.clientY, t: agora };
    aplicar();
  });

  const soltar = () => {
    if (modo !== 'arrasta') return;
    bola.style.cursor = 'grab';
    if (reduzMovimento) {
      pararEIdle();
      return;
    }
    modo = 'voa';
  };
  bola.addEventListener('pointerup', soltar);
  bola.addEventListener('pointercancel', soltar);
}
