# Plano — 005-sign-in

## Problema

Spec `005-sign-in` (login email+senha+telefone, sessão única, reenvio de
confirmação). Rota `POST /api/v1/auth/sign-in`, página `/auth/sign-in` e rota
`POST /api/v1/auth/resend-confirmation` já existem de trabalho anterior. Esta
iteração audita o estado contra cada critério de aceite da spec e fecha apenas as
lacunas reais.

## Já-coberto (validado, sem alteração)

- **Rota** `apps/api/app/api/v1/auth/sign-in/route.ts`:
  - `validateSignIn` → 400 `VALIDATION_ERROR`;
  - email inexistente → 401 `INVALID_CREDENTIALS` genérico (anti-enumeração);
  - conta não confirmada (`confirmed_at IS NULL`) → 403 `ACCOUNT_NOT_CONFIRMED`
    sem criar sessão nem enviar email;
  - senha via bcrypt errada OU telefone diferente do cadastrado → 401
    `INVALID_CREDENTIALS` genérico (mesma mensagem para qualquer campo);
  - sucesso: `revokeAllSessionsForUser` → `createSession` → cookie httpOnly
    `session` → `sendNewSessionEmail` (via `EmailService`) → 200
    `{ user (público), redirectTo: "/app/home" }`.
- **Testes da rota** (`route.spec.ts`): sucesso (200 + sessão + revoga anterior +
  email type `new-session` + cookie), máquina B revoga máquina A, telefone errado
  (401 sem sessão/email), senha errada (401 genérico), conta não confirmada (403
  sem sessão/email), email inválido (400).
- **Rota** `apps/api/app/api/v1/auth/resend-confirmation/route.ts`: anônima —
  responde 200 `{ ok: true }` para email pendente (envia + revoga token anterior +
  gera novo), email inexistente, conta confirmada e email inválido, sem revelar
  existência (anti-enumeração). **Testes** cobrem os 5 cenários.
- **Página** `apps/app/src/pages/auth/SignInPage.tsx`: form email/password/phone
  com validação client (`focusFirstError` em erro), loading no botão (`aria-busy`),
  erro genérico `INVALID_CREDENTIALS` → `FormAlert`, `ACCOUNT_NOT_CONFIRMED` →
  alerta dedicado + botão "Resend confirmation email" com feedback
  "Check your inbox", banner de sucesso de reset via `location.state`,
  links para `/auth/forgot-password` e `/auth/sign-up`, navega para
  `redirectTo || "/app/home"` no sucesso.
- **Rota pública**: `/auth/sign-in` dentro de `<RequirePublic />` (`App.tsx`);
  guard da `auth-base` barra sessão revogada — `me/route.spec.ts` cobre
  "sessão revogada → 401 e limpa cookie".
- **Acessibilidade/UX (web-design-guidelines aplicado à página existente)**: labels
  com `htmlFor`, `aria-describedby`/`aria-invalid` (FormField), erros anunciados
  (`role="alert"`/`aria-live`), `autocomplete`/`inputMode` corretos,
  `spellCheck={false}` no email, botões `<button>` e links `<Link>`. Sem achados
  relevantes.

## Lacunas reais (a fechar)

1. **Cobertura de UI** — critério de aceite "UI: form valida campos; erro de
   credencial genérico; erro de não-confirmado mostra botão de reenvio com
   feedback" não tem teste de componente (padrão da casa:
   `SignUpPage.spec.tsx`, `ConfirmAccountPage.spec.tsx`). → Criar
   `apps/app/src/pages/auth/SignInPage.spec.tsx`.
2. **Cenário completo "máquina B loga → máquina A revogada → guard barra A"** —
   o critério pede validação integrada do fluxo; hoje a revogação é coberta no
   `route.spec.ts` do sign-in e o 401 por sessão revogada é coberto no
   `me/route.spec.ts`, mas não no mesmo cenário. → Adicionar 1 teste no
   `route.spec.ts` do sign-in que loga na "máquina B" e confirma que o cookie da
   "máquina A" passa a ser barrado por `GET /api/v1/auth/me`.

## Abordagem

- Apenas mudanças aditivas de teste; nenhum comportamento funcional será alterado.
- Seguir os padrões existentes de spec de página (`fireEvent` + `MemoryRouter` +
  `vi.stubGlobal("fetch", ...)`).

## Passos

1. Criar `apps/app/src/pages/auth/SignInPage.spec.tsx` (casos: renderiza form +
   links; validação client bloqueia sem chamar API; sucesso posta payload e navega
   para `/app/home`; 401 genérico mostra alerta sem botão de reenvio; 403 mostra
   alerta dedicado + botão "Resend confirmation email"; reenvio com feedback
   "Check your inbox"; banner de reset via `location.state`).
2. Adicionar caso ao `apps/api/app/api/v1/auth/sign-in/route.spec.ts`:
   máquina B loga → sessão A fica `revoked_at` preenchido → `GET /me` com o cookie
   da máquina A responde 401.
3. QA: Vitest (api + app), ESLint `--max-warnings 0`, `tsc --noEmit` (api + app)
   com runtime do Bun (`bunx --bun` — Node do sistema é 18, projeto exige ≥ 24),
   Prettier.
4. Relatórios `005-progress.md` + `005-done.md`; ADR apenas se houver decisão nova.

## Critérios de aceite (spec)

- [x] Login correto → 200 + sessão + revoga anteriores + email nova sessão
      (mock verificado) — testes 1 e 2 do `route.spec.ts`.
- [x] Telefone incorreto → 401 genérico, sem sessão/revogação — teste 3.
- [x] Senha incorreta → erro genérico (não revela email) — teste 4.
- [x] Conta não confirmada → 403 `ACCOUNT_NOT_CONFIRMED`, sem sessão — teste 5.
- [x] `resend-confirmation` pendente reenvia + token novo (anula anterior);
      inexistente/confirmado/inválido → 200 genérico sem enviar — 5 testes da rota.
- [x] Máquina B loga → A com `revoked_at`; guard barra A — agora cobertos juntos
      (teste 6 adicionado) + `me/route.spec.ts` (401).
- [x] Apenas 1 sessão válida após login — testes 1 e 2 (query `sessions`).
- [x] UI: form valida; erro genérico; não-confirmado mostra reenvio com feedback —
      agora coberto por `SignInPage.spec.tsx`.
- [x] Vitest cobre sucesso/telefone errado/senha errada/não confirmado/reenvio/
      revogação — coberto.
- [x] `bun run lint` e `bun run check-types` passam em `@apps/api` e `@apps/app`
      (validar no QA).

## Q&As

Registradas na spec `005` (não re-perguntadas): confirmação de celular = campo
repetido; conta não confirmada bloqueada com reenvio; sessão antiga revogada
(última vence); email de nova sessão sem credenciais/token; mensagens de erro
genéricas anti-enumeração.
