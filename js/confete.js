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
