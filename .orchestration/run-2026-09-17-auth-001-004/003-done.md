# Done — TASK003 (spec `003-sign-up`)

Run: `run-2026-09-17-auth-001-004` · Data: 2026-09-17 · Agente: implementador TASK003

## Status

**CONCLUÍDO (validado e completo).** O sign-up já estava implementado em commits
anteriores (`feat(api, app): feito cadastro e reset de senha`, `feat(api): email
de confirmação OK`): rota `POST /api/v1/auth/sign-up` e página `/auth/sign-up`
foram auditadas contra a spec `003-sign-up` e atendem aos critérios de aceite
comportamentais. Esta iteração fechou as lacunas reais de cobertura (assertiva do
link de confirmação no spec da rota + teste de UI da página). Nenhum
comportamento funcional foi removido; não foram tocados arquivos de outras specs;
nenhum commit/push (árvore suja por instrução do run paralelo).

## O que foi validado (já-coberto, sem alteração)

- **Rota** `apps/api/app/api/v1/auth/sign-up/route.ts`: validação server en-us
  (`validation.ts`), senha bcrypt (`passwords.ts`), user pendente (`confirmed_at`
  NULL por default da migration), token de confirmação hashado sha-256 TTL 24h
  (`tokens.ts`), email via `EmailService` com link `{APP_URL}/auth/confirm-account?token=...`
  (`email.ts`), 201 com `user` público (sem `password_hash`), 400
  `PASSWORD_MISMATCH`/`VALIDATION_ERROR`, 409 `EMAIL_ALREADY_REGISTERED`
  (inclusive via violação de unicidade 23505).
- **Página** `apps/app/src/pages/auth/SignUpPage.tsx`: campos first/last name,
  email, phone, password, confirm password; validação client espelhando a server;
  loading no botão; sucesso "Check your email" com link para `/auth/sign-in`;
  erros por campo/global; a11y (labels, `aria-invalid`, `aria-describedby`,
  `role="alert"`, foco no primeiro erro).
- **Rotas públicas** `/auth/sign-up` (`App.tsx`, `RequirePublic`).
- **Email dev**: `ConsoleEmailProvider` loga token/link (fallback dev).
- **Q&As da spec respeitadas**: 409 no duplicado, conta pendente, token 24h,
  senha mínima 8, en-us.

## Arquivos modificados (paths)

**Alterados por esta task:**

- `apps/api/app/api/v1/auth/sign-up/route.spec.ts` — assertiva nova: link do
  email aponta para `/auth/confirm-account` (critério de aceite nº 5, parte
  sign-up; consumo do token é da `004`).

**Adicionados por esta task:**

- `apps/app/src/pages/auth/SignUpPage.spec.tsx` — 5 testes de UI: render do form,
  senha != confirmação pontua o campo de confirmação sem chamar a API, sucesso
  "Check your email" com payload correto, erro 409 global renderizado como alert,
  erro de campo vindo da API exibido junto ao campo.
- `.plans/003-sign-up-plan.md`
- `.orchestration/run-2026-09-17-auth-001-004/003-progress.md`
- `.orchestration/run-2026-09-17-auth-001-004/003-done.md`

**Formatados por `bun run format` (Prettier, aditivo):** `SignUpPage.spec.tsx`
(apenas o arquivo novo da task; nenhum arquivo fora do escopo foi alterado).

## Bibliotecas instaladas

Nenhuma. `bcrypt@^6` e `react-router-dom@^7` já constavam nos `package.json`.

## QA rodado

| Portão                                | Resultado                                                                                                        |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Vitest `apps/api`                     | ✅ 12 arquivos / 61 testes passando, 1 skipped (`api.supertest` — dev server na porta 3002, limitação conhecida) |
| Vitest `apps/app`                     | ✅ 3 arquivos / 10 testes (inclui os 5 novos da página)                                                          |
| ESLint `--max-warnings 0` (api + app) | ✅ sem erros                                                                                                     |
| `next typegen` + `tsc --noEmit` (api) | ✅ sem erros                                                                                                     |
| `tsc --noEmit` (app)                  | ✅ sem erros                                                                                                     |
| Prettier (`bun run format`)           | ✅ repo no padrão; `next-env.d.ts` (artefato gerado) restaurado ao HEAD                                          |

**Limitação de ambiente:** Node do sistema é 18.19.1 (projeto exige ≥ 24 / Next ≥
20.9). `bun run lint`/`check-types` via `turbo` falham por **versão de Node**, não
por código; portões executados com o runtime do Bun (`bunx --bun …`). O único
teste que falha na suíte é o `api.supertest.spec.ts`, que sobe `next dev` e
conflita com o dev server do Bun já ativo na porta 3002 — pré-existente e fora do
escopo desta task.

## ADR criado

Nenhum. Não houve decisão arquitetural nova: as decisões de sign-up já estão nas
Q&As da `003` (409 no duplicado, conta pendente, token 24h, mínimo 8, en-us) e
nos ADRs `0005-auth-base` (auth custom + bcrypt, `EmailService`, schema de
tokens/sessões).

## Decisões e racionais

- **Validar em vez de reescrever**: rota e página passaram em todos os cenários da
  spec; reescrever traria risco sem ganho. Mudanças foram aditivas (cobertura de
  teste).
- **Insistir no critério nº 5 no lado do sign-up**: a assertiva do pathname
  `/auth/confirm-account` garante o contrato do link; o consumo do token é
  responsabilidade da `004` (não implementado aqui, conforme instrução do run).
- **Teste novo da página**: os critérios nº 6/8 exigem comportamento de UI
  (mismatch no campo de confirmação, sucesso "check your email") que só estavam
  cobertos manualmente; o spec segue o padrão de `HomePage.spec.tsx`
  (`fireEvent`/`screen`/`vi.stubGlobal("fetch")`), sem tocar em código de outras
  specs.
- **Não commitar**: instrução explícita do run paralelo (árvore suja).

## Pendências

1. Consumo end-to-end do token do email (`sign-up` → `confirm-account`) será
   exercitado pelo TASK004; aqui só o contrato do link foi assegurado.
2. `api.supertest.spec.ts`/Playwright não são executáveis com o dev server ativo
   na porta 3002 (fora do escopo).
3. Ambiente precisa de Node ≥ 24 (ou fixar runtime Bun no turbo) para os portões
   via `bun run` passarem sem workaround.
4. `.specs/INDEX.md` e o frontmatter de `003-sign-up.md` ainda dizem `rascunho` →
   atualizar para `concluido` no fechamento da orquestração (arquivos
   compartilhados com outras tasks paralelas).
