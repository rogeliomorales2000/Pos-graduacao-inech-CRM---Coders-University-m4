---
title: Forgot password (solicitar reset de senha)
status: rascunho
created: 2026-09-17
updated: 2026-09-17
owner: izanami
type: feature
---

# Forgot password

## Resumo

Página pública `/auth/forgot-password` onde o usuário que esqueceu a senha informa seu **email e telefone** para solicitar o reset. O endpoint `POST /api/v1/auth/forgot-password` valida se o email existe e o telefone coincide; em caso positivo, envia um email com um **token de reset** e um link que leva à página `/auth/reset-password`. A resposta é sempre genérica (anti-enumeração).

## Contexto

Depende da `auth-base` (tabela `password_reset_tokens`, `EmailService`, roteamento `/auth/*` público). É o primeiro passo do fluxo de recuperação, seguido da spec `reset-password` (que valida o token e define a nova senha). Decisão do breakdown: reset é solicitado "através do email e do número de celular" — ambos os campos participam da validação.

## Necessidade de negócio

Usuários esquecem senha; sem recuperação, contas ficam presas e geram suporte manual. O prompt exige especificamente: só deve ser enviado email "caso o email exista", e o link leva à página de reset com token a validar.

- Personas afetadas: usuários logados da plataforma que perderam acesso à senha.
- Métrica de sucesso: usuário que usa email+telefone válidos recebe o email com token e chega à página de reset; contas inexistentes não são reveladas.

## Escopo

- `@apps/app` — página `/auth/forgot-password` (form email + phone, estados de sucesso/erro).
- `@apps/api` — endpoint `POST /api/v1/auth/forgot-password`.

### Inclui (MVP)

- Form com email e phone (obrigatórios).
- `POST /api/v1/auth/forgot-password` `{ email, phone }`:
  - Busca user por email; se não existir ou o telefone não coincidir → resposta **genérica de sucesso** (sem enviar email, sem enumerar).
  - Se existir e o telefone coincidir → gera token em `password_reset_tokens` (hash + expiração, safe default 30 min), envia email com link `{APP_URL}/auth/reset-password?token=...`.
- Página mostra estado de sucesso ("If an account exists, we sent a reset link") com link de volta para sign-in.

### Não inclui (fora de escopo)

- Definição da nova senha / validação de token em si (spec `reset-password`).
- Reenvio/limite de envios (rate limit fica como não-funcional mínimo).
- Envio via SMS.
- Alteração de senha logado (change password).

## Requisitos

### Funcionais

- [ ] Como usuário que esqueceu a senha, quero informar email e telefone, para receber um link de reset se minha conta existir.
- [ ] Como usuário, quero que o email de reset só seja enviado quando a conta existir e o telefone bater, para não gerar emails a contas erradas.
- [ ] Como usuário, quero que a resposta não revele se meu email está cadastrado, para não expor contas a terceiros.

### Não-funcionais

- **Segurança**: token de reset hashado no banco, expiração curta (30 min), resposta anônima (anti-enumeração de email).
- **Uso único**: token consumido em `reset-password`; novo pedido anula/coexiste com tokens antigos (decisão: token anterior do mesmo user é revogado ao gerar novo — evitar links concorrentes).
- **Acessibilidade**: form navegável por teclado, erros anunciados.
- **Consistência**: en-us; `{ error: { code, message } }`.

## Regras de negócio

- Campos obrigatórios: email válido e phone.
- Envio apenas se: user existe por email **e** `phone == users.phone`.
- Resposta HTTP de sucesso (200) idêntica quer envie ou não email (anti-enumeração).
- Ao gerar novo token de reset para um user, **revogar/consumir tokens anteriores** do mesmo user (apenas o último reset link vale).
- Token expira em 30 min (safe default) e é de uso único (consumido ao resetar).

## Dados e integrações

- **POST `/api/v1/auth/forgot-password`** — request `{ email, phone }`; response 200 genérico.
- **Tabelas**: lê `users` (por email), manipula `password_reset_tokens` (revoga antigos, insere novo).
- **Email**: `EmailService.sendPasswordResetEmail({ to, resetLink })` — template en-us.

## UX e estados de interface

- `/auth/forgot-password`: campos email + phone; submit com loading.
- Sucesso: "If an account exists with this email, we sent a password reset link." + link para `/auth/sign-in`.
- Erro de validação (campos vazios/email malformado): mensagens por campo; erros de envio (falha de infra) podem ser explícitos.

## Critérios de aceite

- [ ] `POST /api/v1/auth/forgot-password` com email+telefone de conta existente: gera token (hashado, 30 min), revoga tokens anteriores do user e envia email com link `{APP_URL}/auth/reset-password?token=...` (provider mockado verificado).
- [ ] Email existente com telefone **incorreto**: resposta 200 genérica e **nenhum** email enviado.
- [ ] Email inexistente: resposta 200 genérica e nenhum email enviado.
- [ ] As duas respostas acima são indistinguíveis (corpo/mensagem idênticos) — anti-enumeração.
- [ ] Novo pedido revoga token anterior do mesmo user (apenas o último link vale) — testado.
- [ ] UI: form valida obrigatórios; mostra mensagem de sucesso genérica; link para sign-in presente.
- [ ] Supertest/Vitest cobrem: envio com sucesso, telefone errado, email inexistente, revogação de token anterior.
- [ ] `bun run lint` e `bun run check-types` passam em `@apps/api` e `@apps/app`.

## Decisões técnicas e riscos

- **Anti-enumeração total**: resposta genérica sempre; trade-off é não confirmar ao usuário que o email existe — aceitável e mitigado pela segurança.
- **Telefone como segundo fator do pedido**: adiciona camada sem SMS; se o telefone não bater, o link não é enviado.
- **Revogar tokens anteriores**: evita que múltiplos links concorrentes validem; risco de o usuário perder link se pedir duas vezes — aceitável porque o último link vale.
- **Rollback**: reverter endpoint/página; tokens órfãos inócuos e expiram rápido.

## Backlog / desejáveis

- Rate limiting por email/IP no endpoint.
- Reenvio com contador visível ("Nova tentativa em Xs").

## Q&A registradas

- **Reset é pedido com o quê?** R: **email + telefone**; o envio exige que ambos batam com a conta.
- **Revela se o email existe?** R: **não** — resposta sempre genérica de sucesso.
- **Expiração do token de reset?** R: safe default **30 minutos**.
- **Usuário pede reset 2x?** R: token anterior é revogado; só o **último link vale**.
