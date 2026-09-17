# ADR 0004 — Sign-out antecipado com pré-requisitos mínimos de auth

- **Data**: 2026-09-17
- **Status**: Aceito
- **Decisores**: dono do produto / dono do repositório
- **Spec**: `./.specs/002-sign-out.md`

## Contexto

O fluxo de autenticação foi decomposto em 7 specs (`auth-base`, `sign-out`, `sign-up`, `confirm-account`, `sign-in`, `forgot-password`, `reset-password`). O usuário pediu para implementar **`sign-out` primeiro**, mas o logout depende de infraestrutura da `auth-base` (tabela `sessions`, helpers de sessão com cookie httpOnly, scaffold `/api/v1/auth/*`, roteamento `/auth/*` público vs `/app/*` privado) que não existia — a fundação só deixou o `GET /` de hello world na API e a página estática no cliente.

Decisão de escopo (aceite explícito do usuário): implementar **sign-out + os pré-requisitos mínimos** na mesma iteração, adiando o restante da `auth-base` (users, bcrypt, EmailService, tokens de confirmação/reset) para a iteração seguinte.

## Decisão

### 1. Pedestal mínimo de auth no lugar de `auth-base` inteira

- Entra agora: tabela `sessions` (Postgres local), cliente de banco (`postgres`/porsager), módulo de sessões (create/read/revoke com `token_hash` sha-256), endpoints `POST /api/v1/auth/sign-out` e `GET /api/v1/auth/me`, roteamento do cliente com guard.
- **Não** entra agora (fica para `auth-base`): `users`, `email_confirmation_tokens`, `password_reset_tokens`, bcrypt, EmailService (Mailtrap/Resend). A tabela `sessions` nasce **sem FK para `users`** (a tabela ainda não existe); a `auth-base` adiciona `users` e a FK via ALTER na migração dela.

### 2. Cliente de banco e acesso

- `postgres@^3.4.9` (porsager) em `@apps/api`, instância singleton (global em dev para sobreviver a HMR), connection string por env `DB_URL` com default local `postgresql://postgres:postgres@localhost:54322/postgres`.
- **Sem RLS** nesta fase: a API é o único cliente de confiança do banco; RLS protege acesso por anon key do Supabase (não usado aqui). Revisitar quando houver acesso externo ao schema.

### 3. Sessão e cookie

- Cookie httpOnly **`session`** (sameSite lax, secure apenas em produção), expiração de 14 dias.
- Banco guarda **hash sha-256** do token (`token_hash`, único); nunca o token em claro.
- `sign-out` revoga **somente a sessão corrente** (`revoked_at = now()`) e é idempotente (200 mesmo sem sessão). Sessões de outras máquinas permanecem válidas — a política "última vence" fica para o `sign-in`.
- `GET /api/v1/auth/me` devolve `{ user: { id } }` quando há sessão válida e 401 `UNAUTHENTICATED` (limpando o cookie) caso contrário — alimenta os guards do cliente.

### 4. Roteamento no cliente

- `react-router-dom@^7` em `@apps/app`, `BrowserRouter` no `main.tsx`.
- `/auth/*` **público** (`RequirePublic`: autenticado → `/app/home`), `/app/*` **privado** (`RequireAuth`: sem sessão → `/auth/sign-in`); `/` e `*` redirecionam para `/app/home`.
- Placeholders: `/auth/sign-in` (alvo de redirecionamento) e `/app/home` (com o botão **Sign out**). Vite dev com proxy `/api` → `http://localhost:3002`.

### 5. Resolução de imports e testes

- Alias `@/*` no `@apps/api` via `tsconfig.json` (paths) **sem** `baseUrl` (o TypeScript 7 removeu o suporte) + `resolve.alias` no Vitest.
- Testes de rota disparando os `NextRequest`/handlers diretamente contra o banco local (sem bootar servidor Next), somados ao supertest/Playwright existentes.
- `vitest.setup.ts` do cliente ganhou cleanup explícito do Testing Library (Vitest sem `globals:true` não registra auto-cleanup).

## Consequências

- O `bun run test` passa a exigir o banco local de pé (`infra:up`) por causa dos testes DB-backed (sessions/rotas).
- `ARCHITECTURE.md`/`DEVELOPMENT.md` serão atualizados na `auth-base` (convenção en-us, `/api/v1/*`, EmailService); esta iteração registra as decisões técnicas aqui.
- Próxima iteração: `auth-base` completa (users + tokens, bcrypt, EmailService Mailtrap/Resend, documentação en-us/versionamento).
