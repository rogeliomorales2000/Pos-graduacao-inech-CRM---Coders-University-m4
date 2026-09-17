# Plano — 001 auth-base (validação e fechamento da fundação de auth)

## Problema

A `auth-base` é a fundação do domínio de autenticação. O código dos fluxos e da
base já existe no repositório (commits de sign-out/sign-up/reset/confirm), mas a
spec permanece como `rascunho` e alguns critérios de aceite não haviam sido
verificados de ponta a ponta. Esta iteração **valida, completa e corrige** o que
existe — sem reescrever nem remover comportamento funcional.

## Abordagem

1. **Auditoria do estado atual** (código, migration, docs, ADR) contra os
   critérios de aceite da spec `./.specs/001-auth-base.md`.
2. **Completar a lacuna** de aceite não coberta: teste unitário do `EmailService`
   com provider mockado / seleção por `EMAIL_PROVIDER` (`lib/auth/email.spec.ts`).
3. **Rodar os portões de QA** (`db:migrate`, `lint`, `check-types`, `format` e
   suíte `test`) e registrar as limitações de ambiente.
4. **Fechar processo**: plano, progresso e relatório da orquestração; sem commit
   (deixar a árvore suja, conforme instrução do run paralelo).

## Estado validado (já-coberto)

- **Schema**: migration `20260918093000_auth_users.sql` + `20260917223000_sessions.sql`
  aplicadas no Postgres local. Tabelas `users`, `sessions`,
  `email_confirmation_tokens`, `password_reset_tokens` com PK, UNIQUE
  (`users.email`, `*_token_hash`), FKs (`sessions.user_id`, tokens → users) e
  índices. Verificado por consulta direta em `information_schema`.
- **bcrypt**: `bcrypt@^6` + `@types/bcrypt` em `@apps/api`; `passwords.ts`
  (`hashPassword`/`verifyPassword`, 10 rounds); coberto por `sign-up/route.spec.ts`
  e por `auth-helpers.ts` (`createTestUser`).
- **EmailService**: `lib/auth/email.ts` com `ConsoleEmailProvider`,
  `MailtrapEmailProvider`, `ResendEmailProvider` e `createEmailProvider()`
  selecionando por `EMAIL_PROVIDER` (fallback console em não-prod, resend em prod).
- **Scaffolding `/api/v1/auth/*`**: helpers de erro (`{ error: { code, message, fields? } }`),
  validação, cookie httpOnly `session`, sessões (create/read/revoke/revokeAll) e
  tokens (confirmação/reset). Catch-all `[[...unknown]]` responde 404 JSON.
- **Cliente `@apps/app`**: `react-router-dom@^7`, grupos `/auth/*` (`RequirePublic`)
  e `/app/*` (`RequireAuth`), home placeholder, proxy Vite `/api` → 3002.
- **Docs/ADR**: `DEVELOPMENT.md` (en-us, `/api/v1/*`, email) e `ARCHITECTURE.md`
  refletem o estado implementado; `adrs/0005-auth-base.md` registra as decisões.

## Passos executados nesta iteração

1. Auditar código/DB/docs/ADR (acima).
2. Adicionar `apps/api/lib/auth/email.spec.ts` (12 casos: seleção de provider,
   fallback dev/prod, log do console, conteúdo dos 4 emails, parsing do remetente).
3. `bun run db:migrate` → "Remote database is up to date".
4. QA: `format` (corrigiu 11 arquivos), `lint` e `check-types` (via runtime do
   Bun, pois o Node do ambiente é 18 e o projeto exige ≥ 24/20.9), `test`
   (api 61 testes / app 5 testes).
5. Escrever progresso e relatório da orquestração. Sem ADR novo (decisões já em
   0005); sem commit.

## Critérios de aceite (verificação)

- [x] `db:migrate` aplica sem erro (base já migrada; comando confirma up to date).
- [x] 4 tabelas com colunas/restrições/unicidade conferidas por SQL.
- [x] `bcrypt` no `package.json` e hash gerado/comparado (routes/helpers).
- [x] `EmailService` por `EMAIL_PROVIDER` + fallback console — unit test novo.
- [x] Base `/api/v1/auth` responde 404 JSON padronizado.
- [x] Helpers de sessão cobertos por `sessions.spec.ts` + rotas `me`/`sign-out`.
- [x] Guardas do cliente cobertos por `App.spec.tsx`.
- [x] `react-router-dom` instalado/configurado.
- [x] Docs (en-us, `/api/v1/*`, email) e ADR `0005`.
- [x] `lint`/`check-types`/`format`/`test` sem erros de código (limitação: Node 18
      do ambiente impede o pipeline via `turbo`; validado com runtime do Bun).

## Riscos / observações

- Ambiente com Node 18.19.1 (projeto exige ≥ 24): `bun run lint`/`check-types`
  falham dentro do `turbo` por versão de Node, não por erro de código.
- `api.supertest.spec.ts` sobe `next dev` e conflita com dev server na mesma
  pasta `.next`; não executado nesta validação (E2E/Playwright fora do escopo).
