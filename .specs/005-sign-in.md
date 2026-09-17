---
title: Sign-in (login)
status: concluido
created: 2026-09-17
updated: 2026-09-17
owner: izanami
type: feature
---

# Sign-in

## Resumo

Página pública `/auth/sign-in` onde o usuário loga informando email, senha e **repetindo o telefone cadastrado** (confirmação de número celular via campo repetido). O endpoint `POST /api/v1/auth/sign-in` valida as credenciais e o telefone, bloqueia contas não confirmadas (permitindo reenviar o email de confirmação), envia um email de **nova sessão**, garante **apenas uma sessão válida por pessoa (a última vence)** e navega para a home (`/app/home`).

## Contexto

Construída sobre a `auth-base` (helpers de sessão, bcrypt, `EmailService`, roteamento `/auth/*` públicos) e alinhada a `confirm-account` (conta precisa estar confirmada para logar — decisão do breakdown: "não, bloquear e reenviar link"). A política de sessão única é requisito explícito do prompt: logar em duas máquinas mantém apenas a última sessão válida.

## Necessidade de negócio

É o acesso contínuo das personas (CEO/CMO/CTO) à plataforma. A sessão única protege a conta (roubo de sessão antiga) e o email de nova sessão avisa a pessoa de qualquer login — cobertura essencial para uma plataforma que processa dados de negócio.

- Personas afetadas: usuários da plataforma.
- Métrica de sucesso: login válido leva à home em segundos; segunda máquina invalida a primeira sessão; usuário recebe email de notificação de nova sessão.

## Escopo

- `@apps/app` — página `/auth/sign-in` (form email + password + phone, estados, link para forgot-password), integração com reenvio de confirmação.
- `@apps/api` — endpoint `POST /api/v1/auth/sign-in` e `POST /api/v1/auth/resend-confirmation`.

### Inclui (MVP)

- Form: email, password, phone (campo "repetir telefone cadastrado"). Validação client + server.
- `POST /api/v1/auth/sign-in` `{ email, password, phone }`:
  - Verifica user por email; senha via bcrypt; telefone deve **coincidir** com o cadastrado.
  - Conta não confirmada (`confirmed_at IS NULL`) → 403 `ACCOUNT_NOT_CONFIRMED` + permite reenviar link.
  - Sucesso: **revoga todas as sessões anteriores** do usuário (política "última vence"), cria a sessão nova, seta cookie httpOnly, envia email de **nova sessão** via `EmailService`, retorna 200 com `redirectTo: "/app/home"`.
- `POST /api/v1/auth/resend-confirmation` `{ email }`: reenvia o email de confirmação se a conta existir e estiver pendente (resposta anônima para não enumerar emails).
- Cliente: após sucesso, navega para `/app/home`.

### Não inclui (fora de escopo)

- OTP/SMS (confirmação de celular é campo repetido, decisão registrada).
- Logout (backlog da `auth-base`).
- Reset de senha (specs `forgot-password`/`reset-password`).
- MFA, OAuth, "lembrar de mim"/persistência de sessão configurável.

## Requisitos

### Funcionais

- [ ] Como usuário, quero logar com email, senha e telefone cadastrado, para acessar a plataforma.
- [ ] Como usuário, quero que meu telefone digitado no login tenha que coincidir com o cadastrado, como confirmação de número celular.
- [ ] Como usuário não confirmado, quero ser bloqueado do login e poder reenviar o email de confirmação.
- [ ] Como usuário, quero receber um email de aviso a cada nova sessão criada.
- [ ] Como usuário, quero que, ao logar em outra máquina, a sessão anterior seja invalidada (a última é a válida).
- [ ] Como usuário, quero ir para a home (`/app/home`) após login válido.

### Não-funcionais

- **Segurança**: comparar senha com bcrypt; cookie httpOnly; tokens/senhas nunca logados; mensagens que não enumeram contas no `resend-confirmation`.
- **Acessibilidade**: labels, teclado, erros anunciados (`web-design-guidelines`).
- **Responsividade**: form em mobile/tablet/desktop.
- **Consistência**: textos en-us; erros `{ error: { code, message } }`.

## Regras de negócio

- Credenciais válidas = user existe, senha confere (bcrypt) e `phone` digitado == `users.phone`.
- Conta não confirmada → 403 `ACCOUNT_NOT_CONFIRMED`; o fluxo de reenvio é acionado pelo usuário (botão/link na página de erro).
- Ao logar com sucesso: **revogar todas as sessões anteriores** do user (`revoked_at = now()`) e criar a sessão nova — apenas uma sessão válida por pessoa, a última vence.
- Email de nova sessão é enviado após a sessão válida ser criada (e nunca expõe token/senha).
- Reenvio de confirmação: resposta genérica de sucesso mesmo se o email não existir (anti-enumeração); só envia se conta pendente existir.
- Rate limiting básico/login: tentativas inválidas não revelam qual campo falhou (mensagem genérica "invalid credentials"), protegendo contra enumeração de email.

## Dados e integrações

- **POST `/api/v1/auth/sign-in`** — request `{ email, password, phone }`; response 200 `{ user: { id, email, ... }, redirectTo: "/app/home" }`.
- **POST `/api/v1/auth/resend-confirmation`** — request `{ email }`; response 200 genérico.
- **Tabelas**: lê `users` (por email), atualiza `sessions` (revoga anteriores, insere nova), lê/genera `email_confirmation_tokens` no reenvio.
- **Email**: `EmailService.sendNewSessionEmail({ to, at })` e `sendConfirmationEmail` no reenvio.

## UX e estados de interface

- `/auth/sign-in`: campos email, password, phone; botão submit com loading.
- Erro de credenciais → mensagem global genérica ("Invalid email, password or phone").
- Erro de conta não confirmada → mensagem dedicada + botão "Resend confirmation email"; sucesso do reenvio → feedback "Check your inbox".
- Sucesso → navega para `/app/home`. Link para `/auth/forgot-password`.

## Critérios de aceite

- [ ] Login com email+senha+telefone corretos (conta confirmada) retorna 200, cria sessão, revoga sessões anteriores e envia email de nova sessão (provider mockado verificado).
- [ ] Telefone incorreto retorna 400/401 genérico e **não** cria sessão nem revoga nada.
- [ ] Senha incorreta retorna erro genérico (não revela se email existe).
- [ ] Conta não confirmada retorna 403 `ACCOUNT_NOT_CONFIRMED` e não cria sessão.
- [ ] `resend-confirmation` com email pendente reenvia email + gera novo token (anulando o anterior ou coexistindo com validade única por consumo); com email inexistente/confirmado retorna 200 genérico sem enviar.
- [ ] Após login na "máquina B", a sessão da "máquina A" fica `revoked_at` preenchido e o guard da `auth-base` barra A (validado por teste de integração/supertest).
- [ ] Apenas uma sessão válida por usuário após login (consulta a `sessions` confirma 1 ativa).
- [ ] UI: form valida campos; erro de credencial genérico; erro de não-confirmado mostra botão de reenvio com feedback.
- [ ] Supertest/Vitest cobrem: sucesso, telefone errado, senha errada, não confirmado, reenvio, revogação de sessões anteriores.
- [ ] `bun run lint` e `bun run check-types` passam em `@apps/api` e `@apps/app`.

## Decisões técnicas e riscos

- **Confirmação de celular = campo repetido** (não OTP): decisão do breakdown; sem SMS nas primeiras iterações.
- **Política sessão única**: revogar anteriores no sign-in; risco residual de sessão ativa em outra aba contada como revogada — mitigar reavaliando "sessão atual" a cada request via `revoked_at`.
- **Anti-enumeração**: mensagem genérica de credenciais; `resend-confirmation` anônimo. Trade-off: usuário não sabe se digitou email errado — mitigado com UX de "forgot password" abaixo do form.
- **Concordância de email de nova sessão**: se certifique de nunca vazar device/IP em emails para evitar eras de spam.
- **Rollback**: reverter endpoint/página; sessões revogadas não afetam usuários de produção (ainda não há produção).

## Backlog / desejáveis

- Detecção de device/geolocalização no email de nova sessão.
- Rate limiting por IP/email com bloqueio temporário.
- "Log out de todas as outras sessões".

## Q&A registradas

- **"Confirmação de número celular" no sign-in?** R: campo para **repetir o telefone cadastrado** (coincidência obrigatória). OTP/SMS fica no backlog.
- **Conta não confirmada pode logar?** R: **não** — 403 + reenvio de link (`resend-confirmation`).
- **O que acontece com a sessão antiga ao logar de novo?** R: é **revogada** (`revoked_at`); a última sessão criada é a única válida.
- **O email de nova sessão revela o que?** R: apenas avisa que uma nova sessão foi criada (sem credenciais/token).
- **Mensagens de erro quando credenciais erradas?** R: **genérica** ("Invalid email, password or phone") para evitar enumeração.
