import * as render from './render.js';

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

async function init() {
  const dados = await carregarDados();
  render.renderTermometro(document.querySelector('#termometro'), dados.estado);
  render.renderProximoJogo(document.querySelector('#proximo-jogo'), dados.proximoJogo);
  render.renderGrupo(document.querySelector('#grupo'), dados.grupo);
  render.renderCraques(document.querySelector('#craques'), dados.artilheiros);
  render.renderGlossario(document.querySelector('#glossario'));
}

init();
