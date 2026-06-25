function ordinal(n) {
  return `${n}º`;
}

function comAdversario(estado, base) {
  if (estado.proximoAdversario) {
    return `${base} Próximo jogo: contra ${estado.proximoAdversario}.`;
  }
  return base;
}

export function statusHexa(estado) {
  if (estado.situacao === 'campeao') {
    return {
      nivel: 'hexa',
      emoji: '🏆',
      titulo: 'HEXA!',
      oQuePrecisa: 'Acabou: o Brasil é campeão! Pode comemorar até cansar. 🎉',
    };
  }

  if (estado.situacao === 'eliminado') {
    return {
      nivel: 'eliminado',
      emoji: '😢',
      titulo: 'A Copa acabou pra gente desta vez',
      oQuePrecisa:
        'O Brasil foi eliminado. Agora é torcer pra próxima — e você já aprendeu um monte de regras pelo caminho.',
    };
  }

  if (estado.situacao === 'mata-mata') {
    return {
      nivel: 'muito-bem',
      emoji: '🟢',
      titulo: 'Indo muito bem!',
      oQuePrecisa: comAdversario(
        estado,
        'O Brasil já está no mata-mata: agora cada jogo é decisão. Quem perde, vai pra casa.'
      ),
    };
  }

  // situacao === 'grupos'
  if (estado.classificadoGarantido) {
    return {
      nivel: 'muito-bem',
      emoji: '🟢',
      titulo: 'Indo muito bem!',
      oQuePrecisa:
        'O Brasil já garantiu a vaga na próxima fase. Agora é manter o ritmo.',
    };
  }

  if (estado.posicaoGrupo <= estado.vagasNoGrupo) {
    return {
      nivel: 'no-caminho',
      emoji: '🙂',
      titulo: 'No caminho',
      oQuePrecisa: comAdversario(
        estado,
        `O Brasil está em ${ordinal(estado.posicaoGrupo)} e os ${estado.vagasNoGrupo} primeiros do grupo passam de fase. Bem encaminhado, falta confirmar.`
      ),
    };
  }

  return {
    nivel: 'alerta',
    emoji: '🟡',
    titulo: 'Sinal de alerta',
    oQuePrecisa: comAdversario(
      estado,
      `O Brasil está em ${ordinal(estado.posicaoGrupo)} e só os ${estado.vagasNoGrupo} primeiros passam. Precisa vencer pra voltar pro grupo dos classificados.`
    ),
  };
}
