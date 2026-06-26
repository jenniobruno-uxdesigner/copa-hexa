import { statusHexa } from './termometro.js';
import { todos } from './glossario.js';
import { marcarTermos } from './termos-inline.js';
import { linkWhatsApp } from './compartilhar.js';

const NIVEIS = ['eliminado', 'alerta', 'no-caminho', 'muito-bem', 'hexa'];

export function renderTermometro(el, estado) {
  const s = statusHexa(estado);
  const ativos = NIVEIS.indexOf(s.nivel) + 1;
  el.className = `termometro nivel-${s.nivel}`;
  el.innerHTML = `
    <div class="termometro__topo">
      <span class="termometro__farol">${s.emoji}</span>
      <span class="termometro__nivel">${s.titulo}</span>
    </div>
    <p class="termometro__detalhe">${marcarTermos(s.oQuePrecisa)}</p>
    <div class="termometro__medidor" aria-hidden="true">
      ${[0, 1, 2, 3, 4]
        .map((i) => `<span class="termometro__seg${i < ativos ? ' ativo' : ''}"></span>`)
        .join('')}
    </div>
  `;
}

export function renderProximoJogo(el, proximoJogo) {
  if (!proximoJogo) {
    el.innerHTML = `
      <div class="bloco">
        <p class="eyebrow">Próximo jogo</p>
        <h2 class="titulo-secao">Sem jogo marcado agora</h2>
        <p>Volta na véspera do próximo jogo do Brasil. 😉</p>
      </div>`;
    return;
  }
  const data = new Date(proximoJogo.data);
  const dataFmt = data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  const horaFmt = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  el.innerHTML = `
    <div class="bloco">
      <p class="eyebrow">Próximo jogo</p>
      <div class="ticket">
        <p class="ticket__top">Copa do Mundo FIFA 2026</p>
        <p class="ticket__confronto">Brasil <span class="x">×</span> ${proximoJogo.adversario}</p>
        <hr class="ticket__linha" />
        <div class="ticket__meta">
          <span><b>Data</b>${dataFmt}</span>
          <span><b>Hora</b>${horaFmt}</span>
          <span><b>Fase</b>${marcarTermos(proximoJogo.fase)}</span>
        </div>
      </div>
      <div class="ticket__oque">⚽ Marque no calendário e chame a galera pra torcer junto. 🇧🇷</div>
    </div>
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
    <div class="bloco">
      <p class="eyebrow eyebrow--claro">Como tá o grupo</p>
      <h2 class="titulo-secao">O grupo do Brasil — ${grupo.nome}</h2>
      <p class="grupo__legenda">Os 2 primeiros passam de fase. Quanto mais pontos, melhor.</p>
      <table class="grupo__tabela">
        <thead>
          <tr><th>Pos</th><th>Time</th><th>Pontos</th><th>Jogos</th><th>Saldo</th></tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>
  `;
}

export function renderCraques(el, artilheiros) {
  const corpo =
    !artilheiros || artilheiros.length === 0
      ? '<p>Ainda sem gols na conta. Bola rolando! ⚽</p>'
      : `<ul class="craques">${artilheiros
          .map(
            (a) => `
        <li>
          <span class="craque__nome">${a.nome}</span>
          <span class="craque__time">${a.time}</span>
          <span class="craque__gols">⚽ ${a.gols}</span>
        </li>`
          )
          .join('')}</ul>`;
  el.innerHTML = `
    <div class="bloco">
      <p class="eyebrow">Em quem prestar atenção</p>
      <h2 class="titulo-secao">Craques pra torcer</h2>
      ${corpo}
    </div>
  `;
}

export function renderPalpite(el, proximoJogo, { onEnviar }) {
  if (!proximoJogo) {
    el.innerHTML = `
      <div class="bloco">
        <p class="eyebrow eyebrow--claro">Dar seu palpite</p>
        <h2 class="titulo-secao">Sem jogo aberto pra palpite</h2>
        <p>Volta na véspera do próximo jogo! 😉</p>
      </div>`;
    return;
  }
  const opcoes = (sel) =>
    Array.from({ length: 6 }, (_, n) => `<option value="${n}"${n === sel ? ' selected' : ''}>${n}</option>`).join('');

  el.innerHTML = `
    <div class="bloco">
      <p class="eyebrow eyebrow--claro">Agora que você entende</p>
      <h2 class="titulo-secao">Dá seu palpite 🔮</h2>
      <p class="palpite__jogo">Brasil × ${proximoJogo.adversario}</p>
      <form class="palpite__form" id="palpite-form">
        <input class="palpite__apelido" id="palpite-apelido" type="text" maxlength="40" placeholder="Seu apelido" required />
        <div class="palpite__placar">
          <label>Brasil <select id="palpite-br">${opcoes(1)}</select></label>
          <span>×</span>
          <label><select id="palpite-adv">${opcoes(0)}</select> ${proximoJogo.adversario}</label>
        </div>
        <button type="submit">Enviar palpite</button>
      </form>
      <p class="palpite__status" id="palpite-status" aria-live="polite"></p>
      <div class="palpite__vibe" id="palpite-vibe"></div>
      <div class="palpite__ranking" id="palpite-ranking"></div>
    </div>
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
      (p) => `<li><span class="vibe__rotulo">Brasil ${p.rotulo.replace('x', `× ${adversario} `)}</span>
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
    <div class="bloco">
      <p class="eyebrow">Cola da Copa</p>
      <h2 class="titulo-secao">As regras, sem mistério</h2>
      <p class="glossario__legenda">Explicadas pra quem tem 6 anos (ou age como se tivesse). 🥅</p>
      <div class="glossario">${cards}</div>
    </div>
  `;
}

export function renderCompartilhar(el, { url, texto }) {
  el.innerHTML = `
    <div class="bloco">
      <p class="eyebrow eyebrow--claro">Chama a galera</p>
      <h2 class="titulo-secao">Aqui é Brasil 🇧🇷</h2>
      <p>Manda esse site pra quem também finge que entende de futebol.</p>
      <div class="compartilhar__botoes">
        <a class="botao-wpp" href="${linkWhatsApp(texto, url)}" target="_blank" rel="noopener">Compartilhar no WhatsApp</a>
        <button type="button" class="botao-copiar" id="copiar-link">Copiar link</button>
      </div>
      <p class="compartilhar__status" id="copiar-status" aria-live="polite"></p>
    </div>
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
