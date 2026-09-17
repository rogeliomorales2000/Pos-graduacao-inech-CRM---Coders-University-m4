# Done — TASK001 (spec `001-auth-base`)

Run: `run-2026-09-17-auth-001-004` · Data: 2026-09-17 · Agente: implementador TASK001

## Status

**CONCLUÍDO (validado e completo).** A fundação de auth já estava implementada em
commits anteriores; esta iteração auditou-a contra a spec, fechou o único
critério de aceite pendente (teste unitário do `EmailService`), corrigiu a
formatação e rodou os portões de QA. Nenhum comportamento funcional foi removido;
nenhum commit/push foi feito (árvore suja por instrução do run paralelo).

## Arquivos modificados

**Adicionados (desta task):**

- `apps/api/lib/auth/email.spec.ts` — 12 testes: seleção de provider por
  `EMAIL_PROVIDER` (resend/mailtrap/console), fallback console (não-prod) e
  resend (prod), log do `ConsoleEmailProvider`, conteúdo dos 4 emails com
  provider mockado, `parseEmailSender`.
- `.plans/001-auth-base-plan.md`
- `.orchestration/run-2026-09-17-auth-001-004/001-progress.md`
- `.orchestration/run-2026-09-17-auth-001-004/001-done.md`

**Formatados por `bun run format` (estilo Prettier, sem mudança de comportamento):**

- `apps/api/lib/auth/api-error.ts`, `email.ts`, `validation.ts`, `sessions.spec.ts`
- `apps/api/app/api/v1/auth/confirm-account/route.spec.ts`
- `apps/api/app/api/v1/auth/forgot-password/route.spec.ts`
- `apps/api/app/api/v1/auth/resend-confirmation/route.spec.ts`
- `apps/api/app/api/v1/auth/reset-password/route.spec.ts`
- `apps/api/app/api/v1/auth/sign-in/route.spec.ts`
- `apps/app/src/components/FormAlert.tsx`
- `apps/app/src/pages/auth/ConfirmAccountPage.tsx`
- `.docs/ARCHITECTURE.md`, `.plans/auth-module-plan.md`

**Pré-existentes (não alterados por esta task):** `.env.example`, `.specs/INDEX.md`,
`adrs/0004-signout-prerequisites.md`, `adrs/0005-auth-base.md` e os renames
`*.specs/<spec>.md -> .specs/00N-<spec>.md` já estavam no working tree.

`apps/api/next-env.d.ts` foi regenerado por `next typegen` durante a validação e
**restaurado ao HEAD** (artefato gerado, sem mudança líquida).

## Bibliotecas instaladas

Nenhuma. `bcrypt@^6` (+ `@types/bcrypt`) e `react-router-dom@^7` já constavam nos
`package.json` de `@apps/api`/`@apps/app`, conforme a spec.

## QA rodado

| Portão                                     | Resultado                                                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `bun run db:migrate`                       | ✅ "Remote database is up to date" (3 migrations aplicadas)                                                         |
| SQL direto (`information_schema`)          | ✅ `users`, `sessions`, `email_confirmation_tokens`, `password_reset_tokens` com colunas, PK, UNIQUE, FKs e índices |
| `bun run format` / `prettier --check`      | ✅ repo 100% no padrão                                                                                              |
| `bun run lint` (ESLint `--max-warnings 0`) | ✅ api, app e `@repo/ui` sem erros                                                                                  |
| `bun run check-types` (TS 7)               | ✅ api (`next typegen` + `tsc`) e app sem erros                                                                     |
| `bun run test` (Vitest)                    | ✅ api 11 arquivos / 61 testes; app 2 arquivos / 5 testes                                                           |
| `bun run test:e2e` (Playwright)            | ⏭️ não executado (fora do escopo desta task)                                                                        |

**Limitação de ambiente:** o Node do sistema é 18.19.1 (projeto exige ≥ 24 / Next
≥ 20.9). O `turbo` invoca `node`, então `bun run lint`/`check-types` falham por
**versão de Node**, não por código. Os portões foram executados com o runtime do
Bun (`bunx --bun …`), que roda ESLint/Next/tsc sem erros. Registrado como falha
fora do escopo.

## ADR criado

Nenhum novo. As decisões arquiteturais da `auth-base` já estão registradas em
`adrs/0005-auth-base.md` (auth custom + bcrypt, schema de auth no Postgres local,
`EmailService` Mailtrap/Resend/console, contratos de sessão/token/erro,
roteamento `/auth/*` e `/app/*`) e `adrs/0004-signout-prerequisites.md`
(pré-requisitos de sessão/cookie/router). Não houve decisão arquitetural nova.

## Decisões e racionais

- **Validar em vez de reescrever**: o código existente passou nos testes e nas
  querys de schema; reescrever traria risco sem ganho. Toda mudança foi aditiva
  (teste) ou mecânica (formatação).
- **Adicionar `email.spec.ts`**: era o único critério de aceite da spec sem
  cobertura (`EMAIL_PROVIDER` + provider mockado). O teste é isolado (não toca
  DB/rede) e usa `setEmailService`/provider fake, alinhado ao padrão da suíte.
- **Não editar `INDEX.md` nem o frontmatter da spec**: são arquivos compartilhados
  com outras tasks paralelas; recomendei a atualização `rascunho → concluido` ao
  orquestrador para evitar conflito de escrita concorrente.
- **Não commitar**: instrução explícita do run paralelo (deixar a árvore suja).

## Pendências

1. `.specs/INDEX.md` (linha 1) e o frontmatter de `.specs/001-auth-base.md` ainda
   dizem `rascunho` → atualizar para `concluido` no fechamento da orquestração.
2. `api.supertest.spec.ts` e Playwright (`test:e2e`) não executados aqui; requerem
   `apps/api` parado / `bunx playwright install chromium`.
3. Ambiente precisa de Node ≥ 24 (ou fixar runtime Bun no turbo) para que
   `bun run lint` / `bun run check-types` passem sem workaround.
