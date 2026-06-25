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

const FINALIZADOS = new Set(['FINISHED', 'AWARDED']);

function jogosDoBrasil(matchesRaw) {
  return (matchesRaw.matches || [])
    .filter((m) => m.homeTeam.name === TIME_BRASIL || m.awayTeam.name === TIME_BRASIL)
    .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
}

function brasilVenceu(m) {
  const ehCasa = m.homeTeam.name === TIME_BRASIL;
  const w = m.score.winner;
  if (w === 'HOME_TEAM') return ehCasa;
  if (w === 'AWAY_TEAM') return !ehCasa;
  const pen = m.score.penalties;
  if (pen && pen.home != null && pen.away != null) {
    return ehCasa ? pen.home > pen.away : pen.away > pen.home;
  }
  return false;
}

export function derivarEstado(grupo, proximoJogo, matchesRaw, vagasNoGrupo = 2) {
  const jogos = jogosDoBrasil(matchesRaw);
  const brasil = grupo ? grupo.times.find((t) => t.nome === 'Brasil') : null;
  const base = {
    posicaoGrupo: brasil ? brasil.posicao : 99,
    vagasNoGrupo,
    classificadoGarantido: false,
    proximoAdversario: proximoJogo ? proximoJogo.adversario : null,
  };

  if (jogos.some((m) => m.stage === 'FINAL' && FINALIZADOS.has(m.status) && brasilVenceu(m))) {
    return { ...base, situacao: 'campeao' };
  }

  const pendentes = jogos.filter((m) => !FINALIZADOS.has(m.status));

  if (pendentes.some((m) => m.stage !== 'GROUP_STAGE')) {
    return { ...base, situacao: 'mata-mata' };
  }

  const perdeuMataMata = jogos.some(
    (m) => m.stage !== 'GROUP_STAGE' && FINALIZADOS.has(m.status) && !brasilVenceu(m)
  );
  if (perdeuMataMata && pendentes.length === 0) {
    return { ...base, situacao: 'eliminado' };
  }

  if (pendentes.length === 0 && base.posicaoGrupo > vagasNoGrupo) {
    return { ...base, situacao: 'eliminado' };
  }

  return { ...base, situacao: 'grupos' };
}

export function montarDados(raw, agora = new Date()) {
  const grupo = grupoDoBrasil(raw.standings || {});
  const proximoJogo = proximoJogoDoBrasil(raw.matches || {});
  const estado = derivarEstado(grupo, proximoJogo, raw.matches || {});
  return {
    atualizadoEm: agora.toISOString(),
    fonte: 'api',
    estado,
    proximoJogo,
    grupo,
    artilheiros: artilheiros(raw.scorers || {}),
  };
}
