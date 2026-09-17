# Índice de Specs — Fluxo de Autenticação

## Roadmap de execução

Implementar **uma feature por iteração**, na ordem abaixo, via `implement-me`. Só inicie a feature N+1 após a anterior passar pelos portões de QA (`QA.md`) e pelo checklist de fim de iteração (`RULES.md`).

| Ordem | Spec                                          | Status    | Dependências                   | Escopo (1 linha)                                                                                                                                                                                             |
| ----- | --------------------------------------------- | --------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | [`auth-base`](./001-auth-base.md)         | concluido | `foundation`                   | Fundação do domínio de auth: schema users/sessions/tokens, bcrypt, EmailService (Mailtrap dev / Resend prod), scaffolding `/api/v1/auth/*`, roteamento `/auth/*` público + `/app/*` privado, convenção en-us |
| 2     | [`sign-out`](./002-sign-out.md)               | concluido | `auth-base`                    | Encerra a sessão corrente: revoga `sessions.revoked_at`, limpa o cookie `session` e redireciona para `/auth/sign-in`                                                                                         |
| 3     | [`sign-up`](./003-sign-up.md)                 | concluido | `auth-base`                    | Cadastro com nome/sobrenome/email/senha/confirmação/telefone; conta pendente + email de confirmação com token                                                                                                |
| 4     | [`confirm-account`](./004-confirm-account.md) | concluido | `sign-up`, `auth-base`         | Valida token do email, ativa a conta, cria sessão e redireciona para `/app/home`                                                                                                                             |
| 5     | [`sign-in`](./005-sign-in.md)                 | rascunho  | `auth-base`, `confirm-account` | Login email+senha+repetir telefone; bloqueia conta não confirmada (com reenvio); email de nova sessão; uma sessão válida por pessoa (última vence)                                                           |
| 6     | [`forgot-password`](./006-forgot-password.md) | rascunho  | `auth-base`                    | Solicita reset com email+telefone; se bater, envia token de reset por email com anti-enumeração                                                                                                              |
| 7     | [`reset-password`](./007-reset-password.md)   | rascunho  | `forgot-password`, `auth-base` | Define nova senha + confirmação (match); valida token; revoga sessões; email de sucesso; navega para sign-in                                                                                                 |

## Convenções globais (valem para as 7 specs)

- **Idioma**: todo texto de UI, mensagens de erro, emails e código em **en-us** (documentado na `auth-base`).
- **Versionamento de API**: endpoints sob `/api/v1/*`; auth sob `/api/v1/auth/*`.
- **Rotas**: públicas em `/auth/*`, privadas em `/app/*` (guard de sessão na `auth-base`).
- **Stack**: auth **custom + bcrypt** sobre o Postgres local (Supabase vira só banco); email via `EmailService` (Mailtrap dev / Resend prod).
- **Sessão única**: uma sessão válida por pessoa; a última criada revoga as anteriores (`sign-in`, `confirm-account`).
- **Conta não confirmada**: bloqueada de logar; reenvio de link disponível (`sign-in`).

## Como evoluir este índice

Se o prompt/esforço mudar, re-execute `breakdown-specs` (ou `refine-spec` por spec) e atualize este arquivo **antes** de seguir. Specs que entrarem primeiro na fila ficam no topo da tabela.
