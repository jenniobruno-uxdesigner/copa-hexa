# Copa pra Leigos — Plano 2: Persistência & rankings (pódio)

> Continuação do Plano 1 (contas & login). Lógica pura testada com `node --test`;
> handlers serverless com db/sessão/Google mockados. Branch: `feat/persistencia-rankings`.

**Goal:** Ligar palpites e o jogo de pênalti à conta logada e exibir os rankings
(pódio) de palpites e de gols, com nome + avatar. Anônimo segue funcionando;
só o pódio exige login.

## Esquema (adições no Neon)
```sql
ALTER TABLE palpites ADD COLUMN IF NOT EXISTS conta_id BIGINT;
CREATE TABLE IF NOT EXISTS placares_jogo (
  conta_id         BIGINT PRIMARY KEY REFERENCES usuarios(id),
  gols             INT NOT NULL DEFAULT 0,
  melhor_sequencia INT NOT NULL DEFAULT 0,
  atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Tarefas
1. **db.js** — `garantirEsquema` também roda o ALTER do `conta_id`; `salvarPalpite` grava `conta_id`; novos: `palpitesDeContas()`, `garantirEsquemaPlacares()`, `registrarResultadoJogo({contaId,gols,sequencia})`, `rankingJogo()`. + testes.
2. **ranking-jogo.js** — `ordenarRankingJogo(linhas)` (gols desc, melhorSequencia desc). + testes.
3. **ranking.js** — `calcularRanking` passa a carregar `foto` no resultado. + testes.
4. **placar-servico.js** — `tratarPlacar(req,res,{db,usuarioDaSessao})`: POST (logado) registra; GET `?ranking` devolve ordenado. + testes.
5. **api/placar-jogo.js** — wiring (Neon + sessão via Bearer); **api/palpites.js** passa `usuarioDaSessao`.
6. **palpites-servico.js** — POST anexa `conta_id` + `apelido=nome` quando logado (Bearer); ranking usa `palpitesDeContas`. + testes atualizados.
7. **jogo-gol.js** — conta a sequência de gols e informa em `onGol({sequencia})`.
8. **Front** — `renderRanking` com avatar; `renderPalpite` modo logado (sem apelido); ranking do jogo na seção; convites de pódio; wiring no `app.js`. Verificação no preview.

## Contratos
- Palpite (logado): `usuario_id = "conta-<id>"`, `conta_id = <id>`, `apelido = nome`.
- Sessão: Bearer `<token>` → `verificarSessao` → `{id, nome}`.
- Ranking palpite (linha): `{ usuarioId, apelido(=nome), foto, pontos, acertos }`.
- Ranking jogo (linha): `{ nome, foto, gols, melhorSequencia }`.
