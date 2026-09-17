# Plano — 007-reset-password

## Problema

Spec `007-reset-password` (definir nova senha com token do forgot-password). A rota
`POST /api/v1/auth/reset-password`, a página `/auth/reset-password` e o
`EmailService.sendPasswordResetSuccess` **já existem** (trabalho anterior). Esta
iteração audita o estado atual contra cada critério de aceite da spec e fecha
apenas as lacunas reais — sem reescrever o que já cumpre a spec (padrão dos runs
`004-confirm-account`/`005`/`006`).

## Já-coberto (validado, sem alteração)

- **Rota** `apps/api/app/api/v1/auth/reset-password/route.ts`:
  - `validateResetPassword` → 400 `VALIDATION_ERROR` com `fields` (token obrigatório,
    senha ≥ 8) e **400 `PASSWORD_MISMATCH`** quando `confirm_password` diverge.
  - Token: inexistente → 400 `INVALID_TOKEN`; `consumed_at` preenchido → 400
    `TOKEN_ALREADY_USED`; `expires_at <= now()` → 400 `TOKEN_EXPIRED`; user
    inexistente → 400 `INVALID_TOKEN`.
  - Sucesso: `hashPassword` (bcrypt) → `updateUserPassword` →
    `consumePasswordResetToken` (**só no sucesso**) → `revokeAllSessionsForUser` →
    `sendPasswordResetSuccess`; responde 200 `{ redirectTo: "/auth/sign-in" }`.
  - `catch` → 500 `INTERNAL_ERROR`.
- **Testes da rota** (`route.spec.ts`, 7 casos): sucesso (hash trocado + token
  consumido + 1 email `reset-success`), todas as sessões revogadas, mismatch sem
  efeito (token não consumido, sem email), token expirado sem alterar hash, token
  já consumido, token inexistente e senha < 8 → `VALIDATION_ERROR`.
- **Página** `apps/app/src/pages/auth/ResetPasswordPage.tsx`:
  - token da query; campos `new_password` + `confirm_password`; validação client
    (min 8 + match) com `focusFirstError`; loading (`aria-busy`).
  - Sucesso → `navigate("/auth/sign-in", { state: { passwordReset: true } })`
    (`SignInPage` exibe "Password updated.").
  - Token ausente → estado "invalid link" com link para `/auth/forgot-password`;
    erros de token da API (`INVALID_TOKEN`/`TOKEN_EXPIRED`/`TOKEN_ALREADY_USED`) →
    heading "We could not reset your password" + mesmo link; demais erros → campos/
    alerta global.
- **Roteamento**: `/auth/reset-password` dentro de `<RequirePublic />` (`App.tsx`);
  cliente `resetPassword()` em `apps/app/src/lib/api.ts` (POST JSON).
- **Email**: `sendPasswordResetSuccess` em `apps/api/lib/auth/email.ts` — template
  en-us sem token/senha (spec `007` = só confirmação da mudança).

## Lacunas reais (a corrigir)

1. **Sem teste de integração "sign-in após reset"** — o critério de aceite nº 6
   ("Senha antiga não funciona mais e a nova funciona no sign-in") só é validado no
   nível do **hash** (`verifyPassword`), não através do endpoint `sign-in`. →
   Adicionar caso no `route.spec.ts` que, após o reset, chama `POST
   /auth/sign-in` com a senha antiga (401 `INVALID_CREDENTIALS`) e com a nova (200,
   `redirectTo: /app/home`).
2. **UI sem teste de componente** — o critério de aceite nº 8 ("UI: valida match;
   sucesso navega para sign-in; token inválido/expirado/ausente mostra erro + link
   para forgot-password") está implementado mas sem cobertura. → Criar
   `apps/app/src/pages/auth/ResetPasswordPage.spec.tsx` no padrão de
   `ForgotPasswordPage.spec.tsx`/`ConfirmAccountPage.spec.tsx`.

## Abordagem

- Mudanças **aditivas** (teste de integração da rota + novo teste de UI de
  componente); nenhum comportamento funcional é alterado e nenhum arquivo de
  UI/produção é tocado.
- Skills `frontend-design`/`web-design-guidelines` carregadas conforme AGENTS.md —
  como **não há alteração de UI** (só entra `*.spec.tsx`), não há revisão de UI a
  aplicar; registro no relatório.

## Passos

1. `apps/api/app/api/v1/auth/reset-password/route.spec.ts`: importar `POST` de
   `../sign-in/route`; novo caso "após reset, a senha antiga não loga (401) e a
   nova loga (200 → /app/home)", user `confirmed: true`.
2. Criar `apps/app/src/pages/auth/ResetPasswordPage.spec.tsx` (~6 casos):
   render do form com token; sem token → invalid link + link forgot-password e
   nenhuma chamada de API; submit vazio → erros por campo sem chamar API; senhas
   divergentes → erro no campo de confirmação sem chamar API; submit válido →
   payload correto + navega para sign-in (rota de teste lê `state.passwordReset`);
   erro de token da API (`TOKEN_EXPIRED`) → heading de erro + link forgot-password;
   mismatch do servidor → erro por campo.
3. QA: Vitest (`apps/api` rota; `apps/api` suíte; `apps/app` suíte), ESLint
   `--max-warnings 0`, `next typegen` + `tsc --noEmit` (api), `tsc --noEmit` (app),
   Prettier — todas com runtime do Bun (`bunx --bun`) por causa do Node 18.19.1 do
   ambiente.
4. Relatórios `007-progress.md` (cumulativo) e `007-done.md`; ADR só se houver
   decisão nova (não há — registrar ausência com racional).

## Critérios de aceite (spec)

- [x] Sucesso com token válido + senhas iguais (≥ 8): bcrypt, consome token, revoga
      todas as sessões, email de sucesso (capturing service verificado).
- [x] `new_password != confirm_password` → 400 `PASSWORD_MISMATCH` sem alterar senha
      nem consumir token.
- [x] Token expirado → `TOKEN_EXPIRED` sem alterar nada.
- [x] Token consumido → `TOKEN_ALREADY_USED` sem alterar nada.
- [x] Token inexistente → `INVALID_TOKEN`.
- [ ] Senha antiga não funciona mais e a nova funciona no sign-in (teste de
      **integração sign-in após reset** — nova cobertura desta iteração).
- [x] Após reset, todas as sessões revogadas (`sessions.revoked_at` preenchido).
- [ ] UI: valida match; sucesso navega para sign-in; token inválido/expirado/ausente
      mostra erro + link para forgot-password (**teste de componente novo**).
- [x] Vitest cobre sucesso, mismatch, token expirado, consumido e inexistente;
      sessões revogadas.
- [ ] `bun run lint` e `bun run check-types` passam em `@apps/api` e `@apps/app`
      (validar com workaround `bunx --bun` por causa do Node 18 do ambiente).

## Q&As (da spec `007`; registradas, não re-perguntadas)

- **Resetar revoga sessões em todas as máquinas?** R: **sim** — todas as sessões do
  usuário são revogadas no reset (a última não fica válida).
- **Se as senhas não casam?** R: erro `PASSWORD_MISMATCH` sem consumir o token;
  usuário corrige e submete de novo.
- **Token pode ser reusado?** R: **não** — uso único; expira em 30 min (do
  forgot-password).
- **Email de sucesso contém o quê?** R: apenas confirmação da mudança (sem
  token/senha).