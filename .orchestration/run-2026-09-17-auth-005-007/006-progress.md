# Progresso — TASK006 (spec `006-forgot-password`)

Run: `run-2026-09-17-auth-005-007` · Agente: implementador TASK006 · Spec: `.specs/006-forgot-password.md`

## 2026-09-17 22:41 WAT — Contexto

- Lidos `.docs/AGENTS.md`, `RULES.md`, `QA.md`, `DEVELOPMENT.md`, `ARCHITECTURE.md`,
  `.specs/INDEX.md` e a spec `006-forgot-password.md` por completo (Q&As registradas;
  sem re-perguntas).
- Carregadas skills `implement-me`, `feature-concept` (Q&As da spec já respondidas,
  sem re-entrevista) e `vitest` (cobertura de testes).
- Auditoria: rota `POST /api/v1/auth/forgot-password`, página
  `/auth/forgot-password` e `EmailService.sendPasswordResetEmail` **já existem** e
  já cobrem quase todos os critérios. Trabalho = validar, fechar lacunas reais,
  não reescrever (padrão do run `004`).
- Baseline Vitest da rota: `6 passed` (contra o Postgres local em `localhost:54322`).
- Ambiente: Node 18.19.1 (projeto exige ≥ 24) → testes/portões com runtime do Bun
  (`bunx --bun`), conforme limitação conhecida do run anterior.

## 2026-09-17 22:41 WAT — Plano

- Plano gravado em `./.plans/006-forgot-password-plan.md`.
- Já-coberto: validação de campos, anti-enumeração (200 `{ ok: true }` sempre),
  envio só com email+telefone corretos, revogação do token anterior, token hashado,
  link `{APP_URL}/auth/reset-password?token=...`, UI com validação client-side,
  loading, sucesso genérico e link para sign-in; rota pública em `App.tsx`.
- Lacunas reais:
  1. **Expiração de 30 min sem assert em teste** (critério de aceite nº 1).
  2. **UI sem teste de componente** (critério de aceite de UI).
- Sem alteração de UI de produção → skills `frontend-design`/`web-design-guidelines`
  não se aplicam (só entra arquivo `*.spec.tsx`); registrar no relatório.

## 2026-09-17 22:43 WAT — Implementação

- `apps/api/app/api/v1/auth/forgot-password/route.spec.ts`: `resetTokenHashes`
  passou a selecionar `expires_at` (tipo `StoredResetToken`); novo caso "gera token
  com expiração de 30 minutos" assertando `expires_at` na janela
  `[before+30min-1min, before+30min+1min]`. Nenhuma mudança de produção.
- `apps/app/src/pages/auth/ForgotPasswordPage.spec.tsx` (novo): 4 casos — render do
  form + link sign-in; submit vazio → erros por campo sem chamar API; submit válido
  → payload correto + sucesso genérico + link sign-in; falha 500 da API →
  `role="alert"`. Padrão de `SignUpPage.spec.tsx`/`ConfirmAccountPage.spec.tsx`.

## 2026-09-17 22:44 WAT — QA

- Vitest `apps/api` (rota forgot-password): 7/7 passando (contra Postgres local).
- Vitest `apps/api` (suíte completa): 65 passando + 1 skipped; única falha é a
  conhecida `tests/api.supertest.spec.ts` (dev server ativo na porta 3002 PID 64648
  — limitação de ambiente, não é código).
- Vitest `apps/app` (suíte completa): 23 passando em 6 arquivos (inclui os 4 novos).
- ESLint `--max-warnings 0` em `@apps/api` e `@apps/app`: ok (exit 0).
- `next typegen` + `tsc --noEmit` (`@apps/api`): ok; `tsc --noEmit` (`@apps/app`): ok.
- Prettier `--check` nos arquivos alterados/novos: ok.
- Portões rodados com runtime do Bun (`bunx --bun`) por causa do Node 18.19.1 do
  ambiente (projeto exige ≥ 24). `next-env.d.ts` regenerado por `next typegen` foi
  restaurado ao HEAD (artefato gerado, não é mudança da task).
- Observação: o worktree contém mudanças do TASK005 (`sign-in`) rodando em paralelo
  (`sign-in/route.spec.ts`, `SignInPage.spec.tsx`, `.plans/005-sign-in-plan.md`) —
  não tocadas por esta task.
- Relatório final em `006-done.md`.
