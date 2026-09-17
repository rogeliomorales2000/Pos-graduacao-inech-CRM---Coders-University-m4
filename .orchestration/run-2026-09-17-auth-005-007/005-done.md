# Done — TASK005 (spec `005-sign-in`)

Run: `run-2026-09-17-auth-005-007` · Data: 2026-09-17 · Agente: implementador TASK005

## Status

**CONCLUÍDO (validado e completo).** A rota `POST /api/v1/auth/sign-in`, a rota
`POST /api/v1/auth/resend-confirmation` e a página `/auth/sign-in` já existiam
(commits anteriores) e foram auditadas contra a spec `005`. Cumprem todos os
critérios de aceite funcionais; esta iteração fechou as 2 lacunas reais: (1)
cobertura de teste de UI da `SignInPage` (form valida, erro genérico, conta não
confirmada mostra botão de reenvio com feedback); (2) o cenário integrado
"máquina B loga → sessão da máquina A revogada → guard de `/me` barra A" agora é
coberto em um único teste no próprio spec do sign-in. Nenhum comportamento
funcional existente foi alterado; nenhum commit/push (árvore suja por instrução
do run).

## O que foi validado (já-coberto, sem alteração)

- **Rota** `apps/api/app/api/v1/auth/sign-in/route.ts`: `validateSignIn` → 400
  `VALIDATION_ERROR`; email inexistente → 401 genérico (anti-enumeração); conta
  não confirmada → 403 `ACCOUNT_NOT_CONFIRMED` sem sessão/email; bcrypt errado ou
  telefone diferente → 401 `INVALID_CREDENTIALS` genérico (mesma mensagem);
  sucesso: `revokeAllSessionsForUser` → `createSession` → cookie httpOnly
  `session` → `sendNewSessionEmail` (mock verificado) → 200
  `{ user, redirectTo: "/app/home" }`.
- **Rota** `apps/api/app/api/v1/auth/resend-confirmation/route.ts`: anônima — 200
  `{ ok: true }` para pendente (envia, revoga token anterior, gera novo),
  inexistente, confirmada e inválida (anti-enumeração); 5 testes.
- **Página** `apps/app/src/pages/auth/SignInPage.tsx`: form email+password+phone
  com validação client e `focusFirstError`, loading/`aria-busy`, erro genérico
  em `FormAlert`, `ACCOUNT_NOT_CONFIRMED` → alerta + botão "Resend confirmation
  email" com feedback, banner de reset via `location.state`, links para
  forgot-password e sign-up, navega para `redirectTo || "/app/home"`.
- **Rota pública** `/auth/sign-in` dentro de `<RequirePublic />` (`App.tsx`);
  guard barra sessão revogada (`me/route.spec.ts`: 401 + limpa cookie).
- **Acessibilidade (web-design-guidelines)**: labels/`aria-describedby`/
  `aria-invalid`, erros anunciados (`role="alert"`/`aria-live`),
  `autocomplete`/`inputMode`/`spellCheck` corretos — página auditada, sem
  achados que exigissem mudança.

## Lacunas corrigidas nesta iteração

1. **Cobertura de UI do sign-in** — critério de aceite "UI: form valida campos;
   erro de credencial genérico; erro de não-confirmado mostra botão de reenvio com
   feedback" não tinha teste de componente. → Criado
   `apps/app/src/pages/auth/SignInPage.spec.tsx` com 6 casos: renderiza form +
   links; validação client sem chamar API; sucesso posta payload e navega para
   `/app/home`; 401 genérico sem botão de reenvio; 403 → alerta + botão de reenvio
   com feedback "Check your inbox"; banner de senha atualizada.
2. **Cenário integrado "última vence + guard barra a máquina antiga"** —
   o critério pede validação do fluxo completo; revogação e 401 estavam cobertos
   em testes separados. → Adicionado caso no
   `apps/api/app/api/v1/auth/sign-in/route.spec.ts`: sessão da máquina A fica com
   `revoked_at` preenchido após login da máquina B **e** `GET /api/v1/auth/me` com
   o cookie da máquina A responde 401 `UNAUTHENTICATED`.

## Arquivos modificados (paths)

**Alterados por esta task:**

- `apps/api/app/api/v1/auth/sign-in/route.spec.ts` — novo caso integrado "máquina
  B → máquina A revogada → `/me` barra A" + helper `requestWithCookie`.

**Adicionados por esta task:**

- `apps/app/src/pages/auth/SignInPage.spec.tsx` — 6 testes de UI.
- `.plans/005-sign-in-plan.md`
- `.orchestration/run-2026-09-17-auth-005-007/005-progress.md`
- `.orchestration/run-2026-09-17-auth-005-007/005-done.md`

**Artefato gerado restaurado ao HEAD:** `apps/api/next-env.d.ts` (regenerado pelo
`next typegen`, sem diff final).

## Bibliotecas instaladas

Nenhuma.

## QA rodado

| Portão                                | Resultado                                                                                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vitest `apps/api`                     | ✅ 11 arquivos, **64 testes passando** (excluído o supertest conhecido)                                                                                 |
| Vitest `apps/app`                     | ✅ 5 arquivos, **19 testes passando** (6 novos da `SignInPage`)                                                                                         |
| ESLint `--max-warnings 0` (api + app) | ✅ sem erros                                                                                                                                            |
| `next typegen` + `tsc --noEmit` (api) | ✅ sem erros                                                                                                                                            |
| `tsc --noEmit` (app)                  | ✅ sem erros                                                                                                                                            |
| Prettier (glob do `format` do repo)   | ✅ arquivos tocados no padrão; avisos restantes são pré-existentes fora do glob (`*.js/.mjs/.yml`) ou compartilhados (`004-done.md`, `.specs/INDEX.md`) |

**Limitação de ambiente (herdada):** Node do sistema é 18.19.1 (projeto exige
≥ 24), então os portões foram executados com o runtime do Bun (`bunx --bun`
eslint/tsc/vitest). `tests/api.supertest.spec.ts` continua não executável porque
o dev server do run está ativo na porta 3002 (`bun` pid 64648) — limitação de
ambiente conhecida, não é código.

## ADR criado

Nenhum. Não houve decisão arquitetural nova: as mudanças foram apenas **testes
aditivos** sobre políticas já estabelecidas e documentadas — sessão única
("última vence") e guard barrando sessão revogada estão registradas nos ADRs
`0004`/`0005-auth-base` e nas regras de negócio/Q&As da própria spec `005`
("sessão antiga é revogada; última vence"; "erros genéricos anti-enumeração").
Ausência registrada conforme `RULES.md`.

## Decisões e racionais

- **Validar, não reescrever**: rota, reenvio e página passavam nos cenários
  centrais da spec (auditados um a um nos critérios de aceite); as mudanças foram
  apenas de cobertura, seguindo o padrão do run `004-confirm-account`.
- **Teste integrado no próprio spec do sign-in em vez de supertest**: o supertest
  real não roda neste ambiente (porta 3002 ocupada pelo dev server do run); o
  cenário "máquina B → A revogada → guard barra A" ficou fechado via `GET /me`
  importado no mesmo `route.spec.ts`, que já executa contra o Postgres local.
- **Mensagens de UI intocadas**: os textos en-us da página ("Invalid email,
  password or phone.", "Check your inbox…") já cumprem a convenção e os critérios
  de UX/anti-enumeração — não havia lacuna de cópia.
- **Pré-existentes fora de escopo**: `.specs/INDEX.md` e `004-done.md` seguem com
  estilo/status a ajustar no fechamento da orquestração (arquivos compartilhados
  com as outras tasks paralelas).

## Pendências

1. `tests/api.supertest.spec.ts` continua não executável com o dev server ativo
   na porta 3002 (fora do escopo desta task).
2. Ambiente precisa de Node ≥ 24 (ou runtime Bun fixo no turbo) para os portões
   via `bun run` passarem sem workaround.
3. `.specs/INDEX.md` e o frontmatter de `005-sign-in.md` ainda dizem `rascunho` →
   atualizar para `concluido` no fechamento da orquestração (arquivos
   compartilhados).
