# Done — TASK004 (spec `004-confirm-account`)

Run: `run-2026-09-17-auth-001-004` · Data: 2026-09-17 · Agente: implementador TASK004

## Status

**CONCLUÍDO (validado e completo).** A rota `POST /api/v1/auth/confirm-account` e
a página `/auth/confirm-account` já existiam (commits anteriores) e foram auditadas
contra a spec `004`. Atendem a quase todos os critérios de aceite; esta iteração
fechou as 2 lacunas reais: (1) a confirmação agora aplica a política de **sessão
única** ("última vence") no mesmo padrão do `sign-in`; (2) os estados de UI da
página agora têm cobertura de teste de componente. Nenhum comportamento funcional
existente foi removido; nenhum commit/push (árvore suja por instrução do run).

## O que foi validado (já-coberto, sem alteração)

- **Rota** `apps/api/app/api/v1/auth/confirm-account/route.ts`:
  `validateToken` → 400 `VALIDATION_ERROR`; `getEmailConfirmationTokenByToken`
  (token hashado sha-256) → 400 `INVALID_TOKEN`; `consumed_at` → 400
  `TOKEN_ALREADY_USED`; `expires_at` vencido → 400 `TOKEN_EXPIRED` (sem confirmar
  conta nem criar sessão); user inexistente → `INVALID_TOKEN`; conta já confirmada
  → 400 `ACCOUNT_ALREADY_CONFIRMED` (safe default da spec: erro controlado, sem
  nova sessão); sucesso: consome token → confirma conta (`confirmUser`, idempotente)
  → cria sessão → cookie httpOnly `session` → 200 `{ user, redirectTo: "/app/home" }`.
- **Testes da rota já existentes** cobrem válido/consumido/expirado/inválido/
  já-confirmado/sem-token (critérios de aceite nº 1, 3, 4, 5, 6, 9 da spec).
- **Página** `apps/app/src/pages/auth/ConfirmAccountPage.tsx`: confirmação no load
  (sem botão), loading `role="status"`/`aria-live`, sucesso navega para `redirectTo`,
  falha `FormAlert role="alert"` + link para `/auth/sign-in`, sem token → "invalid link".
- **Rota pública**: `/auth/confirm-account` dentro de `<RequirePublic />` (`App.tsx`).
- **Email**: link `{APP_URL}/auth/confirm-account?token=...` já auditado na `003`.

## Lacunas corrigidas nesta iteração

1. **Política de sessão única** — a spec determina que a sessão criada na
   confirmação segue a política da plataforma (sessão anterior do mesmo user é
   revogada; a nova é a válida), via helpers da `auth-base`. O `sign-in` já fazia
   `revokeAllSessionsForUser` antes de `createSession`; o `confirm-account` não.
   → Adicionado `revokeAllSessionsForUser(user.id)` na rota + teste cobrindo que a
   sessão prévia do user é revogada e permanece exatamente 1 sessão válida.
2. **Cobertura de UI** — critérios de aceite de UI (sem token → "invalid link";
   token válido → redireciona para `/app/home`; falha → mensagem + link para
   `/auth/sign-in`) não tinham teste. → Criado
   `apps/app/src/pages/auth/ConfirmAccountPage.spec.tsx` (3 casos).

## Arquivos modificados (paths)

**Alterados por esta task:**
- `apps/api/app/api/v1/auth/confirm-account/route.ts` — `revokeAllSessionsForUser`
  antes de `createSession` (política de sessão única).
- `apps/api/app/api/v1/auth/confirm-account/route.spec.ts` — caso novo "confirmação
  segue a política de sessão única"; organizado import de `sessions`.

**Adicionados por esta task:**
- `apps/app/src/pages/auth/ConfirmAccountPage.spec.tsx` — 3 testes de UI (sem token,
  sucesso redireciona, falha mostra erro + link).
- `.plans/004-confirm-account-plan.md`
- `.orchestration/run-2026-09-17-auth-001-004/004-progress.md`
- `.orchestration/run-2026-09-17-auth-001-004/004-done.md`

**Formatados por `bun run format` (Prettier, aditivo):** apenas os 2 arquivos md
novos acima; `next-env.d.ts` (artefato gerado pelo `next typegen`) restaurado ao HEAD.

## Bibliotecas instaladas

Nenhuma.

## QA rodado

| Portão | Resultado |
| --- | --- |
| Vitest `apps/api` | ✅ 11/12 arquivos, **63 testes passando**, 1 skipped |
| Vitest `apps/app` | ✅ 4 arquivos / 13 testes (inclui os 3 novos da página) |
| ESLint `--max-warnings 0` (api + app) | ✅ sem erros |
| `next typegen` + `tsc --noEmit` (api) | ✅ sem erros |
| `tsc --noEmit` (app) | ✅ sem erros |
| Prettier (`bun run format`) | ✅ repo no padrão; artefato regenerado restaurado |

**Limitação de ambiente (herdada):** Node do sistema é 18.19.1 (projeto exige ≥ 24 /
Next ≥ 20.9), então `bun run lint`/`check-types` via `turbo` falham por **versão de
Node**; portões executados com o runtime do Bun (`bunx --bun`). A única falha da
suíte é o já conhecido `tests/api.supertest.spec.ts`: o `next dev` que ele sobe
conflita com o dev server do Bun já ativo na porta 3002 (PID 64648) — limitação de
ambiente, não é código. **Nota:** a rota compilou/rodou e seus 7 testes (incluindo o
novo) passaram direto contra o Postgres local.

## ADR criado

Nenhum. Não houve decisão arquitetural nova: a política de sessão única já está
estabelecida nos ADRs `0004`/`0005-auth-base` e na regra de negócio da própria spec
(Q&A "Sessão da confirmação respeita sessão única? R: sim"); o `revoke` antes de
`createSession` apenas alinha o `confirm-account` ao padrão já aplicado no `sign-in`.

## Decisões e racionais

- **Validar, não reescrever**: rota e página passavam nos cenários centrais; as
  mudanças foram aditivas e seguem os padrões da casa (`sign-in`, specs de página).
- **Sessão única na confirmação**: cumpre regra explícita da spec e mantém o
  invariante "uma sessão válida por pessoa" mesmo em fluxos com sessão residual.
- **Safe default de conta já confirmada mantido**: erro controlado
  `ACCOUNT_ALREADY_CONFIRMED`, sem nova sessão e sem reabrir conta pendente —
  exatamente o acordado nas Q&As.
- **Não commitar**: instrução explícita do run paralelo (árvore suja).

## Pendências

1. `tests/api.supertest.spec.ts` continua não-executável com o dev server ativo na
   porta 3002 (fora do escopo).
2. Ambiente precisa de Node ≥ 24 (ou runtime Bun fixo no turbo) para os portões via
   `bun run` passarem sem workaround.
3. `.specs/INDEX.md` e o frontmatter de `004-confirm-account.md` ainda dizem
   `rascunho` → atualizar para `concluido` no fechamento da orquestração
   (arquivos compartilhados com as outras tasks paralelas).
4. E2E real navegador (link do email → confirmação → `/app/home`) fica para a etapa
   de validação completa da orquestração (Playwright/mão); aqui a cadeia foi coberta
   por Vitest (rota + UI).