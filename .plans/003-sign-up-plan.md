# Plano — 003 sign-up (validação e fechamento do cadastro)

## Problema

A spec `003-sign-up` já está majoritariamente implementada em commits anteriores
(`feat(api, app): feito cadastro e reset de senha`, `feat(api): email de
confirmação OK`): rota `POST /api/v1/auth/sign-up` e página `/auth/sign-up`
existem e passam nos testes. Esta iteração **valida** o que existe contra a spec,
**completa** as lacunas reais de cobertura e **corrige** apenas o que divergir —
sem reescrever nem remover comportamento funcional.

## Abordagem

1. **Auditoria** da rota, página, libs de auth, testes e migration contra os
   critérios de aceite e regras de negócio da spec.
2. **Fechar lacunas reais** (aditivo, sem tocar em arquivos de outras specs):
   - Assertiva no `sign-up/route.spec.ts` de que o link do email aponta para o
     pathname `/auth/confirm-account` com `token` (critério de aceite nº 5,
     parte do sign-up; o consumo é da `004`).
   - Teste Vitest novo da página `SignUpPage` cobrindo: validação client
     (senha != confirmação pontua o campo de confirmação), estado de sucesso
     ("Check your email") e erro da API (409 → alert de formulário), alinhado
     aos critérios de aceite nº 6.
3. **Rodar portões de QA** (`lint`, `check-types`, `format`, `test`) conforme
   `QA.md`, registrando a limitação Node 18 do ambiente (run via runtime Bun).
4. **Fechar processo**: progresso e relatório da orquestração; sem commit/push
   (instrução do run paralelo).

## Estado validado (já-coberto)

- **Rota `POST /api/v1/auth/sign-up`** (`apps/api/app/api/v1/auth/sign-up/route.ts`):
  validação server (`validation.ts`), senha via bcrypt (`passwords.ts`), user
  pendente (`confirmed_at` NULL por default na migration), token de confirmação
  hashado sha-256 com TTL 24h (`tokens.ts`), email via `EmailService` com link
  `{APP_URL}/auth/confirm-account?token=...` (`email.ts`), 201 com `user` público
  (sem `password_hash`), 400 `PASSWORD_MISMATCH`/`VALIDATION_ERROR`, 409
  `EMAIL_ALREADY_REGISTERED` (incluindo violação de unicidade 23505).
- **Página `/auth/sign-up`** (`apps/app/src/pages/auth/SignUpPage.tsx`): campos
  first/last name, email, phone, password, confirm password; validação client
  espelhando a server (obrigatórios, email válido, mínimo 8, match); estado
  loading no botão; sucesso "Check your email" com link para `/auth/sign-in`;
  erro por campo e global via `ApiError`; acessibilidade: `label`+`htmlFor`,
  `aria-invalid`, `aria-describedby`, `role="alert"`/`aria-live`, foco no
  primeiro erro (`form.ts`).
- **Testes da rota** (`sign-up/route.spec.ts`): 201 + hash+pendente+token hashado
  - email, 409 duplicado, 400 mismatch (sem email), 400 email/senha inválidos.
- **Rotas Públicas** (`App.tsx`): `/auth/sign-up` sob `RequirePublic`.
- **Email dev**: `ConsoleEmailProvider` loga token/link (fallback dev).

## Lacunas a fechar nesta iteração

1. `route.spec.ts` — aceite nº 5 pede link apontando para `/auth/confirm-account`;
   hoje o teste só extrai o `token`. Adicionar assertiva do pathname.
2. `SignUpPage.spec.tsx` (novo) — aceite nº 6/8: comportamento de UI validado em
   teste (mismatch no campo de confirmação, sucesso, erro 409).

## Fora de escopo (outras specs)

- Validação/consumo do token de confirmação → `004-confirm-account`.
- Reenvio de confirmação / sign-in / forgot / reset → specs próprias.
- Phone validation de formato, política de força de senha → backlog da spec.

## Critérios de aceite / verificação

- [ ] Rota completa e testada conforme acima (201/400/409, link bem-formado).
- [ ] Página valida os mesmos campos e estados (erro no confirm, sucesso).
- [ ] `bun run lint`, `bun run check-types`, `bun run format`, `bun run test`
      passam (via runtime Bun por Node 18 no ambiente).
- [ ] Progresso e relatório da orquestração escritos.

## Q&As (da spec `003` — não re-perguntadas)

- Cadastro duplicado → **409** (usuário digita o próprio email).
- Conta criada → **pendente** (`confirmed_at = NULL`).
- Expiração do token → **24h**.
- Senha mínima → **8 caracteres**.
- Idioma → **en-us** em UI, erros e email.
