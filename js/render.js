import { statusHexa } from './termometro.js';
import { todos } from './glossario.js';
import { marcarTermos } from './termos-inline.js';
import { linkWhatsApp } from './compartilhar.js';

export function renderTermometro(el, estado) {
  const s = statusHexa(estado);
  el.className = `termometro nivel-${s.nivel}`;
  el.innerHTML = `
    <div class="termometro__emoji">${s.emoji}</div>
    <h2 class="termometro__titulo">${s.titulo}</h2>
    <p class="termometro__detalhe">${marcarTermos(s.oQuePrecisa)}</p>
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
    <p class="proximo__fase">${marcarTermos(proximoJogo.fase)}</p>
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
    <div class="joguinho" id="joguinho"></div>
    <p class="glossario__legenda">As regras do futebol explicadas pra quem tem 6 anos (ou age como se tivesse).</p>
    <div class="glossario">${cards}</div>
  `;
}

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

export function renderPalpite(el, proximoJogo, { onEnviar }) {
  if (!proximoJogo) {
    el.innerHTML = '<h2>Dar seu palpite</h2><p>Sem jogo aberto pra palpite agora. Volta na véspera do próximo jogo! 😉</p>';
    return;
  }
  const opcoes = (sel) =>
    Array.from({ length: 6 }, (_, n) => `<option value="${n}"${n === sel ? ' selected' : ''}>${n}</option>`).join('');

  el.innerHTML = `
    <h2>Dar seu palpite 🔮</h2>
    <p class="palpite__jogo">Brasil x ${proximoJogo.adversario}</p>
    <form class="palpite__form" id="palpite-form">
      <input class="palpite__apelido" id="palpite-apelido" type="text" maxlength="40" placeholder="Seu apelido" required />
      <div class="palpite__placar">
        <label>Brasil <select id="palpite-br">${opcoes(1)}</select></label>
        <span>x</span>
        <label><select id="palpite-adv">${opcoes(0)}</select> ${proximoJogo.adversario}</label>
      </div>
      <button type="submit">Enviar palpite</button>
    </form>
    <p class="palpite__status" id="palpite-status" aria-live="polite"></p>
    <div class="palpite__vibe" id="palpite-vibe"></div>
    <div class="palpite__ranking" id="palpite-ranking"></div>
  `;

  el.querySelector('#palpite-form').addEventListener('submit', (e) => {
    e.preventDefault();
    onEnviar({
      apelido: el.querySelector('#palpite-apelido').value,
      placarBrasil: Number(el.querySelector('#palpite-br').value),
      placarAdversario: Number(el.querySelector('#palpite-adv').value),
    });
  });
}

export function renderVibe(el, vibe, adversario) {
  if (!vibe || vibe.total === 0) {
    el.innerHTML = '<p class="vibe__vazio">Seja o primeiro a palpitar! 🎉</p>';
    return;
  }
  const linhas = vibe.placares
    .slice(0, 5)
    .map(
      (p) => `<li><span class="vibe__rotulo">Brasil ${p.rotulo.replace('x', `x ${adversario} `)}</span>
        <span class="vibe__barra"><span style="width:${p.percentual}%"></span></span>
        <span class="vibe__pct">${p.percentual}%</span></li>`
    )
    .join('');
  el.innerHTML = `<h3>A vibe da galera (${vibe.total})</h3><ul class="vibe">${linhas}</ul>`;
}

export function renderRanking(el, ranking) {
  if (!ranking || ranking.length === 0) {
    el.innerHTML = '';
    return;
  }
  const itens = ranking
    .slice(0, 10)
    .map((r, i) => `<li><span class="rank__pos">${i + 1}º</span> <span class="rank__nome">${r.apelido}</span> <span class="rank__pts">${r.pontos} pts</span></li>`)
    .join('');
  el.innerHTML = `<h3>🏅 Ranking dos palpiteiros</h3><ol class="ranking">${itens}</ol>`;
}
