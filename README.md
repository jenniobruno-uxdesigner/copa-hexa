# Copa pra Leigos — "Temos chance ao hexa?"

A Copa explicada pra quem quer torcer pelo Brasil sem saber nada de futebol.

## Rodar localmente

```bash
npm test        # roda os testes (node --test)
npm run dev     # site estático em http://localhost:3000
```

No `npm run dev` o site usa o fixture `fixtures/estado-mock.json` como dados
(o `/api/dados` só existe na Vercel). Para testar a função serverless de
verdade localmente, use `vercel dev` com a variável `API_KEY` definida.

## Dados ao vivo

A função `api/dados.js` busca a football-data.org (competição `WC`) e
normaliza para o contrato interno. Em qualquer falha, devolve
`dados-manual.json` (editável à mão durante a Copa).

## Variáveis de ambiente (Vercel)

- `API_KEY` — token da football-data.org (header `X-Auth-Token`).
- `DATABASE_URL` — string de conexão do Neon (usada no Plano 3, palpites).

## Deploy

Deploy na Vercel (conta Hobby). Os commits precisam ter como autor
`jenni.o.bruno@gmail.com`, senão o Vercel Hobby bloqueia o deploy.
