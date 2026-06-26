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
