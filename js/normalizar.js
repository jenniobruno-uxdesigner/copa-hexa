const TIME_BRASIL = 'Brazil';

const TRADUCAO_TIMES = {
  Brazil: 'Brasil',
  Serbia: 'Sérvia',
  Switzerland: 'Suíça',
  Cameroon: 'Camarões',
  Argentina: 'Argentina',
  France: 'França',
  Spain: 'Espanha',
  Germany: 'Alemanha',
  England: 'Inglaterra',
  Portugal: 'Portugal',
};

const FASES = {
  GROUP_STAGE: 'Fase de grupos',
  LAST_16: 'Oitavas de final',
  QUARTER_FINALS: 'Quartas de final',
  SEMI_FINALS: 'Semifinal',
  THIRD_PLACE: 'Disputa de 3º lugar',
  FINAL: 'Final',
};

const PENDENTES = new Set(['SCHEDULED', 'TIMED', 'IN_PLAY', 'PAUSED']);

export function traduzTime(nome) {
  return TRADUCAO_TIMES[nome] || nome;
}

export function traduzFase(stage, group) {
  const base = FASES[stage] || stage;
  if (group) {
    return `${base} - ${group.replace('GROUP_', 'Grupo ')}`;
  }
  return base;
}

export function proximoJogoDoBrasil(matchesRaw) {
  const jogos = (matchesRaw.matches || [])
    .filter((m) => m.homeTeam.name === TIME_BRASIL || m.awayTeam.name === TIME_BRASIL)
    .filter((m) => PENDENTES.has(m.status))
    .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));

  const m = jogos[0];
  if (!m) return null;

  const ehCasa = m.homeTeam.name === TIME_BRASIL;
  const adversarioRaw = ehCasa ? m.awayTeam.name : m.homeTeam.name;
  return {
    id: m.id != null ? String(m.id) : `${m.homeTeam.name}-${m.awayTeam.name}-${m.utcDate}`,
    adversario: traduzTime(adversarioRaw),
    data: m.utcDate,
    fase: traduzFase(m.stage, m.group),
    encerrado: false,
    placarBrasil: null,
    placarAdversario: null,
  };
}

export function grupoDoBrasil(standingsRaw) {
  const totais = (standingsRaw.standings || []).filter((s) => s.type === 'TOTAL');
  const entrada = totais.find((s) =>
    (s.table || []).some((r) => r.team.name === TIME_BRASIL)
  );
  if (!entrada) return null;

  return {
    nome: entrada.group ? entrada.group.replace('GROUP_', 'Grupo ') : 'Grupo do Brasil',
    times: entrada.table.map((r) => ({
      nome: traduzTime(r.team.name),
      posicao: r.position,
      pontos: r.points,
      jogos: r.playedGames,
      saldo: r.goalDifference,
    })),
  };
}

export function artilheiros(scorersRaw, limite = 5) {
  const lista = (scorersRaw.scorers || []).map((s) => ({
    nome: s.player.name,
    time: traduzTime(s.team.name),
    gols: s.goals,
  }));
  const brasileiros = lista.filter((s) => s.time === 'Brasil');
  return (brasileiros.length ? brasileiros : lista).slice(0, limite);
}
