# Plano — 004-confirm-account

## Problema

Spec `004-confirm-account` (confirmação de conta via email). Rota
`POST /api/v1/auth/confirm-account` e página `/auth/confirm-account` já existem do
trabalho anterior. Esta iteração valida contra a spec e fecha as lacunas reais.

## Já-coberto (validado, sem alteração)

- **Rota** `apps/api/app/api/v1/auth/confirm-account/route.ts`:
  - `validateToken` → 400 `VALIDATION_ERROR` sem token;
  - `getEmailConfirmationTokenByToken` (hash sha-256) → 400 `INVALID_TOKEN`;
  - token consumido → 400 `TOKEN_ALREADY_USED`;
  - token expirado → 400 `TOKEN_EXPIRED` (sem confirmar/criar sessão);
  - user inexistente → 400 `INVALID_TOKEN`; conta já confirmada → 400
    `ACCOUNT_ALREADY_CONFIRMED` (erro controlado, sem nova sessão — safe default da spec);
  - sucesso: `consumeEmailConfirmationToken` → `confirmUser` (idempotente via
    `coalesce`) → `createSession` → cookie httpOnly `session` → 200
    `{ user (público), redirectTo: "/app/home" }`.
- **Testes da rota** (`route.spec.ts`): válido/consumido/expirado/inválido/
  já-confirmado/sem-token — cobrem os critérios de aceite da API.
- **Página** `apps/app/src/pages/auth/ConfirmAccountPage.tsx`: confirma no load
  (sem botão), loading `role="status"`, sucesso navega para `redirectTo`,
  erro `FormAlert role="alert"` + link para `/auth/sign-in`, sem token → "invalid link".
- **Rotas públicas**: `/auth/confirm-account` dentro de `<RequirePublic />` em `App.tsx`.

## Lacunas reais (a corrigir)

1. **Sessão única** — regra de negócio da spec: "Sessão criada na confirmação
   segue a política de sessão única da plataforma (em caso de sessão anterior do
   mesmo user, a nova é a válida — aplicado via helpers da `auth-base`)". A rota
   cria sessão sem revogar as anteriores; `sign-in` usa `revokeAllSessionsForUser`
   antes de `createSession`. → Adicionar `revokeAllSessionsForUser` + teste.
2. **Cobertura de UI** — critérios de aceite de UI (sem token → "invalid link";
   com token válido → redireciona; falha → mensagem + link para sign-in) não
   têm teste de componente (padrão da casa: `SignUpPage.spec.tsx`,
   `HomePage.spec.tsx`). → Criar `ConfirmAccountPage.spec.tsx`.

## Abordagem

- Mudanças aditivas e aderentes ao padrão existente; nada de comportamento
  funcional será removido.
- Ordem no fluxo: validações → `consumeEmailConfirmationToken` → `confirmUser` →
  `revokeAllSessionsForUser` → `createSession` → cookie → 200.

## Passos

1. Atualizar `route.ts`: importar e chamar `revokeAllSessionsForUser(user.id)`.
2. Adicionar caso no `route.spec.ts`: sessão prévia do user é revogada, permanece
   exatamente 1 sessão válida (a nova).
3. Criar `apps/app/src/pages/auth/ConfirmAccountPage.spec.tsx` (3 casos).
4. QA: lint, check-types, vitest (api + app), format.
5. Relatórios `004-done.md` + `004-progress.md`; ADR só se decisão nova.

## Critérios de aceite (spec)

- [x] POST com token válido: confirma, consome, cria sessão/cookie, 200 +
      redirectTo (já-coberto; agora com revogação de sessões anteriores).
- [x] Segunda chamada do mesmo token → `TOKEN_ALREADY_USED`/400 sem nova sessão.
- [x] Token expirado → `TOKEN_EXPIRED`/400 sem confirmar/criar sessão.
- [x] Token inválido → `INVALID_TOKEN`/400.
- [x] Conta já confirmada → comportamento seguro coberto por teste
      (`ACCOUNT_ALREADY_CONFIRMED`, sem nova sessão).
- [x] UI: sem token "invalid link"; válido redireciona; falha mostra mensagem +
      link para `/auth/sign-in` (agora coberto por teste).
- [x] Vitest cobre válido/consumido/expirado/inválido (+ já-confirmado e sessão única).
- [x] `bun run lint` e `bun run check-types` passam em `@apps/api` e `@apps/app`.

## Q&As

Registradas na spec `004` (não re-perguntadas): confirmação automática no load;
token usado → erro sem nova sessão; conta já confirmada → erro controlado sem
nova sessão; sessão única é a regra.
