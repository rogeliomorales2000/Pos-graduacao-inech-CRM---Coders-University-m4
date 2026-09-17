---
title: Sign-up (cadastro de conta)
status: rascunho
created: 2026-09-17
updated: 2026-09-17
owner: izanami
type: feature
---

# Sign-up

## Resumo

Página pública `/auth/sign-up` onde o usuário cria sua conta informando nome, sobrenome, email, senha, confirmação de senha e telefone. Valida o form (com match obrigatório entre senha e confirmação), cria a conta como **pendente** (não confirmada) via `POST /api/v1/auth/sign-up` e envia um email de confirmação com link contendo um token. A conta só libera acesso após a confirmação (spec `confirm-account`).

## Contexto

A base de auth (`auth-base`) fornece: tabelas `users` (+ `email_confirmation_tokens`), bcrypt, `EmailService` (Mailtrap dev / Resend prod), endpoints sob `/api/v1/auth/*` e roteamento `/auth/*` público. Esta feature é a primeira a consumir essa base. Não há design system ainda (shadcn é Alvo) — a página usa estilos mínimos próprios.

O prompt exige: cadastro com nome, sobrenome, email, senha, telefone e confirmação de senha; as duas senhas devem dar match; ao final, um email de confirmação de conta com link/token para confirmar e navegar até a plataforma.

## Necessidade de negócio

É o ponto de entrada de novos usuários da plataforma (CEO/CMO/CTO). Sem cadastro não há base de contas para nenhum fluxo posterior.

- Personas afetadas: novos usuários finais.
- Métrica de sucesso: usuário consegue cadastrar e recebe o email de confirmação com link válido; contas duplicadas são rejeitadas.

## Escopo

- `@apps/app` — página `/auth/sign-up` (form + estados), chamada à API de sign-up.
- `@apps/api` — endpoint `POST /api/v1/auth/sign-up` (validação, criação do user pendente, geração do token de confirmação, envio de email).

### Inclui (MVP)

- Form de sign-up com campos: first name, last name, email, phone, password, confirm password.
- Validação client e server: campos obrigatórios, email válido, senha com tamanho mínimo (8), **senha == confirmação**.
- `POST /api/v1/auth/sign-up`: cria `users` com `password_hash` (bcrypt) e `confirmed_at = NULL` (pendente), gera token de confirmação armazenado em `email_confirmation_tokens` (hash + expiração), envia email de confirmação via `EmailService` com link `{APP_URL}/auth/confirm-account?token=...`.
- Resposta 201 com sucesso; página mostra estado de sucesso ("check your email").
- Erros mapeados: 409 email já cadastrado; 400 validação (com mensagens en-us por campo).
- Anti-enumeração do fluxo: o endpoint **não** informa publicamente quando o email já existe no caso de sucesso (resposta genérica); o 409 é aceito apenas para reenvio explícito? — ver Q&A (safe default: retornar 409 em cadastro duplicado é aceitável porque o usuário é dono do email que está digitando).

### Não inclui (fora de escopo)

- Confirmação de conta / criação de sessão (spec `confirm-account`).
- Logar após cadastro (spec `sign-in`).
- Reenvio de email de confirmação (em `sign-in`, quando conta não confirmada tentar logar).
- OAuth/social, edição de perfil, roles.
- Reset/forgot password (specs próprias).

## Requisitos

### Funcionais

- [ ] Como novo usuário, quero preencher nome, sobrenome, email, telefone, senha e confirmação de senha, para criar minha conta.
- [ ] Como novo usuário, quero que as duas senhas tenham que coincidir, para evitar erro de digitação na senha.
- [ ] Como novo usuário, quero receber um email de confirmação com link/token após cadastrar, para confirmar minha conta.
- [ ] Como novo usuário, quero ver mensagem de erro clara se o email já estiver cadastrado ou os dados forem inválidos.

### Não-funcionais

- **Segurança**: senha hasheada (bcrypt) antes de persistir; token de confirmação hashado no banco; validação server-side (client-side não é autoridade).
- **Acessibilidade**: labels associados, navegação por teclado, mensagens de erro anunciadas (roles/aria), conforme `DESING.md` e `web-design-guidelines`.
- **Responsividade**: form funciona em mobile/tablet/desktop.
- **Consistência**: todo texto em en-us; erros no formato `{ error: { code, message } }`.

## Regras de negócio

- Campos obrigatórios: first name, last name, email, phone, password, confirm password.
- `email` deve ser único em `users`; duplicado → 409 (`EMAIL_ALREADY_REGISTERED`).
- `password` mínimo 8 caracteres e deve ser igual a `confirm_password`; divergência → 400 (`PASSWORD_MISMATCH`) pontuando o campo de confirmação.
- Conta criada sempre como **não confirmada** (`confirmed_at = NULL`).
- Token de confirmação: gerado por usuário, armazenado hashado (sha-256 do token), expira em N horas (safe default 24h), consumido em `confirm-account`.
- O email de confirmação é enviado **somente** após o user ser persistido com sucesso.

## Dados e integrações

- **POST `/api/v1/auth/sign-up`** — request: `{ first_name, last_name, email, phone, password, confirm_password }`; response 201: `{ user: { id, email, ... } }` (sem senha).
- **Tabelas (da base `auth-base`)**: insere em `users` e `email_confirmation_tokens`.
- **Email**: `EmailService.sendConfirmationEmail({ to, confirmationLink })` — template en-us; em dev (Mailtrap/fallback log) o token/link ficam visíveis para teste.
- **Nova dependência**: nenhuma além das já previstas na `auth-base`.

## UX e estados de interface

- Fluxo: `/auth/sign-up` → submit → loading no botão → sucesso (tela "check your email" com link para sign-in) ou erro (mensagem por campo / global).
- Estados: idle, loading, error (por campo e global), success.
- Navegação: link para `/auth/sign-in` (já tenho conta).
- Página pública (sem auth) já garantida pelo roteamento da `auth-base`.

## Critérios de aceite

- [ ] `POST /api/v1/auth/sign-up` com payload válido retorna 201, cria user com `password_hash` (bcrypt, não texto puro) e `confirmed_at = NULL`, cria token em `email_confirmation_tokens` (armazenado hashado) e envia email de confirmação (verificado via provider mockado/fallback log).
- [ ] Payload com `password != confirm_password` retorna 400 `PASSWORD_MISMATCH`.
- [ ] Payload com email já cadastrado retorna 409 `EMAIL_ALREADY_REGISTERED`.
- [ ] Payload com senha < 8 caracteres ou email inválido retorna 400 com mensagem en-us.
- [ ] O link do email aponta para `{APP_URL}/auth/confirm-account?token=<token>` e o token é consumível por `confirm-account` (teste de integração entre as duas specs na implementação).
- [ ] Na UI, form valida os mesmos campos; senha != confirmação mostra erro no campo de confirmação; sucesso mostra estado "check your email".
- [ ] Acessibilidade: foco e `aria` nas mensagens de erro; navegação por tab cobre todos os campos (revisado com `web-design-guidelines`).
- [ ] `bun run lint` e `bun run check-types` passam em `@apps/api` e `@apps/app`; testes Vitest/Supertest do endpoint cobrem os cenários acima.

## Decisões técnicas e riscos

- **Validação client + server**: client para UX, server como autoridade; nunca confiar só no client.
- **Enumeração de emails**: retornar 409 no cadastro duplicado expõe que o email existe. Decisão registrada em Q&A (aceitável no cadastro, pois o usuário digita o próprio email; o `forgot-password` terá máscara total).
- **Token em query string do link**: padrão simples e clicável; risco de vazamento em log/referrer — mitigar aceitando expiração curta e não logando o token.
- **Rollback**: deletar endpoint + página; dados não confirmados são inócuos (sem sessão possível sem confirmação).

## Backlog / desejáveis

- Reenvio de email de confirmação diretamente nesta página (hoje em `sign-in`).
- Validação de formato de telefone (hoje só obrigatório).
- Política de força de senha (complexidade) — hoje só mínimo de 8.

## Q&A registradas

- **Cadastro duplicado deve expor "email já existe"?** R: **sim — 409**, aceito porque o usuário digita o próprio email; o anonimato total fica nos fluxos em que o email é digitado por terceiros (ex.: forgot-password).
- **Conta criada confirmada ou pendente?** R: **pendente** (`confirmed_at = NULL`); propósita que confirmação é etapa obrigatória (`confirm-account`).
- **Expiração do token de confirmação?** R: safe default **24h**.
- **Tamanho mínimo de senha?** R: safe default **8 caracteres**.
- **Tradução/idioma?** R: **en-us** em UI, mensagens de erro e email.
