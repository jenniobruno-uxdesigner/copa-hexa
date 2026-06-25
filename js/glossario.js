const TERMOS = {
  impedimento: {
    termo: 'Impedimento',
    definicao:
      'É quando um jogador do time que ataca está "adiantado demais", mais perto do gol do que quase todos os adversários, na hora que a bola é tocada pra ele. Aí o juiz não deixa valer, pra ninguém ficar só esperando o gol perto da trave.',
  },
  escanteio: {
    termo: 'Escanteio',
    definicao:
      'Quando a bola sai pela linha do fundo e quem tocou por último foi o time que defende, o outro time bate a bola lá do cantinho do campo. É uma boa chance de fazer gol.',
  },
  penalti: {
    termo: 'Pênalti',
    definicao:
      'Uma falta feia bem pertinho do gol. O time que sofreu ganha um chute só, de frente pro goleiro, da marca branca. É quase um gol na certa.',
  },
  faseDeGrupos: {
    termo: 'Fase de grupos',
    definicao:
      'No começo da Copa, os times são divididos em grupinhos. Todo mundo joga contra todo mundo do seu grupo, e os melhores de cada grupo passam para a próxima fase.',
  },
  mataMata: {
    termo: 'Mata-mata',
    definicao:
      'Depois da fase de grupos, é "ganhou, passa; perdeu, vai pra casa". Não tem segunda chance: cada jogo é uma final.',
  },
  saldoDeGols: {
    termo: 'Saldo de gols',
    definicao:
      'É a conta dos gols que o time fez menos os gols que tomou. Serve de critério de desempate: quem fez mais e tomou menos fica na frente.',
  },
  cartaoAmarelo: {
    termo: 'Cartão amarelo',
    definicao:
      'Um aviso do juiz: "ó, pegou pesado". Dois amarelos no mesmo jogo viram vermelho, e aí o jogador é expulso.',
  },
  cartaoVermelho: {
    termo: 'Cartão vermelho',
    definicao:
      'O jogador fez algo grave e tem que sair do jogo na hora. O time dele fica com um jogador a menos até o fim.',
  },
};

export function definicao(chave) {
  return TERMOS[chave];
}

export function todos() {
  return Object.values(TERMOS);
}
