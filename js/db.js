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

const UPSERT = `INSERT INTO palpites (jogo_id, usuario_id, apelido, placar_brasil, placar_adversario, conta_id)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (jogo_id, usuario_id)
DO UPDATE SET apelido = EXCLUDED.apelido,
              placar_brasil = EXCLUDED.placar_brasil,
              placar_adversario = EXCLUDED.placar_adversario,
              conta_id = EXCLUDED.conta_id,
              criado_em = now()`;

const CRIAR_PLACARES = `CREATE TABLE IF NOT EXISTS placares_jogo (
  conta_id         BIGINT PRIMARY KEY REFERENCES usuarios(id),
  gols             INT NOT NULL DEFAULT 0,
  melhor_sequencia INT NOT NULL DEFAULT 0,
  atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
)`;

const REGISTRAR_PLACAR = `INSERT INTO placares_jogo (conta_id, gols, melhor_sequencia)
VALUES ($1, $2, $3)
ON CONFLICT (conta_id)
DO UPDATE SET gols = placares_jogo.gols + EXCLUDED.gols,
              melhor_sequencia = GREATEST(placares_jogo.melhor_sequencia, EXCLUDED.melhor_sequencia),
              atualizado_em = now()`;

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
      await consulta('ALTER TABLE palpites ADD COLUMN IF NOT EXISTS conta_id BIGINT', []);
    },
    async salvarPalpite(p) {
      await consulta(UPSERT, [p.jogoId, p.usuarioId, p.apelido, p.placarBrasil, p.placarAdversario, p.contaId ?? null]);
    },
    async palpitesDeContas() {
      const linhas = await consulta(
        `SELECT p.jogo_id, p.conta_id, u.nome, u.foto_url, p.placar_brasil, p.placar_adversario
         FROM palpites p JOIN usuarios u ON u.id = p.conta_id
         WHERE p.conta_id IS NOT NULL`,
        []
      );
      return linhas.map((r) => ({
        jogoId: r.jogo_id,
        usuarioId: r.conta_id,
        apelido: r.nome,
        foto: r.foto_url,
        placarBrasil: r.placar_brasil,
        placarAdversario: r.placar_adversario,
      }));
    },
    async palpitesDoJogo(jogoId) {
      // LEFT JOIN: anônimos (conta_id nulo) entram com nome/foto nulos.
      const linhas = await consulta(
        `SELECT p.jogo_id, p.usuario_id, p.apelido, p.placar_brasil, p.placar_adversario,
                p.conta_id, u.nome, u.foto_url
         FROM palpites p LEFT JOIN usuarios u ON u.id = p.conta_id
         WHERE p.jogo_id = $1`,
        [jogoId]
      );
      return linhas.map((r) => ({
        ...mapaPalpite(r),
        contaId: r.conta_id,
        nome: r.nome,
        foto: r.foto_url,
      }));
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
    async garantirEsquemaPlacares() {
      await consulta(CRIAR_PLACARES, []);
    },
    async registrarResultadoJogo({ contaId, gols, sequencia }) {
      await consulta(REGISTRAR_PLACAR, [contaId, gols, sequencia]);
    },
    async rankingJogo() {
      const linhas = await consulta(
        `SELECT u.nome, u.foto_url, pj.gols, pj.melhor_sequencia
         FROM placares_jogo pj JOIN usuarios u ON u.id = pj.conta_id`,
        []
      );
      return linhas.map((r) => ({
        nome: r.nome,
        foto: r.foto_url,
        gols: r.gols,
        melhorSequencia: r.melhor_sequencia,
      }));
    },
  };
}
