# Done — TASK006 (spec `006-forgot-password`)

Run: `run-2026-09-17-auth-005-007` · Data: 2026-09-17 · Agente: implementador TASK006

## Status

**CONCLUÍDO (auditado, lacunas fechadas).** A rota
`POST /api/v1/auth/forgot-password` e a página `/auth/forgot-password` já existiam
(commits anteriores) e foram auditadas contra cada critério de aceite da spec `006`.
A funcionalidade já cumpria a spec (validação, anti-enumeração, envio condicional,
revogação de token anterior, TTL de 30 min, UI com estados). Esta iteração fechou
as **2 lacunas reais de teste**: (1) asserção explícita da expiração de 30 min;
(2) cobertura de teste de componente da página. Nenhum comportamento funcional foi
alterado; nenhuma biblioteca instalada; nenhum commit/push (árvore suja por
instrução do run).

## O que foi validado (já-coberto, sem alteração)

- **Rota** `apps/api/app/api/v1/auth/forgot-password/route.ts`:
  - `validateForgotPassword` → 400 `VALIDATION_ERROR` para email vazio/inválido e
    phone vazio;
  - `findUserByEmail` (email normalizado) e match exato `user.phone === phone`
    (phone já trimado na validação);
  - só com email+telefone corretos: `revokePasswordResetTokensForUser` →
    `createPasswordResetToken` (hash sha-256, `PASSWORD_RESET_TTL_MS` = 30 min) →
    link `{APP_URL}/auth/reset-password?token=...` →
    `EmailService.sendPasswordResetEmail`;
  - email inexistente/telefone divergente → nenhuma escrita e nenhum email;
  - resposta **sempre** `200 { ok: true }` (inclusive no caminho de envio e em
    falhas de infra, que são logadas e não vazam) — anti-enumeração total.
- **Testes da rota já existentes**: sucesso (token hashado + link), revogação do
  token anterior, telefone incorreto, email inexistente, respostas indistinguíveis
  e `VALIDATION_ERROR`.
- **Página** `apps/app/src/pages/auth/ForgotPasswordPage.tsx`: form email+phone
  obrigatórios com validação client-side, loading (`aria-busy`), estado de sucesso
  genérico ("If an account exists with this email, we sent a password reset link.")
  - link para `/auth/sign-in`, alerta de erro e erros por campo (`FormField`).
- **Roteamento**: `/auth/forgot-password` em `<RequirePublic />` (`App.tsx`);
  cliente `forgotPassword()` em `apps/app/src/lib/api.ts`.

## Lacunas corrigidas nesta iteração

1. **Expiração de 30 min sem assert de teste** (critério de aceite nº 1: "gera token
   (hashado, **30 min**)"). → `resetTokenHashes` agora seleciona `expires_at`; novo
   caso "gera token com expiração de 30 minutos" asserta a janela de 30 min com
   tolerância de 1 min.
2. **UI sem teste de componente** (critério "UI: form valida obrigatórios; mostra
   mensagem de sucesso genérica; link para sign-in presente"). → Criado
   `apps/app/src/pages/auth/ForgotPasswordPage.spec.tsx` (4 casos), no padrão de
   `SignUpPage.spec.tsx`/`ConfirmAccountPage.spec.tsx`.

## Arquivos modificados (paths)

**Alterados por esta task:**

- `apps/api/app/api/v1/auth/forgot-password/route.spec.ts` — tipo `StoredResetToken`
  com `expires_at` + caso de expiração de 30 min.

**Adicionados por esta task:**

- `apps/app/src/pages/auth/ForgotPasswordPage.spec.tsx` — 4 testes de UI.
- `.plans/006-forgot-password-plan.md`
- `.orchestration/run-2026-09-17-auth-005-007/006-progress.md`
- `.orchestration/run-2026-09-17-auth-005-007/006-done.md`

**Não tocados (de outra task paralela TASK005 no mesmo worktree):**
`apps/api/app/api/v1/auth/sign-in/route.spec.ts`,
`apps/app/src/pages/auth/SignInPage.spec.tsx`, `.plans/005-sign-in-plan.md`.

**Artefato gerado restaurado:** `apps/api/next-env.d.ts` (alterado pelo
`next typegen`, restaurado ao HEAD).

## Bibliotecas instaladas

Nenhuma.

## QA rodado

| Portão              | Comando                                                                            | Resultado                                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Vitest rota         | `bunx --bun vitest run app/api/v1/auth/forgot-password/route.spec.ts` (`apps/api`) | ✅ 7/7 passando                                                                                            |
| Vitest api completo | `bunx --bun vitest run` (`apps/api`)                                               | ✅ 65 passando, 1 skipped; 1 falha conhecida fora do escopo (`api.supertest.spec.ts` — dev server na 3002) |
| Vitest app completo | `bunx --bun vitest run` (`apps/app`)                                               | ✅ 6 arquivos / 23 testes (inclui 4 novos)                                                                 |
| ESLint              | `bunx --bun eslint --max-warnings 0 .` (`apps/api` e `apps/app`)                   | ✅ exit 0                                                                                                  |
| Tipagem api         | `bunx --bun next typegen && bunx --bun tsc --noEmit`                               | ✅ exit 0                                                                                                  |
| Tipagem app         | `bunx --bun tsc --noEmit`                                                          | ✅ exit 0                                                                                                  |
| Formatação          | `bunx --bun prettier --check <arquivos>`                                           | ✅ padrão ok                                                                                               |

**Limitação de ambiente (herdada):** Node do sistema é 18.19.1 (projeto exige ≥ 24),
então `bun run lint`/`check-types` via `turbo` falham por versão de Node; portões
executados com o runtime do Bun (`bunx --bun`). A única falha da suíte é o conhecido
`tests/api.supertest.spec.ts` (conflita com o dev server ativo na porta 3002 — PID
64648), não relacionado ao código desta task.

## ADR criado

**Nenhum.** Não houve decisão arquitetural nova: o fluxo, o anti-enumeração, a
política de revogação do token anterior e o TTL de 30 min já estão decididos no ADR
`0005-auth-base` e nas Q&As da própria spec `006`. Esta iteração só adicionou
cobertura de teste, sem alterar contrato ou arquitetura (registro da ausência com
racional, conforme solicitado).

## Decisões e racionais

- **Validar, não reescrever**: rota e página já passavam nos cenários centrais;
  seguiu-se o padrão do run `004-confirm-account`.
- **Asserção independente do TTL**: o teste usa a janela literal de `30 * 60 * 1000`
  (não o próprio `PASSWORD_RESET_TTL_MS`) com tolerância de 1 min para evitar
  flakiness de relógio, provando o requisito de negócio de forma independente.
- **Sem alteração de UI de produção**: apenas um arquivo `*.spec.tsx` foi criado;
  por isso `frontend-design`/`web-design-guidelines` não foram aplicadas (não houve
  tocar em UI).
- **Não commitar**: instrução explícita do run paralelo (árvore suja controlada pelo
  orquestrador).

## Pendências

1. `tests/api.supertest.spec.ts` continua não-executável com o dev server ativo na
   porta 3002 (limitação de ambiente, fora do escopo).
2. Ambiente precisa de Node ≥ 24 (ou runtime Bun fixo no turbo) para os portões via
   `bun run` passarem sem workaround.
3. `.specs/INDEX.md` e o frontmatter de `006-forgot-password.md` ainda dizem
   `rascunho` → atualizar para `concluido` no fechamento da orquestração (arquivos
   compartilhados com as outras tasks paralelas).
4. E2E real de navegador (form → email do console → link → `/auth/reset-password`)
   fica para a validação completa da orquestração (Playwright/mão); aqui a cadeia foi
   coberta por Vitest (rota + UI).
