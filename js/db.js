const CRIAR_TABELA = `CREATE TABLE IF NOT EXISTS palpites (
  id                BIGSERIAL PRIMARY KEY,
  jogo_id           TEXT NOT NULL,
  usuario_id        TEXT NOT NULL,
  apelido           TEXT NOT NULL,
  placar_brasil     INT NOT NULL,
  placar_adversario INT NOT NULL,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (jogo_id, usuario_id)
)`;

const UPSERT = `INSERT INTO palpites (jogo_id, usuario_id, apelido, placar_brasil, placar_adversario)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (jogo_id, usuario_id)
DO UPDATE SET apelido = EXCLUDED.apelido,
              placar_brasil = EXCLUDED.placar_brasil,
              placar_adversario = EXCLUDED.placar_adversario,
              criado_em = now()`;

function mapaPalpite(r) {
  return {
    jogoId: r.jogo_id,
    usuarioId: r.usuario_id,
    apelido: r.apelido,
    placarBrasil: r.placar_brasil,
    placarAdversario: r.placar_adversario,
  };
}

export function criarDb(consulta) {
  return {
    async garantirEsquema() {
      await consulta(CRIAR_TABELA, []);
    },
    async salvarPalpite(p) {
      await consulta(UPSERT, [p.jogoId, p.usuarioId, p.apelido, p.placarBrasil, p.placarAdversario]);
    },
    async palpitesDoJogo(jogoId) {
      const linhas = await consulta(
        `SELECT jogo_id, usuario_id, apelido, placar_brasil, placar_adversario FROM palpites WHERE jogo_id = $1`,
        [jogoId]
      );
      return linhas.map(mapaPalpite);
    },
    async todosPalpites() {
      const linhas = await consulta(
        `SELECT jogo_id, usuario_id, apelido, placar_brasil, placar_adversario FROM palpites`,
        []
      );
      return linhas.map(mapaPalpite);
    },
  };
}
