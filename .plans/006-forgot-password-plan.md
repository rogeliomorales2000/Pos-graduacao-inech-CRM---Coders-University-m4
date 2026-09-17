# Plano — 006-forgot-password

## Problema

Spec `006-forgot-password` (solicitar reset de senha com email + telefone). A rota
`POST /api/v1/auth/forgot-password`, a página `/auth/forgot-password` e o
`EmailService.sendPasswordResetEmail` **já existem** (trabalho anterior). Esta
iteração audita o estado atual contra cada critério de aceite da spec e fecha
apenas as lacunas reais — sem reescrever o que já cumpre a spec (padrão do run
anterior `004-confirm-account`).

## Já-coberto (validado, sem alteração)

- **Rota** `apps/api/app/api/v1/auth/forgot-password/route.ts`:
  - `validateForgotPassword` → 400 `VALIDATION_ERROR` com `fields` para email
    vazio/inválido e phone vazio.
  - `findUserByEmail` (email normalizado) + `user.phone === phone` (`phone` já vem
    trimado). Só nesse caso: `revokePasswordResetTokensForUser` →
    `createPasswordResetToken` (hash sha-256, TTL `PASSWORD_RESET_TTL_MS` =
    **30 min**) → link `{APP_URL}/auth/reset-password?token=...` →
    `sendPasswordResetEmail`.
  - Email inexistente ou telefone divergente → **nenhuma** escrita e **nenhum**
    email, mas responde 200.
  - Resposta **sempre** `{ ok: true }` (200) no fim, inclusive no caminho de envio;
    erros de infra são logados e **não vazam** (anti-enumeração total).
- **Testes da rota** (`route.spec.ts`): sucesso (token hashado + email com link),
  revogação do token anterior (só o último vale), telefone incorreto, email
  inexistente, respostas indistinguíveis (corpo idêntico) e `VALIDATION_ERROR`.
- **Página** `apps/app/src/pages/auth/ForgotPasswordPage.tsx`: form email + phone
  obrigatórios com validação client-side, loading (`aria-busy`), estado de sucesso
  genérico ("If an account exists with this email, we sent a password reset link.")
  com link para `/auth/sign-in`, alerta de erro e erros por campo via `FormField`.
- **Roteamento**: `/auth/forgot-password` dentro de `<RequirePublic />` (`App.tsx`).
- **Cliente**: `forgotPassword()` em `apps/app/src/lib/api.ts` (POST JSON).

## Lacunas reais (a corrigir)

1. **Expiração de 30 min não é afirmada em teste** — o critério de aceite nº 1
   exige "gera token (hashado, **30 min**)". O teste atual valida hash e revogação,
   mas não checa `expires_at`. → Adicionar caso que asserta que `expires_at` cai na
   janela esperada (`Date.now() + PASSWORD_RESET_TTL_MS`, com tolerância).
2. **UI sem teste de componente** — o critério de aceite de UI ("form valida
   obrigatórios; mostra mensagem de sucesso genérica; link para sign-in presente")
   não tem cobertura. → Criar `ForgotPasswordPage.spec.tsx` no padrão da casa
   (`SignUpPage.spec.tsx`/`ConfirmAccountPage.spec.tsx`).

## Abordagem

- Mudanças **aditivas** (somente teste de API + novo teste de UI); nenhum
  comportamento funcional é alterado e nenhum arquivo de UI/produção é tocado.
- Sem design system/shadcn ainda; a página já cumpre a UX/no-fluxo. Como **não há
  alteração de UI**, não é necessário recarregar `frontend-design`/
  `web-design-guidelines` (não se aplica: só entra arquivo `*.spec.tsx`).

## Passos

1. `apps/api/app/api/v1/auth/forgot-password/route.spec.ts`: selecionar
   `expires_at` em `resetTokenHashes`; novo caso "expira em 30 minutos"
   (asserta janela `[now+29min, now+31min]` usando `PASSWORD_RESET_TTL_MS`).
2. Criar `apps/app/src/pages/auth/ForgotPasswordPage.spec.tsx` (4 casos):
   render do form + link sign-in; submit vazio → erros de campo sem chamar API;
   submit válido → payload correto + sucesso genérico + link sign-in; erro global
   da API (falha de infra) → `role="alert"`.
3. QA: Vitest `apps/api` (spec da rota) e `apps/app`; ESLint `--max-warnings 0`;
   `tsc --noEmit` (com `next typegen` no api); Prettier.
4. Relatórios `006-progress.md` e `006-done.md`; ADR só se houver decisão nova
   (não há: tudo já decidido em `0005-auth-base` + Q&As da spec).

## Critérios de aceite (spec)

- [x] Sucesso com email+telefone corretos: gera token hashado, 30 min, revoga
      anteriores e envia email com link (agora com assert de expiração).
- [x] Telefone incorreto → 200 genérico e nenhum email.
- [x] Email inexistente → 200 genérico e nenhum email.
- [x] Respostas indistinguíveis (corpo/mensagem idênticos).
- [x] Novo pedido revoga token anterior (só o último vale).
- [x] UI valida obrigatórios, mostra sucesso genérico e link para sign-in
      (agora com teste de componente).
- [x] Vitest cobre sucesso, telefone errado, email inexistente e revogação.
- [ ] `bun run lint` e `bun run check-types` passam em `@apps/api` e `@apps/app`
      (validar com workaround `bunx --bun` por causa do Node 18 do ambiente).

## Q&As (da spec `006`; não re-perguntadas)

- Reset é pedido com **email + telefone**; o envio exige que ambos batam.
- Não revela se o email existe: **resposta sempre genérica de sucesso**.
- Expiração do token de reset: **30 minutos** (safe default).
- Usuário pede reset 2x: token anterior é **revogado**; só o último link vale.
