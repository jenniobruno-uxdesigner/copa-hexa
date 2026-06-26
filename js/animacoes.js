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
