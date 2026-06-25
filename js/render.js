import { statusHexa } from './termometro.js';
import { todos } from './glossario.js';

export function renderTermometro(el, estado) {
  const s = statusHexa(estado);
  el.className = `termometro nivel-${s.nivel}`;
  el.innerHTML = `
    <div class="termometro__emoji">${s.emoji}</div>
    <h2 class="termometro__titulo">${s.titulo}</h2>
    <p class="termometro__detalhe">${s.oQuePrecisa}</p>
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
    <p class="proximo__fase">${proximoJogo.fase}</p>
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
    <p class="glossario__legenda">As regras do futebol explicadas pra quem tem 6 anos (ou age como se tivesse).</p>
    <div class="glossario">${cards}</div>
  `;
}
