import * as render from './render.js';

function estadoDoBrasil(dados) {
  const brasil = dados.grupo.times.find((t) => t.nome === 'Brasil');
  return {
    situacao: 'grupos',
    posicaoGrupo: brasil ? brasil.posicao : 99,
    vagasNoGrupo: 2,
    classificadoGarantido: false,
    proximoAdversario: dados.proximoJogo ? dados.proximoJogo.adversario : null,
  };
}

async function init() {
  const resp = await fetch('./fixtures/estado-mock.json');
  const dados = await resp.json();

  render.renderTermometro(document.querySelector('#termometro'), estadoDoBrasil(dados));
  render.renderProximoJogo(document.querySelector('#proximo-jogo'), dados.proximoJogo);
  render.renderGrupo(document.querySelector('#grupo'), dados.grupo);
  render.renderCraques(document.querySelector('#craques'), dados.artilheiros);
  render.renderGlossario(document.querySelector('#glossario'));
}

init();
