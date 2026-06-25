function resultado(placarBrasil, placarAdversario) {
  return Math.sign(placarBrasil - placarAdversario);
}

export function pontuarPalpite(palpite, real) {
  const exato =
    palpite.placarBrasil === real.placarBrasil &&
    palpite.placarAdversario === real.placarAdversario;
  if (exato) return 3;

  const mesmoResultado =
    resultado(palpite.placarBrasil, palpite.placarAdversario) ===
    resultado(real.placarBrasil, real.placarAdversario);
  if (mesmoResultado) return 1;

  return 0;
}
