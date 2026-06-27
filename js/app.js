import * as render from './render.js';
import { dispararConfete } from './confete.js';
import { ativarCursorBolas } from './cursor-bolas.js';
import { montarJogoGol } from './jogo-gol.js';
import { ativarTooltipsTermos } from './termos-inline.js';
import { ativarReveals, ativarHeroBola } from './animacoes.js';
import { montarBarraConta } from './conta-ui.js';
import { perfilAtual, tokenAtual } from './conta.js';

function cabecalhos() {
  const token = tokenAtual();
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
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
  montarBarraConta(document.querySelector('#barra-conta'), { aoMudar: () => location.reload() });
  const dados = await carregarDados();
  render.renderTermometro(document.querySelector('#termometro'), dados.estado);
  render.renderProximoJogo(document.querySelector('#proximo-jogo'), dados.proximoJogo, dados.estado);
  render.renderGrupo(document.querySelector('#grupo'), dados.grupo);
  render.renderCraques(document.querySelector('#craques'), dados.artilheiros);
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
  ativarCursorBolas(['#proximo-jogo', '#craques']);
  ativarTooltipsTermos();
  ativarReveals();
  ativarHeroBola();
  dispararConfete();
}

init();
