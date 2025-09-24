# Nodus - Sistema de Avaliação Institucional (anonimato auditável)

Backend em NestJS com PostgreSQL e MailHog via Docker Compose. Gera tokens anônimos com prova auditável (árvore de Merkle), aceita respostas de forma anônima e mantém trilha de auditoria sem dados pessoais.

## Requisitos
- Docker e Docker Compose

## Subir o ambiente

1. Copie variáveis de ambiente (opcional em dev):
   - O `docker-compose.yml` já define variáveis suficientes para rodar.
   - Se desejar rodar fora do Docker, copie `server/.env.example` para `server/.env` e ajuste `DATABASE_URL`.

2. Build e up:
```bash
# No diretório raiz do projeto
docker compose build
docker compose up
```

- Postgres: porta 5432
- MailHog: http://localhost:8025 (SMTP em 1025)
- API NestJS: http://localhost:3000
- Ao subir, o servidor executa `prisma migrate dev` automaticamente.

## Endpoints principais

- Healthcheck:
  - `GET http://localhost:3000/health`

- Admin (requer Basic Auth: admin/admin123 - troque depois):
  - `POST /admin/surveys` { title, description? }
  - `POST /admin/surveys/:id/questions` { type: "MULTIPLE_CHOICE"|"TEXT", prompt, required?, options? }
  - `POST /admin/surveys/:id/batches` { size }
  - `GET /admin/surveys`
  - `GET /admin/surveys/:id/batches`

- Respondente (anônimo):
  - `GET /respond/surveys/:id` → retorna questionário e perguntas
  - `POST /respond/submit` { surveyId, tokenHash(hex), answers: [{questionId, valueJson}] }

- Auditoria:
  - `GET /audit/batches/:id` → informações do lote e tokens (sem preimagens)
  - `GET /audit/verify?batchId=...&tokenHash=...` → verifica prova com Merkle root

## Fluxo de uso (dev)
1. Crie um questionário.
2. Adicione perguntas.
3. Gere um lote de tokens (ex.: size=10). O retorno inclui `preimages` e `links`.
   - Os links seguem o padrão: `http://localhost:3000/respond/{surveyId}?t={preimage}`.
   - Apenas o cliente deve conhecer a preimagem; o servidor armazena apenas o hash e a prova de inclusão.
4. Para submeter respostas via API, calcule `tokenHash = sha256(preimage)` em hex e envie para `/respond/submit` com as respostas.

## Segurança e Privacidade
- Não coletamos IP/User-Agent.
- Timestamps são quantizados por hora.
- Tokens são de uso único; apenas hash é armazenado.
- Cada lote salva a Merkle root em `AuditLog` (evento `MERKLE_ROOT_CREATED`).

## Melhorias Futuras (TODO)
- Autenticação de Admin robusta (senhas com hash + 2FA, RBAC, CSRF para painel web).
- Exportação CSV de links e envio por e-mail com template.
- Front-end (Next.js) para painel admin e página pública de respostas.
- Limites de taxa (rate limit) e antifraude opcionais.
- Internacionalização PT-BR/EN nas mensagens.

## Desenvolvimento local (fora do Docker) - opcional
```bash
cd server
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate:dev
npm run start:dev
```

