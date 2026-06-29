import * as render from './render.js';
import { dispararConfete } from './confete.js';
import { ativarCursorBolas } from './cursor-bolas.js';
import { montarJogoGol } from './jogo-gol.js';
import { ativarTooltipsTermos } from './termos-inline.js';
import { ativarReveals, ativarHeroBola } from './animacoes.js';
import { ativarBolicheTitulo } from './boliche-titulo.js';
import { montarBarraConta } from './conta-ui.js';
import { perfilAtual, tokenAtual } from './conta.js';

function cabecalhos() {
  const token = tokenAtual();
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

const CHAVE_SCROLL = 'copaScrollY';

// Login/logout recarregam a página pra re-renderizar tudo com a sessão nova.
// Guardamos a rolagem antes do reload e restauramos depois que as seções são
// montadas, pra pessoa continuar na mesma seção em vez de voltar ao topo.
function lembrarScrollEReload() {
  try {
    sessionStorage.setItem(CHAVE_SCROLL, String(window.scrollY));
  } catch {}
  location.reload();
}

function restaurarScroll() {
  let y = null;
  try {
    y = sessionStorage.getItem(CHAVE_SCROLL);
    if (y != null) sessionStorage.removeItem(CHAVE_SCROLL);
  } catch {}
  if (y == null) return;
  const destino = parseInt(y, 10) || 0;
  // O DOM já está montado aqui (última etapa do init), então pulamos direto,
  // sem a rolagem suave do CSS, pra não animar do topo até a posição.
  const html = document.documentElement;
  const antes = html.style.scrollBehavior;
  html.style.scrollBehavior = 'auto';
  window.scrollTo(0, destino);
  html.style.scrollBehavior = antes;
}

async function carregarDados() {
  try {
    const r = await fetch('/api/dados');
    if (!r.ok) throw new Error(`/api/dados respondeu ${r.status}`);
    return await r.json();
  } catch {
    // Fallback para dev estático (sem serverless): usa o fixture local.
    const r = await fetch('./fixtures/estado-mock.json');
    return r.json();
  }
}

function usuarioId() {
  let id = localStorage.getItem('copaUsuarioId');
  if (!id) {
    id = (crypto.randomUUID && crypto.randomUUID()) || String(Math.random()).slice(2);
    localStorage.setItem('copaUsuarioId', id);
  }
  return id;
}

async function carregarVibe(jogoId) {
  try {
    const r = await fetch(`/api/palpites?jogoId=${encodeURIComponent(jogoId)}`);
    if (r.ok) return await r.json();
  } catch {}
  return { total: 0, placares: [] };
}

async function carregarRanking() {
  try {
    const r = await fetch('/api/palpites?ranking');
    if (r.ok) return (await r.json()).ranking || [];
  } catch {}
  return [];
}

async function atualizarPalpite(proximoJogo) {
  if (!proximoJogo) return;
  const vibe = await carregarVibe(proximoJogo.id);
  render.renderVibe(document.querySelector('#palpite-vibe'), vibe, proximoJogo.adversario);
  render.renderRanking(document.querySelector('#palpite-ranking'), await carregarRanking());
}

async function carregarRankingJogo() {
  try {
    const r = await fetch('/api/placar-jogo?ranking');
    if (r.ok) return (await r.json()).ranking || [];
  } catch {}
  return [];
}

async function atualizarRankingJogo() {
  render.renderRankingJogo(document.querySelector('#jogo-ranking'), await carregarRankingJogo());
}

async function init() {
  // Controlamos a rolagem na mão (o conteúdo é montado por JS, então a
  // restauração automática do browser cairia no topo).
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  montarBarraConta(document.querySelector('#barra-conta'), { aoMudar: lembrarScrollEReload });
  const dados = await carregarDados();
  render.renderTermometro(document.querySelector('#termometro'), dados.estado);
  render.renderJogosPassados(document.querySelector('#jogos-passados'), dados.jogosPassados);
  render.renderProximoJogo(document.querySelector('#proximo-jogo'), dados.proximoJogo, dados.estado);
  render.renderGlossario(document.querySelector('#glossario'));

  const proximoJogo = dados.proximoJogo;
  const perfil = perfilAtual();
  render.renderPalpite(document.querySelector('#palpite'), proximoJogo, {
    onEnviar: async ({ apelido, placarBrasil, placarAdversario }) => {
      const status = document.querySelector('#palpite-status');
      if (!perfil && (!apelido || !apelido.trim())) {
        status.textContent = 'Põe um apelido pra valer o palpite. 🙂';
        return;
      }
      status.textContent = 'Enviando...';
      const corpo = perfil
        ? { jogoId: proximoJogo.id, placarBrasil, placarAdversario }
        : { jogoId: proximoJogo.id, usuarioId: usuarioId(), apelido, placarBrasil, placarAdversario };
      try {
        const r = await fetch('/api/palpites', {
          method: 'POST',
          headers: cabecalhos(),
          body: JSON.stringify(corpo),
        });
        status.textContent = r.ok ? 'Palpite registrado! 🎉' : 'Não rolou agora, tenta de novo.';
      } catch {
        status.textContent = 'Sem conexão com o placar agora. Tenta mais tarde.';
      }
      atualizarPalpite(proximoJogo);
    },
  }, dados.estado, perfil);

  atualizarPalpite(proximoJogo);

  // Camada festiva
  render.renderCompartilhar(document.querySelector('#compartilhar'), {
    url: location.href,
    texto: 'Temos chance ao hexa? Entenda a Copa sem saber nada de futebol:',
  });
  montarJogoGol(document.querySelector('#jogo'), {
    onGol: async ({ sequencia }) => {
      dispararConfete({ quantidade: 110 });
      if (tokenAtual()) {
        try {
          await fetch('/api/placar-jogo', {
            method: 'POST',
            headers: cabecalhos(),
            body: JSON.stringify({ golsNaPartida: 1, sequenciaNaPartida: sequencia }),
          });
        } catch {}
        atualizarRankingJogo();
      }
    },
  });
  atualizarRankingJogo();
  if (!perfil) {
    const elLogin = document.querySelector('#jogo-login');
    elLogin.innerHTML = 'Entrou no clima? <button type="button" class="botao-podio">Entrar pra disputar o pódio 🏆</button>';
    elLogin.querySelector('button').addEventListener('click', () => document.dispatchEvent(new Event('abrir-login')));
  }
  ativarCursorBolas(['#proximo-jogo']);
  ativarTooltipsTermos();
  ativarReveals();
  const checarBoliche = ativarBolicheTitulo('.hero__titulo');
  ativarHeroBola({ aoMover: checarBoliche });
  dispararConfete();
  restaurarScroll();
}

init();
