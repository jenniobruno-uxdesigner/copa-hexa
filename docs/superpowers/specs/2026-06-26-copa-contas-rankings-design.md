# Copa pra Leigos — Contas, login e rankings (pódio)

**Data:** 2026-06-26
**Status:** Design aprovado, aguardando revisão final

## Objetivo

Permitir que as pessoas tenham uma identidade (username único) para competir
nos rankings ("pódio") de palpites e do joguinho de pênalti. **Login é
opcional**: anônimo continua palpitando e jogando; o login só destrava a
disputa pelo pódio. Dois caminhos de login: **usuário + PIN** ou **Google**.
Do Google usamos **nome e foto** (para exibir no ranking) e o `sub` (identidade)
— **nunca o e-mail** nem outros dados.

## Princípios

- Login opcional. Nada que o anônimo faz hoje deixa de funcionar.
- Mensagens-convite discretas ("Entre pra disputar o pódio 🏆") no palpite e no jogo.
- Mínimo de dados: `nome` (exibição), `username`/`pin_hash` (método PIN), `google_sub` + `foto_url` (método Google). Nunca e-mail.
- Lógica pura e testável; segredos só no servidor (Vercel env).

## Decisões

| Tema | Decisão |
|---|---|
| Login | Usuário + PIN **ou** Google (qualquer um dos dois) |
| Obrigatório? | Não — opcional, só pra entrar no pódio |
| Hash do PIN | `scrypt` nativo do Node (sem dependência nova) |
| Google | `google-auth-library` valida o ID token; guardamos só o `sub` |
| Sessão | JWT HS256 assinado com `SESSION_SECRET`, guardado no aparelho, enviado como `Bearer` |
| Ranking do jogo | Gols acumulados (principal), desempate por melhor sequência |
| Ranking do palpite | Pontos de palpite (3/1/0), só de contas logadas |

## Modelo de dados (Neon / Postgres)

```sql
CREATE TABLE IF NOT EXISTS usuarios (
  id          BIGSERIAL PRIMARY KEY,
  nome        TEXT NOT NULL,                 -- nome de exibição no ranking
                                             --   PIN: = o username escolhido
                                             --   Google: o nome vindo do Google
  username_lc TEXT UNIQUE,                   -- handle único do método PIN (minúsculas); nulo p/ Google
  foto_url    TEXT,                          -- avatar (foto do Google); nulo p/ PIN
  pin_hash    TEXT,                          -- "salt:hash" (scrypt); nulo se só Google
  google_sub  TEXT UNIQUE,                   -- id do Google; nulo se só PIN
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS placares_jogo (
  conta_id          BIGINT PRIMARY KEY REFERENCES usuarios(id),
  gols              INT NOT NULL DEFAULT 0,
  melhor_sequencia  INT NOT NULL DEFAULT 0,
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- palpites ganha o vínculo opcional com a conta (nulo = anônimo)
ALTER TABLE palpites ADD COLUMN IF NOT EXISTS conta_id BIGINT REFERENCES usuarios(id);
```

## Componentes (módulos puros e testáveis)

- `js/senha.js` — `hashPin(pin)` / `verificarPin(pin, hash)` com `scrypt` (Node `crypto`).
- `js/sessao.js` — `assinarSessao({id, username})` / `verificarSessao(token)` (JWT HS256 via `crypto`, sem dependência).
- `js/usuario-validacao.js` — `usernameValido(u)` (3–20 chars, letras/números/_/.), `pinValido(p)` (4–6 dígitos).
- `js/ranking-jogo.js` — `ordenarRankingJogo(linhas)` (gols desc, melhor_sequencia desc).
- `js/ranking.js` (existente) — passa a receber só palpites de contas.
- `js/db.js` (existente) — ganha métodos de usuários e placares.

## API (serverless)

### `api/auth.js`
- `POST {acao:'registrar', username, pin}` → valida, cria conta (`nome = username`, `username_lc`, `pin_hash`), devolve `{ token, perfil }`.
- `POST {acao:'entrar', username, pin}` → confere o PIN, devolve `{ token, perfil }`.
- `POST {acao:'google', idToken}` → valida o ID token (`GOOGLE_CLIENT_ID`) e extrai do próprio token: `sub`, `name`, `picture` (**não** lê e-mail).
  - Conta existente com esse `sub` → atualiza nome/foto (caso tenham mudado) e devolve `{ token, perfil }`.
  - Conta nova → cria com `nome = name`, `foto_url = picture`, `google_sub = sub` e devolve token. **Não precisa escolher username** (o nome do Google já é a exibição).
- Resposta de login devolve `perfil = { id, nome, foto }` para o front mostrar.
- Erros claros: username em uso (PIN), PIN errado, etc. — mensagens simples.

### `api/palpites.js` (atualiza)
- `POST` aceita `Authorization: Bearer <token>` opcional. Logado → grava `conta_id` + `apelido = username`. Anônimo → `conta_id` nulo (continua contando na vibe).
- `GET ?ranking` → agrega **só** palpites com `conta_id` não nulo, por conta, com `nome` e `foto_url`.
- `GET ?jogoId` (vibe) → inalterado (distribuição de todos os palpites).

### `api/placar-jogo.js` (novo)
- `POST` (exige sessão) `{ golsNaPartida, sequenciaNaPartida }` → upsert: `gols += golsNaPartida`, `melhor_sequencia = max(atual, sequenciaNaPartida)`.
- `GET ?ranking` → top contas por gols (desempate melhor_sequencia), com `nome` e `foto_url`.

### Sessão
Token JWT no `localStorage` (`copaSessao`), enviado como `Bearer` nas ações que
identificam a conta. `verificarSessao` no servidor decide quem é a conta.

## Front-end

- **Barra de identidade** (topo): anônimo → "Entrar pra disputar o pódio 🏆"; logado → avatar (foto ou inicial) + "Olá, <nome> · sair".
- **Modal de login**: abas "Usuário + PIN" (entrar/criar) e botão "Entrar com Google" (Google Identity Services). Google não pede username (usa o nome do Google).
- **Palpite**: logado usa o nome da conta (some o campo apelido); anônimo mantém o apelido + convite discreto. Mostra o **ranking de palpites** (pódio) com nome + avatar.
- **Jogo**: rastreia gols e sequência da sessão; logado envia o resultado; mostra o **ranking do jogo** com nome + avatar. Convite discreto pra anônimo.
- **Avatar**: usa `foto_url` quando existe; senão, um círculo com a inicial do nome (fallback também se a foto do Google falhar ao carregar).
- Google Identity Services carregado por `<script>`; usa o `GOOGLE_CLIENT_ID`.

## Rastreio de sequência no jogo

`js/jogo-gol.js` passa a contar a sequência de gols seguidos (zera ao não marcar)
e a informar no callback: `onGol({ sequencia })`. O app, se logado, envia
`{ golsNaPartida: 1, sequenciaNaPartida: sequencia }` a cada gol.

## Testes

- `senha`: hash/verifica PIN (roundtrip + PIN errado falha).
- `sessao`: assina/verifica (roundtrip + token adulterado rejeitado + expirado).
- `usuario-validacao`: usernames e PINs válidos/ inválidos.
- `ranking-jogo`: ordena por gols e desempata por sequência.
- `ranking` (palpite): considera só contas.
- `db`: novos métodos (usuários, placares) com `consulta` fake.
- handlers (`auth`, `placar-jogo`, `palpites`) com db e Google mockados; sessão Bearer.

## Setup / variáveis de ambiente (Vercel)

- `GOOGLE_CLIENT_ID` — OAuth 2.0 Client ID criado no **Google Cloud**
  (origens autorizadas: o domínio Vercel + `http://localhost:3000`).
- `SESSION_SECRET` — segredo aleatório forte para assinar a sessão.
- Já existentes: `DATABASE_URL` (Neon), `API_KEY` (football-data.org).
- Dependência nova: `google-auth-library`.

## Fora do escopo (v2)

- Recuperação de PIN esquecido (sem e-mail, não dá — avisar que o PIN não tem recuperação).
- E-mail do Google ou qualquer dado além de nome + foto + `sub`.
- Migrar palpites anônimos antigos para contas.
- Vínculo de uma mesma conta a PIN **e** Google ao mesmo tempo (cada conta usa um método; dá pra evoluir depois).

## Faseamento (2 planos)

1. **Contas & login** — tabela `usuarios`, `senha.js`, `sessao.js`, validações,
   `api/auth.js` (PIN + Google + sessão), barra de identidade + modal de login,
   convites de login. Palpite/jogo passam a anexar `conta_id` quando logado
   (mas rankings ainda na forma atual).
2. **Persistência & rankings** — `conta_id` no palpite, tabela `placares_jogo`,
   `api/placar-jogo.js`, sequência no `jogo-gol.js`, ranking de palpite por
   conta e ranking do jogo (UI nas duas seções).

## Riscos / a confirmar no deploy

1. Criar o OAuth Client no Google Cloud e setar `GOOGLE_CLIENT_ID` (origens certas).
2. Sem recuperação de PIN — deixar isso claro pro usuário no modal.
3. `google-auth-library` no runtime serverless da Vercel (Node) — validar no deploy.
4. Unicidade de username é case-insensitive (`username_lc`).
