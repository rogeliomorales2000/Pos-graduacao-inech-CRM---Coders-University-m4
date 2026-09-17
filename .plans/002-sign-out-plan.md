# Plano — TASK002 / spec `002-sign-out` (validação e fechamento)

## Problema

A spec `002-sign-out` já está marcada `concluido` no `.specs/INDEX.md` e no
frontmatter, e sua implementação consta no commit `de641d0` (endpoint +
botão + guard + testes). Esta iteração de orquestração paralela **não** deve
reimplementar: deve **validar** o comportamento contra os critérios de aceite,
corrigir lacunas reais e completar o que faltar, sem remover o que funciona.

## Abordagem

1. Auditar o código real de sign-out contra cada critério de aceite da spec.
2. Fechar lacunas reais (de preferência aditivas: teste/consolidação).
3. Rodar os portões de QA (`lint`, `check-types`, `format`).
4. Registrar progresso/relatório; ADR só se houver decisão nova.

## Q&As (feature-concept / spec, já registradas — sem re-perguntar)

- Sign-out revoga **apenas** a sessão corrente; "log out everywhere" fica no backlog.
- Sem sessão, sign-out retorna **200 idempotente** e leva ao sign-in.
- Botão no placeholder privado `/app/home` (única tela privada do MVP).
- Fica na ordem 2 porque depende só da `auth-base` (sessões/cookie/guard).

## Estado auditado (já coberto — não alterar)

- `apps/api/app/api/v1/auth/sign-out/route.ts`: lê cookie `session`, revoga se
  válido, sempre 200, limpa cookie httpOnly.
- `apps/api/lib/auth/sessions.ts`: `createSession`/`getSessionByToken`/`revokeSession`/
  `isSessionValid` com `token_hash` sha-256.
- `apps/app/src/pages/app/HomePage.tsx`: botão "Sign out" com estado de loading e
  navegação para `/auth/sign-in`.
- `apps/app/src/components/RequireAuth.tsx` + `RequirePublic.tsx`: guardas de rota.
- Testes: `sign-out/route.spec.ts` (4 casos), `HomePage.spec.tsx` (2), `App.spec.tsx` (3),
  `sessions.spec.ts` (6), `e2e/app.spec.ts` (1).

## Lacunas reais identificadas

1. **Cobertura do critério "após o sign-out a sessão antiga é barrada"**: não havia
   teste que, após `POST /sign-out`, fosse feita uma requisição **end-to-end** com o
   cookie antigo em `GET /api/v1/auth/me` esperando `401 UNAUTHENTICATED`.
   (Estava coberto só de forma implícita via `isSessionValid`/`revoked_at`.)
2. **Duplicação da limpeza do cookie**: o route repetia inline os atributos já
   existentes em `clearSessionCookie` (`lib/auth/cookies.ts`), com risco de drift.

## Passos de implementação (desta task)

1. `sign-out/route.spec.ts`: novo caso "a sessão revogada deixa de autenticar
   (GET /me responde 401)"; helper de request passa a aceitar o método HTTP.
2. `sign-out/route.ts`: usar `clearSessionCookie` (comportamento idêntico,
   sem duplicação).
3. QA: `bun run lint`, `bun run check-types`, `bun run format` (runtime Bun, pois
   Node do sistema é 18 e o turbo exige ≥ 24).

## Critérios de aceite (da spec — verificação)

- [x] `POST /sign-out` com sessão válida: `revoked_at`, cookie limpo, 200 (teste).
- [x] `POST /sign-out` sem cookie/sessão: 200 idempotente (testes).
- [x] Após sign-out, a sessão antiga é barrada — **novo teste** end-to-end.
- [x] UI: "Sign out" navega para `/auth/sign-in`; `/app/home` sem sessão é
      bloqueado pelo guard (testes de componente).
- [x] Outras sessões do mesmo usuário não são revogadas (teste).
- [x] `lint` e `check-types` verdes em `@apps/api`/`@apps/app`.
