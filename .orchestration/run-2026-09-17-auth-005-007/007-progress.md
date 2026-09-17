# Progresso — TASK007 (spec `007-reset-password`)

Run: `run-2026-09-17-auth-005-007` · Agente: implementador TASK007 · Spec: `.specs/007-reset-password.md`

## 2026-09-17 22:50 WAT — Contexto

- Lidos `.docs/AGENTS.md`, `RULES.md`, `QA.md`, `DEVELOPMENT.md`, `ARCHITECTURE.md`,
  `.specs/INDEX.md` e a spec `007-reset-password.md` por completo (Q&As registradas;
  sem re-perguntas).
- Carregadas skills `implement-me`, `feature-concept` (entrevista dispensada: Q&As
  da spec + runs anteriores já responded), `frontend-design` +
  `web-design-guidelines` (obrigatórias para UI; **sem alteração de UI de produção**
  — só entra arquivo `*.spec.tsx`, registro no relatório) e `vitest`.
- Auditoria: rota `POST /api/v1/auth/reset-password`, página `/auth/reset-password`
  e `EmailService.sendPasswordResetSuccess` **já existem** e já cobrem quase todos
  os critérios da spec 007 (validação, `INVALID_TOKEN`/`TOKEN_EXPIRED`/
  `TOKEN_ALREADY_USED`, `PASSWORD_MISMATCH`, bcrypt, consumo só no sucesso,
  revogação de TODAS as sessões, email, `redirectTo`, estados de UI). Trabalho =
  validar, fechar lacunas reais, não reescrever.
- Lacunas reais identificadas:
  1. Critério 6: "senha antiga não funciona e a nova funciona no **sign-in**" só é
     provado no nível do hash (`verifyPassword`); falta teste de **integração
     sign-in após reset**.
  2. Critério 8: `ResetPasswordPage` sem **teste de componente** (padrão das outras
     páginas de auth).
- Ambiente: Node 18.19.1 (projeto exige ≥ 24) → portões com runtime do Bun
  (`bunx --bun`); Postgres local OK em `localhost:54322` (checado via cliente
  `postgres`); dev server ativo na porta 3002 (PID 64648) — limitação conhecida do
  `api.supertest.spec.ts`.
- Baseline Vitest da rota reset-password: 7 testes (será re-rodado após a mudança).

## 2026-09-17 22:51 WAT — Plano

- Plano gravado em `./.plans/007-reset-password-plan.md`.
- Já-coberto: validação + códigos de erro, consumo do token só no sucesso,
  revogação de todas as sessões, email de sucesso, resposta `redirectTo`,
  UI com estados de token inválido/expirado/ausente e navegação para sign-in,
  rota pública em `App.tsx`.
- Lacunas reais: (1) teste de integração sign-in após reset; (2) teste de
  componente `ResetPasswordPage.spec.tsx`.

## 2026-09-17 22:52 WAT — Implementação

- `apps/api/app/api/v1/auth/reset-password/route.spec.ts`: import de
  `POST as signInPOST` de `../sign-in/route` + helper `signInRequest`; novo caso
  "após reset, a senha antiga não loga e a nova loga no sign-in" — chama o
  endpoint real `sign-in` com a senha antiga (401 `INVALID_CREDENTIALS`) e com a
  nova (200, `redirectTo: /app/home`, cookie `session` setado). Fecha o critério
  de aceite nº 6 (integração de sign-in pós-reset).
- `apps/app/src/pages/auth/ResetPasswordPage.spec.tsx` (novo): 7 casos — render do
  form com token; sem token → invalid link + link forgot-password sem chamar API;
  submit vazio → erro por campo sem chamar API; senhas divergentes → erro no
  campo de confirmação sem chamar API; sucesso → payload correto + navega para
  sign-in (stub lê `state.passwordReset`); token inválido/expirado da API → heading
  de erro + link forgot-password; falha 500 da API → `role="alert"`. Padrão de
  `ForgotPasswordPage.spec.tsx`/`ConfirmAccountPage.spec.tsx`.
- Nenhum arquivo de produção tocado (rota e página já cumprem a spec 007).

## 2026-09-17 22:53 WAT — QA

- Vitest `apps/api` (rota reset-password): **8/8** passando (7 existentes + 1 novo
  de integração sign-in; contra o Postgres local `localhost:54322`).
- Vitest `apps/app` (ResetPasswordPage.spec.tsx): **7/7** passando.
- Vitest `apps/api` (suíte completa): **66 passando + 1 skipped**; única falha é a
  conhecida `tests/api.supertest.spec.ts` (dev server ativo na porta 3002 PID
  64648 — limitação de ambiente, não é código).
- Vitest `apps/app` (suíte completa): **30 passando em 7 arquivos** (23 + 7 novos).
- ESLint `--max-warnings 0`: exit 0 em `@apps/api` e `@apps/app`; o novo
  `*.spec.tsx` é ignorado pela config de ESLint como todos os `*.spec.*` do repo
  (comportamento de precedência — verificado no `SignInPage.spec.tsx`/`SignUpPage.spec.tsx`).
- `next typegen` + `tsc --noEmit` (`@apps/api`): ok; `tsc --noEmit` (`@apps/app`):
  ok. `next-env.d.ts` regenerado restaurado ao HEAD.
- Prettier: `--check` ok após `--write` no novo spec de UI (api e app).
- Portões com runtime do Bun (`bunx --bun`) por causa do Node 18.19.1 do ambiente
  (projeto exige ≥ 24). Worktree contém mudanças de TASK005/TASK006 em paralelo
  (`sign-in/route.spec.ts`, `SignInPage.spec.tsx`, `forgot-password/route.spec.ts`,
  `ForgotPasswordPage.spec.tsx`, `.plans/00{5,6}-*-plan.md`) — **não tocadas**.
- Relatório final em `007-done.md`.