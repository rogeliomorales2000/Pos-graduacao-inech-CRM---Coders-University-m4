# Plano — sign-out (+ pré-requisitos mínimos de auth-base)

## Problema

A spec `sign-out` é a primeira feature de auth a ser implementada, mas depende da `auth-base` (tabela `sessions`, helpers de sessão, scaffolding `/api/v1/auth/*`, roteamento `/auth/*` público vs `/app/*` privado) que ainda não existe. Decisão do usuário: **implementar sign-out + pré-requisitos mínimos** nesta iteração (sem fazer a `auth-base` inteira).

## Abordagem

Construir o pedestal mínimo estritamente necessário ao sign-out e às suas validações:

1. **Migration** `sessions` no Postgres local (suporta cookie de sessão/revogação).
2. **Cliente de banco** (`postgres`) em `@apps/api` + módulo de sessões (create/read/revoke, token hashado).
3. **Endpoints** `POST /api/v1/auth/sign-out` e `GET /api/v1/auth/me` (este último para o guard de rotas do cliente conhecer a autenticação via cookie httpOnly).
4. **Roteamento do cliente** com `react-router-dom`: `/auth/*` público, `/app/*` privado (guard), placeholder `/auth/sign-in`, placeholder `/app/home` com o botão "Sign out".

Fora do escopo desta iteração (ficam para `auth-base` e demais specs): `users`/tokens, bcrypt, EmailService, e os fluxos sign-up/confirm-account/sign-in/forgot/reset.

## Q&As (feature-concept / breakdown)

- **Stack/auth?** Custom + bcrypt sobre Postgres local (bcrypt entra na `auth-base`).
- **Tratamento da dependência?** Sign-out + pré-requisitos mínimos na mesma iteração (aceite do usuário).
- **"Confirmação de celular"?** Campo repetido (não se aplica a esta iteração).
- **Email?** EmailService (Mailtrap dev / Resend prod) — entra na `auth-base`.
- **Idioma/rotas/API?** en-us; `/auth/*` público, `/app/*` privado; `/api/v1/auth/*`.

## Passos de implementação

1. `supabase/migrations/<ts>_sessions.sql` — tabela `sessions` (id, user_id, token_hash unique, expires_at, revoked_at, created_at, last_active_at) + índices. Aplicar com `bun run db:migrate`.
2. `bun add postgres` (api) e `bun add react-router-dom` (app).
3. `apps/api/lib/db.ts` (singleton do `postgres`), `apps/api/lib/auth/sessions.ts` (session cookie, hash de token, create/read/revoke).
4. `apps/api/lib/auth/errors.ts` (erro JSON `{ error: { code, message } }`).
5. Rotas `apps/api/app/api/v1/auth/sign-out/route.ts` (POST) e `apps/api/app/api/v1/auth/me/route.ts` (GET).
6. Cliente: `vite.config.ts` proxy `/api` → 3002; `src/lib/api.ts` (fetch me/sign-out); `src/components/RequireAuth.tsx` e `RequirePublic.tsx`; páginas `src/pages/auth/SignInPage.tsx` e `src/pages/app/HomePage.tsx`; `App.tsx` com rotas; `main.tsx` com `BrowserRouter`; título do `index.html`.
7. Testes: `sessions.spec.ts` (unit/DB), `sign-out.route.spec.ts` + `auth.supertest.spec.ts` (integração real), componente do HomePage/sign-out, atualizar `App.spec.tsx` e `e2e/app.spec.ts`.
8. QA: `bun run lint`, `bun run check-types`, `bun run test`, `bun run format`.
9. ADR `0004-...` + relatório + `bun run commit-and-push`.

## Critérios de aceite (da spec sign-out)

- POST sign-out com sessão válida: `revoked_at` preenchido, cookie limpo, 200.
- POST sign-out sem sessão: 200 idempotente.
- Após sign-out, sessão antiga não autentica; `/app/*` redireciona para `/auth/sign-in`.
- Outras sessões do mesmo usuário não são revogadas por este sign-out.
- Guard de rotas: sem autenticação → `/auth/sign-in`; com autenticação → `/app/home`.
