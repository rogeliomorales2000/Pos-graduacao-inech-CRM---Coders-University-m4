# Done — TASK002 (spec `002-sign-out`)

Run: `run-2026-09-17-auth-001-004` · Data: 2026-09-17 · Agente: implementador TASK002

## Status

**CONCLUÍDO (validado e completado).** A spec `002-sign-out` já estava marcada
`concluido` (INDEX + frontmatter) e implementada no commit `de641d0`. Esta
iteração auditou o código real contra todos os critérios de aceite, fechou a
única lacuna de cobertura real e consolidou a limpeza do cookie. Nenhum
comportamento existente foi removido; nenhum commit/push foi feito (árvore suja
por instrução do run paralelo).

## Escopo validado (já coberto, preservado)

- `POST /api/v1/auth/sign-out` — revoga **só** a sessão corrente, sempre 200
  (idempotente), limpa o cookie httpOnly `session`.
- `GET /api/v1/auth/me` — 401 `UNAUTHENTICATED` (limpando o cookie) quando a
  sessão está revogada/ausente; alimenta os guards.
- `apps/app`: botão **Sign out** em `/app/home` com estado de loading e
  navegação para `/auth/sign-in`; guardas `RequireAuth`/`RequirePublic`.
- Textos en-us; erros no formato `{ error: { code, message } }`.
- Internamente: `token_hash` sha-256 (token nunca em claro); token não é logado.

## O que foi completado/corrigido

1. **Novo teste end-to-end do critério "após o sign-out a sessão antiga é
   barrada"** — em `sign-out/route.spec.ts`: após `POST /sign-out`, o
   `GET /me` com o cookie antigo deve responder `401 UNAUTHENTICATED`.
   Antes, isso era provado apenas de forma implícita (`revoked_at` +
   `isSessionValid`).
2. **Consolidação da limpeza do cookie** — `sign-out/route.ts` passou a usar o
   helper `clearSessionCookie` de `lib/auth/cookies.ts` em vez de repetir os
   atributos inline. Comportamento idêntico (httpOnly, sameSite lax, secure em
   produção, `path=/`, `expires` epoch), sem duplicação.
3. Helper de request do teste passou a aceitar o método HTTP.

## Arquivos modificados (desta task)

- `apps/api/app/api/v1/auth/sign-out/route.ts` — usa `clearSessionCookie`.
- `apps/api/app/api/v1/auth/sign-out/route.spec.ts` — +1 teste end-to-end.
- `.plans/002-sign-out-plan.md` (novo) — plano de validação.
- `.orchestration/run-2026-09-17-auth-001-004/002-progress.md` (novo).
- `.orchestration/run-2026-09-17-auth-001-004/002-done.md` (este).

> Observação: `bun run format` foi executado no repo (portão de QA) e ajustou a
> formatação de artefatos de outras tasks em paralelo (ex.: `001-done.md`). Não
> houve alteração de comportamento em escopo alheio.

## Bibliotecas instaladas

Nenhuma. Tudo o que a spec usa (`react-router-dom@^7`, `postgres@^3.4.9`) já
constava nos `package.json`.

## QA rodado

| Portão                                                                  | Resultado                                                                                 |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `eslint --max-warnings 0` (api, app, `@repo/ui`)                        | ✅ sem erros/avisos                                                                       |
| `check-types` (`next typegen` + `tsc --noEmit` na api; `tsc` no app/ui) | ✅ sem erros                                                                              |
| `prettier --check` (arquivos alterados)                                 | ✅ padronizado                                                                            |
| `bun run format` (repo)                                                 | ✅ aplicado                                                                               |
| `vitest run` api                                                        | ✅ 61 passed / 1 skipped                                                                  |
| `vitest run` app                                                        | ✅ 10 passed (3 arquivos)                                                                 |
| `sign-out/route.spec.ts` isolado                                        | ✅ 5/5                                                                                    |
| `bun run test:e2e` (Playwright)                                         | ⏭️ não executado (não exigido pela spec; critério de UI atendido por teste de componente) |

**Skips/limitações de ambiente:**

- `api.supertest.spec.ts` marcado _skip_ por já existir um Next dev server na
  porta 3002 (conflito de ambiente, não de código).
- Node do sistema é **18.19.1**; o projeto exige **≥ 24**. O `turbo` invoca
  `node` e quebra com `SyntaxError: Unexpected token 'with'` no ESLint 10. Os
  portões foram executados com o runtime do Bun (`bunx --bun …`), sem erros de
  código. Fixar o runtime Bun no turbo (ou Node ≥ 24) segue pendência do ambiente.

## ADR criado

Nenhum novo. As decisões de sign-out/roteamento/cookie já estão em
`adrs/0004-signout-prerequisites.md`; a fundação de auth está em
`adrs/0005-auth-base.md`. Não houve decisão arquitetural nova.

## Decisões e racionais

- **Validar, não reescrever**: o fluxo já funcionava e passava nos testes; a
  intervenção foi mínima e aditiva para reduzir risco sob orquestração paralela.
- **Teste end-to-end do "barrado após sign-out"**: era o único critério de
  aceite sem verificação direta; agora fica provado pela própria rota de sign-out.
- **Reusar `clearSessionCookie`**: elimina drift de atributos de cookie entre
  endpoints que criam/limpam sessão.
- **Sem commit/push**: instrução explícita do run paralelo.

## Pendências

1. Ambiente: Node ≥ 24 (ou fixar runtime Bun no turbo) para `bun run lint`/
   `check-types` rodarem sem workaround.
2. `bunx playwright install chromium` + servidores livres (3002/5173) para rodar
   `test:e2e`, se desejado.
3. Nenhuma pendência funcional da spec `002-sign-out`.
