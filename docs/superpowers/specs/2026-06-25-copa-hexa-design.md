# Copa pra Leigos — "Temos chance ao hexa?"

**Data:** 2026-06-25
**Status:** Design aprovado, aguardando revisão final

## Objetivo

Um site de página única, festivo e divertido, para pessoas que querem
participar da Copa e torcer pelo Brasil **sem entender de futebol**. O site
responde, de forma simples e honesta, à pergunta "Temos chance ao hexa?",
explica o que precisa acontecer nos próximos jogos e ensina as regras do
futebol em linguagem que uma criança de 6 anos entenderia.

O tom é leve, comemorativo e brasileiro: bandeira, bolas e confete animados,
interações com o cursor e um mini-joguinho de chutar a gol.

## Público-alvo

Quem quer fazer parte da festa da Copa mas fica perguntando as regras o jogo
todo. O site assume **zero conhecimento de futebol** e traduz todo termo
técnico.

## Decisões principais

| Tema | Decisão |
|---|---|
| Dados | Híbrido: API gratuita ao vivo + arquivo manual de segurança |
| Hospedagem | Vercel (com função serverless para esconder a chave da API) |
| Banco de dados | Neon (Postgres serverless) para palpites e ranking |
| Termômetro do hexa | Regras simples e transparentes (sem porcentagem inventada) |
| Glossário | Termos explicados inline (clicáveis) **+** glossário geral no fim |
| Memes | Fora do escopo (v2) |
| Stack | HTML/CSS/JS puro (sem framework), no padrão dos outros sites |

## Arquitetura

Projeto hospedado na Vercel, repositório próprio:

```
copa-hexa/
  index.html            # a página única, todas as seções
  styles.css            # estilos + animações (confete, bolas, bandeira)
  app.js                # lógica de UI, termômetro, interações, joguinho
  api/
    dados.js            # função serverless: busca a API e devolve JSON limpo
    palpites.js         # função serverless: grava/lê palpites e ranking (Neon)
  dados-manual.json     # rede de segurança (resultados editados na mão)
  assets/               # imagens/sons (bola, apito, etc.)
  docs/                 # specs e planos
```

### Fluxo de dados (jogos)

1. O navegador chama `/api/dados` (mesma origem — sem problema de CORS).
2. A função serverless `api/dados.js`:
   - Lê a chave da API de uma variável de ambiente da Vercel (`API_KEY`).
   - Busca na API externa: jogos do Brasil, tabela do grupo, artilheiros.
   - **Normaliza** a resposta para um formato simples e estável que o
     front-end entende (não expõe o formato bruto da API).
   - Em caso de falha (API fora do ar, limite estourado), responde com o
     conteúdo de `dados-manual.json`.
   - Faz cache curto (ex.: 5–10 min) para respeitar o limite gratuito.
3. O `app.js` recebe o JSON normalizado e monta as seções.

### Fonte de dados (API)

Candidata principal: **football-data.org** (gratuito "para sempre" nas
principais competições, inclui a Copa do Mundo; limite ~10 req/min).
Alternativa: **API-Football** (100 req/dia no plano grátis).

> A escolha final e o código exato da competição da Copa 2026 serão
> confirmados na implementação, testando o endpoint real. A normalização na
> função serverless isola o resto do site dessa escolha — trocar de API
> depois não afeta o front-end.

### Formato JSON normalizado (contrato interno)

```json
{
  "atualizadoEm": "2026-06-25T12:00:00Z",
  "fonte": "api" | "manual",
  "proximoJogo": {
    "id": "BRA-SRB-2026-06-28",
    "adversario": "Sérvia",
    "data": "2026-06-28T19:00:00Z",
    "fase": "Fase de grupos - 2ª rodada",
    "encerrado": false,
    "placarBrasil": null,
    "placarAdversario": null
  },
  "grupo": {
    "nome": "Grupo G",
    "times": [
      { "nome": "Brasil", "posicao": 1, "pontos": 3, "jogos": 1, "saldo": 2 }
    ]
  },
  "artilheiros": [
    { "nome": "Jogador X", "time": "Brasil", "gols": 2 }
  ]
}
```

## Termômetro do hexa (regra transparente)

O status sai da situação real do Brasil, sem porcentagem inventada. A lógica
é em camadas, da mais grave para a melhor:

- **Eliminado** → "A Copa acabou pra gente desta vez 😢"
- **Fase de grupos, em risco** (fora do top 2 do grupo, ou dependendo de
  outros resultados) → "Sinal de alerta 🟡 — precisa vencer o próximo jogo"
- **Fase de grupos, no caminho** (no top 2, mas ainda não garantido) →
  "No caminho 🙂 — bem encaminhado, falta confirmar"
- **Classificado para o mata-mata** → "Indo muito bem! 🟢"
- **Campeão** → "HEXA! 🏆🎉"

Cada status vem com uma frase de "o que precisa acontecer agora", derivada da
posição na tabela e do próximo adversário (ex.: "Se o Brasil ganhar da
Sérvia, já está classificado").

> As regras exatas de classificação (critérios de desempate, quantos passam)
> serão refinadas na implementação conforme o formato oficial da Copa 2026.

## Palpites compartilhados e ranking (Neon)

Funcionalidade da V1. Sem login — identidade leve pra não assustar o leigo.

### Mecânica

- A pessoa escolhe um **apelido** e um **placar** para o próximo jogo e envia.
- O apelido + um **id gerado no navegador** (guardado em `localStorage`)
  identificam a pessoa, para ela manter os pontos entre visitas. É festivo,
  não vale dinheiro — não há proteção forte contra trapaça.
- **Antes do jogo:** o site mostra a "vibe da galera" (distribuição dos
  palpites, ex.: "45% acham 2×1 pro Brasil") e o total de palpites.
- **Depois do jogo:** quando `api/dados` traz o jogo como `encerrado` com
  placar, cada palpite daquele jogo é pontuado:
  - **placar exato = 3 pontos**
  - **acertou só o vencedor (ou o empate) = 1 ponto**
  - **errou = 0**
- **Ranking:** soma dos pontos por pessoa ao longo da Copa; mostra os
  melhores palpiteiros.

### Endpoints (`api/palpites.js`)

- `POST /api/palpites` — body `{ jogoId, apelido, usuarioId, placarBrasil,
  placarAdversario }`. Grava (ou atualiza, se a pessoa repalpitar antes do
  jogo começar) o palpite.
- `GET /api/palpites?jogoId=...` — devolve a distribuição/"vibe" do jogo.
- `GET /api/palpites/ranking` — devolve o ranking acumulado.

A pontuação é calculada quando o resultado do jogo já existe — feita ao ler o
ranking (comparando palpites com o placar final vindo de `api/dados`), ou por
uma rotina simples de fechamento de jogo. A decisão exata fica para o plano.

### Esquema do banco (Neon / Postgres)

```sql
CREATE TABLE palpites (
  id            BIGSERIAL PRIMARY KEY,
  jogo_id       TEXT NOT NULL,
  usuario_id    TEXT NOT NULL,          -- id do navegador (localStorage)
  apelido       TEXT NOT NULL,
  placar_brasil      INT NOT NULL,
  placar_adversario  INT NOT NULL,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (jogo_id, usuario_id)          -- um palpite por jogo por pessoa
);
```

O ranking é uma agregação por `usuario_id`/`apelido` dos pontos calculados
contra os placares finais dos jogos.

> Variável de ambiente na Vercel: `DATABASE_URL` (string de conexão do Neon).

## Seções da página (ordem)

1. **Topo festivo** — bandeira, bolas e confete animados; título "Temos
   chance ao hexa?"; o termômetro logo de cara. *(confete na entrada)*
2. **"Calma, eu te explico"** — intro curta: "Pra quem quer entender a Copa
   sem saber nada de futebol." Define o tom e a promessa do site.
3. **Próximo jogo** — quando, contra quem, e "o que precisa acontecer"
   explicado simples. *(bolinhas de futebol saindo do cursor)*
4. **O grupo do Brasil** — a tabela traduzida ("o Brasil está em 1º; precisa
   ficar no top 2 pra passar de fase").
5. **Craques pra torcer** — artilheiros vindos da API; ajuda o leigo a saber
   em quem prestar atenção. *(bolinhas no cursor)*
6. **Dar seu palpite + ranking da galera** — o usuário escolhe o placar do
   próximo jogo, vê a "vibe da galera" e o ranking dos melhores palpiteiros.
   Salvo no Neon.
7. **Cola da Copa** — glossário geral, cards divertidos explicando regras
   pra criança de 6 anos (impedimento, escanteio, pênalti, fase de grupos,
   mata-mata, etc.). *(mini-joguinho de chutar a gol + confete ao acertar)*
8. **Compartilhar com amigos** — rodapé com botão de WhatsApp + copiar link.

### Termos inline

Palavras técnicas no corpo do texto aparecem com um marcador clicável (ex.:
um "?" ou sublinhado pontilhado). Ao clicar/passar, abre um balãozinho com a
explicação simples. A mesma definição é reaproveitada na seção "Cola da Copa"
(uma fonte única de definições em `app.js`, sem duplicar texto).

## Interações e animações

- **Confete**: na entrada do topo e ao acertar o gol no joguinho.
- **Bolinhas no cursor**: rastro de mini-bolas seguindo o mouse nas seções 3
  e 5.
- **Joguinho de chutar a gol** (seção 7): clique/arraste para chutar; ao
  acertar o gol, dispara confete. Simples, sem placar persistente.
- Animações puras de CSS/Canvas, sem bibliotecas pesadas. Respeitar
  `prefers-reduced-motion` para quem prefere menos movimento.

## Responsividade e acessibilidade

- Mobile-first (a maioria vai abrir no celular durante os jogos).
- Texto com bom contraste sobre o fundo festivo.
- As interações de cursor/joguinho são "tempero" — o conteúdo principal
  (termômetro, próximo jogo, palpite, glossário) funciona sem elas, inclusive
  no celular onde não há cursor.

## Fora do escopo (v2)

- Seção de memes.
- Login/contas de verdade (V1 usa apelido + id no navegador).
- Notificações/push de jogos.
- Porcentagem estatística de chance de título.

## Riscos e pontos a confirmar na implementação

1. Disponibilidade e código da competição da Copa 2026 na API escolhida.
2. Formato e critérios de classificação oficiais da Copa 2026.
3. Conteúdo do `dados-manual.json` precisa de manutenção manual quando a API
   falhar.
4. Sem login, o ranking é vulnerável a apelidos repetidos/trapaça — aceitável
   por ser festivo; reavaliar se virar problema.
5. Momento exato do cálculo da pontuação (na leitura do ranking x rotina de
   fechamento) a definir no plano.

## Deploy

- Repositório próprio (`copa-hexa/`), deploy na Vercel (conta Hobby de
  `jenni.o.bruno@gmail.com`).
- **Commits devem ter como autor `jenni.o.bruno@gmail.com`** (nome
  `jenniobruno-uxdesigner`), senão o Vercel Hobby bloqueia o deploy.
- Variáveis de ambiente na Vercel: `API_KEY` (API de futebol) e
  `DATABASE_URL` (Neon).
