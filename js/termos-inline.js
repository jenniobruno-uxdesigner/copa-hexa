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
