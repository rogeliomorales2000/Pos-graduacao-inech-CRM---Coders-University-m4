# ADR 0005 — Auth base: auth custom + bcrypt, schema de auth, EmailService e UIs dos fluxos

- **Data**: 2026-09-17
- **Status**: Aceito
- **Decisores**: dono do produto / dono do repositório
- **Spec**: `./.specs/auth-base.md` (+ sign-up, confirm-account, sign-in, forgot-password, reset-password, entregues na mesma iteração)

## Contexto

A `auth-base` foi escrita como a fundação do domínio de autenticação, mas a
iteração anterior ficou interrompida com parte do código no working tree. Na
retomada, o usuário decidiu:

1. **commitar auth-base + os 5 fluxos em uma única iteração** (em vez de uma
   spec por iteração), preservando o trabalho já escrito;
2. **implementar as UIs dos fluxos**, que ainda eram placeholders;
3. **remover a rota de debug `dev-session`**;
4. **não adicionar testes novos** — confiar na suíte existente.

O `sign-out` (ADR 0004) já havia fixado sessão, cookie, roteamento e
`react-router-dom`. Faltavam a camada de usuários/tokens, bcrypt, o serviço de
email e as telas.

## Decisão

### 1. Auth custom + bcrypt sobre o Postgres local (não Supabase Auth)

- Requisitos custom do produto — **uma sessão válida por pessoa ("última
  vence")**, confirmação de telefone no login, tokens em email e campos
  nome/sobrenome/telefone — não encaixam no supabase-auth pronto.
- A autenticação é implementada no `@apps/api` com **bcrypt** para senha e
  **tokens opacos** (sha-256) para sessão/confirmação/reset. O Supabase
  permanece apenas como banco/Storage em alvo, **não** como provedor de auth.
- Entra `bcrypt@^6` (`@types/bcrypt` como dev). Risco de binário nativo é
  mitigado pelo fallback `bcryptjs` documentado na spec.

### 2. Schema de auth no Postgres local

- Migration `20260918093000_auth_users.sql` cria `users`,
  `email_confirmation_tokens` e `password_reset_tokens`, e adiciona a FK
  `sessions.user_id -> users.id` (on delete cascade), completando o pedestal do
  ADR 0004. Sessões órfãs são removidas antes da FK.
- `users.email` é único; todos os tokens guardam **`token_hash`** único +
  `expires_at` + `consumed_at` (uso único). Senha sempre como `password_hash`.
- Migrações continuam via Supabase CLI (`bun run db:migrate`), que aponta para o
  Postgres local — o Supabase é usado como banco puro.

### 3. `EmailService` com provider por env

- Interface única (`sendConfirmationEmail`, `sendNewSessionEmail`,
  `sendPasswordResetEmail`, `sendPasswordResetSuccess`) com três providers:
  - **`console`** — default em dev; loga o conteúdo completo (token/link
    visíveis) para validar o fluxo sem credenciais.
  - **`mailtrap`** — ambientes não-produção, via `MAILTRAP_API_TOKEN`.
  - **`resend`** — produção, via `RESEND_API_KEY`; default quando
    `NODE_ENV=production` e `EMAIL_PROVIDER` ausente.
- Seleção por `EMAIL_PROVIDER`; `APP_URL` monta os links; `EMAIL_FROM` define o
  remetente. Credenciais só por `.env` (`.env.example` documenta as vars).

### 4. Contratos de sessão, token e erro

- Cookie **httpOnly `session`** (sameSite lax, secure em produção), 14 dias;
  banco guarda só o hash do token.
- Sessão válida = `revoked_at IS NULL` **e** `expires_at > now()`;
  `revokeAllSessionsForUser` sustenta a política "última vence" no sign-in.
- Respostas de erro padronizadas em `{ error: { code, message, fields? } }`.
  Adicionada uma rota catch-all opcional em `/api/v1/auth/[[...unknown]]` que
  devolve **404 JSON** no mesmo formato para sub-rotas inexistentes.

### 5. Roteamento e UIs dos fluxos no cliente

- `react-router-dom@^7` (já do ADR 0004) consolida os grupos: `/auth/*`
  **público** (`RequirePublic`) e `/app/*` **privado** (`RequireAuth`), com
  home em `/app/home`.
- As 5 telas (`/auth/sign-up`, `/auth/confirm-account`, `/auth/sign-in`,
  `/auth/forgot-password`, `/auth/reset-password`) foram implementadas com
  formulários acessíveis (labels associados, `autocomplete`, `type`/`inputMode`
  corretos, `aria-invalid`/`aria-describedby`, `aria-live` nos alertas, foco no
  primeiro erro), estados idle/loading/erro/sucesso e textos en-us.
- Confirm-account dispara a confirmação no load e redireciona para `/app/home`;
  reset-password navega para `/auth/sign-in` com aviso de sucesso.
- Sem design system ainda (shadcn é alvo): estilos mínimos próprios em
  `index.css`, com `theme-color`, foco visível e `prefers-reduced-motion`.

## Consequências

- O `bun run test` do `@apps/api` continua exigindo o Postgres local de pé; os
  specs de `me`/`sign-out` foram ajustados para criar usuários reais antes das
  sessões, agora que a FK `sessions.user_id` existe.
- `ARCHITECTURE.md` (bcrypt/auth implementados; Supabase Auth fora do escopo) e
  `DEVELOPMENT.md` (en-us, `/api/v1/*`, config de email) refletem o estado.
- O supertest (`tests/api.supertest.spec.ts`) sobe um `next dev` próprio e
  **conflita com um dev server já rodando** na mesma pasta `.next`; rodar a
  suíte com o `apps/api` parado (ou o teste isolado) evita o lock.
- Rollback: reverter migration/dependências/docs via git; sem dados de produção.
