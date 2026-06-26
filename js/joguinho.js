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
