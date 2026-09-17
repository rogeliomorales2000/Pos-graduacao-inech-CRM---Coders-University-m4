---
title: Reset password (definir nova senha)
status: rascunho
created: 2026-09-17
updated: 2026-09-17
owner: izanami
type: feature
---

# Reset password

## Resumo

Página pública `/auth/reset-password` (acessada via link com token recebido no `forgot-password`) onde o usuário define a nova senha informando **nova senha + confirmação da nova senha** (obrigatoriamente iguais). O endpoint `POST /api/v1/auth/reset-password` valida o token (existente, não consumido, não expirado) e o match das senhas, atualiza o hash da senha, **revoga todas as sessões** do usuário, envia email de sucesso e navega para `/auth/sign-in`.

## Contexto

Depende da `auth-base` (tabela `password_reset_tokens`, helpers de sessão, `EmailService`, roteamento `/auth/*` público) e do `forgot-password` (que gera o token e o link). Requisitos do prompt: na página de reset devem existir o token, campo para nova senha e campo para confirmação; ambas devem dar match; em caso de sucesso, enviar email e navegar para o sign-in.

## Necessidade de negócio

Fecha o fluxo de recuperação de acesso: sem ele, o token do forgot-password não teria utilidade. O email de sucesso confirma ao usuário que a mudança aconteceu (e alerta caso ele não tenha feito a ação — possível invasão).

- Personas afetadas: usuários que solicitaram reset de senha.
- Métrica de sucesso: token válido + senhas com match atualizam a senha, encerram sessões antigas e levam ao sign-in; tokens inválidos não alteram nada.

## Escopo

- `@apps/app` — página `/auth/reset-password` (lê token da query, campos nova senha + confirmação, estados).
- `@apps/api` — endpoint `POST /api/v1/auth/reset-password`.

### Inclui (MVP)

- Página pública `/auth/reset-password?token=...` com campos `new_password` e `confirm_password`.
- `POST /api/v1/auth/reset-password` `{ token, new_password, confirm_password }`:
  - Valida token (existe, `consumed_at IS NULL`, `expires_at > now()`).
  - Valida `new_password == confirm_password` e tamanho mínimo (8).
  - Atualiza `users.password_hash` (bcrypt), marca token consumido, **revoga todas as sessões** do usuário.
  - Envia email de sucesso via `EmailService`.
- Sucesso → cliente navega para `/auth/sign-in`.
- Estados de erro: token inválido/expirado/consumido → mensagem + link para `forgot-password` (solicitar novo). Senhas sem match → erro no campo de confirmação.

### Não inclui (fora de escopo)

- Força de senha além do mínimo (complexidade) — backlog.
- "Alterar senha logado" (change password).
- OTP/autorização por telefone nesse passo (não pedido).

## Requisitos

### Funcionais

- [ ] Como usuário com link de reset, quero informar nova senha e confirmação, para recuperar o acesso à minha conta.
- [ ] Como usuário, quero que nova senha e confirmação tenham que coincidir, para evitar erro de digitação.
- [ ] Como usuário, quero receber email de sucesso após redefinir a senha, para confirmar a mudança.
- [ ] Como usuário, quero ser levado para o sign-in após o reset, para logar com a nova senha.
- [ ] Como usuário, quero que token inválido/vencido mostre erro com caminho para solicitar novo link.

### Não-funcionais

- **Segurança**: senha hasheada (bcrypt); token de uso único; ao resetar, **revogar todas as sessões** (logout em todas as máquinas); token nunca logado em claro.
- **Acessibilidade**: form navegável por teclado, erros anunciados.
- **Consistência**: en-us; `{ error: { code, message } }`.

## Regras de negócio

- Token válido = existe, `consumed_at IS NULL` e `expires_at > now()`.
- `new_password` mínimo 8 caracteres e `new_password == confirm_password`; divergência → 400 `PASSWORD_MISMATCH`.
- Consumir o token (marcar `consumed_at`) **apenas** quando o reset é aplicado com sucesso.
- Reset bem-sucedido revoga **todas** as sessões do usuário (política de sessão única reforçada) — ninguém continua logado com a senha antiga.
- Email de sucesso enviado após o commit da mudança.
- Sucesso na API → cliente redireciona para `/auth/sign-in`.

## Dados e integrações

- **POST `/api/v1/auth/reset-password`** — request `{ token, new_password, confirm_password }`; response 200 `{ redirectTo: "/auth/sign-in" }`.
- **Tabelas**: atualiza `users.password_hash`; marca `password_reset_tokens.consumed_at`; revoga `sessions` do user.
- **Email**: `EmailService.sendPasswordResetSuccess({ to })` — template en-us.

## UX e estados de interface

- `/auth/reset-password?token=...`: campos nova senha + confirmação; submit com loading.
- Sucesso → navega para `/auth/sign-in` (opcional: mensagem breve "Password updated").
- Erro: token inválido/expirado → mensagem + link "Request a new reset link" (`/auth/forgot-password`); senhas sem match → erro no campo de confirmação.
- Sem token na URL → estado de erro "invalid link" com link para forgot-password.

## Critérios de aceite

- [ ] `POST /api/v1/auth/reset-password` com token válido e senhas iguais (min. 8): atualiza `password_hash` (bcrypt), consome o token, revoga todas as sessões do user e envia email de sucesso (provider mockado verificado).
- [ ] `new_password != confirm_password` retorna 400 `PASSWORD_MISMATCH` e **não** altera a senha nem consome token.
- [ ] Token expirado retorna erro (`TOKEN_EXPIRED`) sem alterar nada.
- [ ] Token já consumido retorna erro (`TOKEN_ALREADY_USED`) sem alterar nada.
- [ ] Token inexistente retorna erro (`INVALID_TOKEN`).
- [ ] Senha antiga não funciona mais e a nova funciona no sign-in (teste de integração sign-in após reset).
- [ ] Após reset, todas as sessões do user estão revogadas (`sessions.revoked_at` preenchido) — guard barra as antigas.
- [ ] UI: valida match; sucesso navega para sign-in; token inválido/expirado/ausente mostra erro + link para forgot-password.
- [ ] Supertest/Vitest cobrem: sucesso, mismatch, token expirado, consumido e inexistente; sessões revogadas.
- [ ] `bun run lint` e `bun run check-types` passam em `@apps/api` e `@apps/app`.

## Decisões técnicas e riscos

- **Revogar todas as sessões no reset**: mitigação padrão de segurança; custo zero para MVP.
- **Consumo somente no sucesso**: evita que usuário com token bom fique sem tentativa se errar o match (ele corrige e tenta de novo).
- **Token na URL (query string)**: herdado do forgot-password; risco de log/referrer — expiração curta (30 min) e nunca logado em claro.
- **Rollback**: reverter endpoint/página; senha trocada é recuperável só por novo forgot-password.

## Backlog / desejáveis

- Política de força de senha (minúscula/maiúscula/número/símbolo).
- Bloquear reuso de senhas anteriores (histórico de hashes).
- Página informar quando a senha antiga foi "parecida demais".

## Q&A registradas

- **Resetar revoga sessões em todas as máquinas?** R: **sim** — todas as sessões do usuário são revogadas no reset (a última não fica válida).
- **Se as senhas não casam?** R: erro `PASSWORD_MISMATCH` sem consumir o token; usuário corrige e submete de novo.
- **Token pode ser reusado?** R: **não** — uso único; expira em 30 min (do forgot-password).
- **Email de sucesso contém o quê?** R: apenas confirmação da mudança (sem token/senha).
