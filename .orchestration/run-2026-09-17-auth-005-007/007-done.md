# Done — TASK007 (spec `007-reset-password`)

Run: `run-2026-09-17-auth-005-007` · Data: 2026-09-17 · Agente: implementador TASK007

## Status

**CONCLUÍDO (auditado, lacunas fechadas).** A rota `POST /api/v1/auth/reset-password`,
a página `/auth/reset-password` e o `EmailService.sendPasswordResetSuccess` **já
existiam** (commits anteriores) e foram auditadas contra cada critério de aceite da
spec `007`. A funcionalidade já cumpria a spec: validação de token
(`INVALID_TOKEN`/`TOKEN_EXPIRED`/`TOKEN_ALREADY_USED`), `PASSWORD_MISMATCH` sem
consumir token, mínimo de 8 chars, bcrypt, consumo do token só no sucesso,
revogação de **todas** as sessões, email de sucesso, resposta `redirectTo` e todos
os estados de UI. Esta iteração fechou as **2 lacunas reais de teste**:
(1) teste de **integração sign-in após reset** (critério nº 6); (2) **teste de
componente** da página `ResetPasswordPage` (critério de UI). Nenhum comportamento
funcional foi alterado; nenhuma biblioteca instalada; nenhum commit/push (árvore
suja por instrução do run).

## O que foi validado (já-coberto, sem alteração)

- **Rota** `apps/api/app/api/v1/auth/reset-password/route.ts`:
  - `validateResetPassword` → 400 `VALIDATION_ERROR` (`fields`) para token
    obrigatório e senha < 8; 400 **`PASSWORD_MISMATCH`** quando `confirm_password`
    diverge (sem consumir o token);
  - token inexistente → `INVALID_TOKEN`; consumido → `TOKEN_ALREADY_USED`;
    expirado (`expires_at <= now()`) → `TOKEN_EXPIRED`; user inexistente →
    `INVALID_TOKEN`; nenhum caminho de erro altera `password_hash` nem consome token;
  - sucesso: `hashPassword` (bcrypt) → `updateUserPassword` →
    `consumePasswordResetToken` (**só no sucesso**) → `revokeAllSessionsForUser`
    → `sendPasswordResetSuccess`; 200 `{ redirectTo: "/auth/sign-in" }`; `catch` →
    500 `INTERNAL_ERROR`.
- **Testes da rota já existentes**: sucesso, revogação de todas as sessões,
  mismatch sem efeito, expirado, consumido, inexistente e < 8 chars.
- **Página** `apps/app/src/pages/auth/ResetPasswordPage.tsx`: token da query;
  campos `new_password` + `confirm_password` com validação client (min 8 + match) e
  `focusFirstError`; loading (`aria-busy`); sucesso → navigate `/auth/sign-in`
  com `state: { passwordReset: true }` (SignInPage exibe "Password updated.");
  token ausente → "invalid link"; erros da API
  (`INVALID_TOKEN`/`TOKEN_EXPIRED`/`TOKEN_ALREADY_USED`) → heading de erro + link
  "Request a new reset link" (`/auth/forgot-password`); erros de infra → alerta.
- **Roteamento**: `/auth/reset-password` em `<RequirePublic />` (`App.tsx`);
  cliente `resetPassword()` em `apps/app/src/lib/api.ts`.
- **Email**: template en-us sem token/senha, enviado após o commit da mudança.

## Lacunas corrigidas nesta iteração

1. **Critério nº 6** ("Senha antiga não funciona mais e a nova funciona no
   **sign-in**") só era provado no nível do hash (`verifyPassword`), não através do
   endpoint real. → Adicionado caso no `reset-password/route.spec.ts` que, após o
   reset, chama `POST /auth/sign-in` com a **senha antiga** (401
   `INVALID_CREDENTIALS`) e com a **nova** (200, `redirectTo: /app/home`, cookie
   `session` setado).
2. **Critério de UI sem teste de componente** (valida match; sucesso navega para
   sign-in; token inválido/expirado/ausente mostra erro + link para forgot-password).
   → Criado `apps/app/src/pages/auth/ResetPasswordPage.spec.tsx` com **7 casos**,
   no padrão de `ForgotPasswordPage.spec.tsx`/`ConfirmAccountPage.spec.tsx`.

## Arquivos modificados (paths)

**Alterados por esta task:**

- `apps/api/app/api/v1/auth/reset-password/route.spec.ts` — import do `POST` de
  `../sign-in/route` + helper `signInRequest` + caso de integração sign-in pós-reset
  (8º teste da rota).

**Adicionados por esta task:**

- `apps/app/src/pages/auth/ResetPasswordPage.spec.tsx` — 7 testes de UI.
- `.plans/007-reset-password-plan.md`
- `.orchestration/run-2026-09-17-auth-005-007/007-progress.md`
- `.orchestration/run-2026-09-17-auth-005-007/007-done.md`

**Não tocados (de tarefas paralelas TASK005/TASK006 no mesmo worktree):**
`apps/api/app/api/v1/auth/sign-in/route.spec.ts`,
`apps/app/src/pages/auth/SignInPage.spec.tsx`,
`apps/api/app/api/v1/auth/forgot-password/route.spec.ts`,
`apps/app/src/pages/auth/ForgotPasswordPage.spec.tsx`, `.plans/005-sign-in-plan.md`,
`.plans/006-forgot-password-plan.md`.

**Artefato gerado restaurado:** `apps/api/next-env.d.ts` (alterado pelo
`next typegen`, restaurado ao HEAD).

## Bibliotecas instaladas

Nenhuma.

## QA rodado

| Portão                | Comando                                                                          | Resultado                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Vitest rota           | `bunx --bun vitest run app/api/v1/auth/reset-password/route.spec.ts` (`apps/api`) | ✅ 8/8 passando                                                                                            |
| Vitest api completo   | `bunx --bun vitest run` (`apps/api`)                                             | ✅ 66 passando, 1 skipped; 1 falha conhecida fora do escopo (`api.supertest.spec.ts` — dev server na 3002) |
| Vitest app novo       | `bunx --bun vitest run src/pages/auth/ResetPasswordPage.spec.tsx` (`apps/app`)    | ✅ 7/7 passando                                                                                            |
| Vitest app completo   | `bunx --bun vitest run` (`apps/app`)                                             | ✅ 7 arquivos / 30 testes (inclui os 7 novos)                                                              |
| ESLint                | `bunx --bun eslint --max-warnings 0 .` (`apps/api` e `apps/app`)                  | ✅ exit 0 (o arquivo `*.spec.tsx` é ignorado pela config, como TODOS os `*.spec.*` do repo)                |
| Tipagem api           | `bunx --bun next typegen && bunx --bun tsc --noEmit`                              | ✅ exit 0                                                                                                  |
| Tipagem app           | `bunx --bun tsc --noEmit`                                                         | ✅ exit 0                                                                                                  |
| Formatação            | `bunx --bun prettier --check <arquivos>` (após `--write` no spec novo)            | ✅ padrão ok                                                                                               |

**Limitação de ambiente (herdada):** Node do sistema é 18.19.1 (projeto exige ≥ 24),
então `bun run lint`/`check-types` via `turbo` falham por versão de Node; portões
executados com o runtime do Bun (`bunx --bun`). A única falha da suíte é o conhecido
`tests/api.supertest.spec.ts` (conflita com o dev server ativo na porta 3002 — PID
64648), não relacionado ao código desta task.

## ADR criado

**Nenhum.** Não houve decisão arquitetural nova: o fluxo de reset (validação de
token, `PASSWORD_MISMATCH`, consumo só no sucesso, revogação de todas as sessões,
email de sucesso, `redirectTo`) já está decidido no ADR `0005-auth-base` e nas
Q&As da própria spec `007`. Esta iteração só adicionou cobertura de teste (integração
sign-in + teste de componente), sem alterar contrato, schema ou arquitetura
(registro da ausência com racional, conforme solicitado).

## Decisões e racionais

- **Validar, não reescrever**: rota e página já passavam nos cenários centrais da
  spec; seguiu-se o padrão dos runs `004-confirm-account`/`005`/`006`.
- **Integração sign-in real no teste**: em vez de só validar hashes bcrypt, o novo
  caso exercita o endpoint `sign-in` real (401 na senha antiga / 200 na nova),
  provando ponta a ponta o critério nº 6 com custo quase zero.
- **Teste de UI fiel ao fluxo**: o stub de `/auth/sign-in` lê `location.state` para
  afirmar a navegação com `{ passwordReset: true }` — cobre a promessa da página
  (mensagem "Password updated" na tela de login).
- **Match é barrado no client**: o `PASSWORD_MISMATCH` do servidor é inalcançável
  pela UI normal (a validação client bloqueia antes do submit); por isso o caso de
  falha de API do spec usa `500 INTERNAL_ERROR` (alerta de formulário), em vez de
  forçar um caminho de servidor defensivo.
- **Sem alteração de UI de produção**: apenas arquivos `*.spec.{ts,tsx}`;
  `frontend-design`/`web-design-guidelines` foram carregadas (obrigatório p/ UI)
  mas não se aplicam a código nesta iteração — a página já cumpre UX/no-fluxo e
  copy en-us da spec.
- **Não commitar**: instrução explícita do run paralelo (árvore suja controlada pelo
  orquestrador).

## Pendências

1. `tests/api.supertest.spec.ts` continua não-executável com o dev server ativo na
   porta 3002 (limitação de ambiente, fora do escopo).
2. Ambiente precisa de Node ≥ 24 (ou runtime Bun fixo no turbo) para os portões via
   `bun run` passarem sem workaround.
3. `.specs/INDEX.md` e o frontmatter de `007-reset-password.md` ainda dizem
   `rascunho` → atualizar para `concluido` no fechamento da orquestração (arquivos
   compartilhados com as outras tasks paralelas).
4. E2E real de navegador (flow forgot → email do console → link →
   `/auth/reset-password` → sign-in com a senha nova) fica para a validação
   completa da orquestração (Playwright/mão); aqui a cadeia foi coberta por Vitest
   (rota + integração sign-in + UI).