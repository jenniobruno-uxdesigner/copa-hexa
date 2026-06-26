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

const CRIAR_USUARIOS = `CREATE TABLE IF NOT EXISTS usuarios (
  id          BIGSERIAL PRIMARY KEY,
  nome        TEXT NOT NULL,
  username_lc TEXT UNIQUE,
  foto_url    TEXT,
  pin_hash    TEXT,
  google_sub  TEXT UNIQUE,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
)`;

function mapaPalpite(r) {
  return {
    jogoId: r.jogo_id,
    usuarioId: r.usuario_id,
    apelido: r.apelido,
    placarBrasil: r.placar_brasil,
    placarAdversario: r.placar_adversario,
  };
}

function mapaUsuario(r) {
  return { id: r.id, nome: r.nome, foto: r.foto_url };
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
    async garantirEsquemaUsuarios() {
      await consulta(CRIAR_USUARIOS, []);
    },
    async criarUsuarioPin({ nome, usernameLc, pinHash }) {
      const linhas = await consulta(
        `INSERT INTO usuarios (nome, username_lc, pin_hash) VALUES ($1, $2, $3) RETURNING id, nome, foto_url`,
        [nome, usernameLc, pinHash]
      );
      return mapaUsuario(linhas[0]);
    },
    async buscarPorUsername(usernameLc) {
      const linhas = await consulta(
        `SELECT id, nome, foto_url, pin_hash FROM usuarios WHERE username_lc = $1`,
        [usernameLc]
      );
      if (!linhas[0]) return null;
      return { ...mapaUsuario(linhas[0]), pinHash: linhas[0].pin_hash };
    },
    async acharOuCriarGoogle({ googleSub, nome, fotoUrl }) {
      const linhas = await consulta(
        `INSERT INTO usuarios (nome, foto_url, google_sub) VALUES ($1, $2, $3)
         ON CONFLICT (google_sub) DO UPDATE SET nome = EXCLUDED.nome, foto_url = EXCLUDED.foto_url
         RETURNING id, nome, foto_url`,
        [nome, fotoUrl, googleSub]
      );
      return mapaUsuario(linhas[0]);
    },
  };
}
