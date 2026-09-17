---
title: Confirm account (confirmação de conta via email)
status: rascunho
created: 2026-09-17
updated: 2026-09-17
owner: izanami
type: feature
---

# Confirm account

## Resumo

Conclui o cadastro: o usuário clica no link do email de confirmação (contendo um token) e é levado à página pública `/auth/confirm-account`. A página valida o token via `POST /api/v1/auth/confirm-account`: confirma a conta (`confirmed_at`), cria uma sessão nova e redireciona a pessoa para a home (`/app/home`). Tokens inválidos/vencidos/consumidos mostram estado de erro com caminho de recuperação.

## Contexto

Depende da `auth-base` (tabelas `users`/`sessions`/`email_confirmation_tokens`, helpers de sessão, roteamento `/auth/*` público) e da `sign-up` (que gera a conta pendente e o token de confirmação). A política da plataforma é "páginas de auth públicas, resto privado" — a home fica em `/app/*` e exige sessão, que esta feature cria na confirmação.

## Necessidade de negócio

Sem confirmação, contas ficam pendentes e sem valor (o sign-in bloqueia usuários não confirmados). Este fluxo converte o cadastro em acesso real à plataforma, cumprindo o requisito de "clicar no link para navegar até a plataforma com uma nova sessão direcionada à home".

- Personas afetadas: novos usuários recém-cadastrados.
- Métrica de sucesso: proporção de links clicados que terminam autenticados na home; zero contas confirmadas por token inválido.

## Escopo

- `@apps/app` — página `/auth/confirm-account` (lê `token` da query string, chama a API, redireciona para `/app/home` em sucesso; estados de erro).
- `@apps/api` — endpoint `POST /api/v1/auth/confirm-account` (valida token, confirma conta, cria sessão, marca token consumido).

### Inclui (MVP)

- Página `/auth/confirm-account?token=...` pública que dispara a confirmação no load (sem ação manual) e, em sucesso, redireciona para `/app/home`.
- `POST /api/v1/auth/confirm-account` `{ token }`: busca token hashado, valida (existe, não consumido, não expirado), confirma a conta (`confirmed_at = now()`), marca `consumed_at`, cria sessão e seta o cookie httpOnly (`session`).
- Estados de erro: token inválido, expirado ou já consumido → mensagem clara + link para `/auth/sign-in` (e, se aplicável, para reenviar email de confirmação via `sign-in`).
- Conta que já estava confirmada e usa um token novo → tratar com segurança (token consumível e sessão criada, ou erro controlado — safe default: token consumido só se válido; conta já confirmada não regressa ao estado pendente).

### Não inclui (fora de escopo)

- Redirecionamento/email de "já confirmado" com reenvio automático (hoje instrui ir para sign-in).
- Crítica de senha/força de senha.
- Reenvio de email — pertence ao `sign-in`.
- Logout, MFA, OAuth.

## Requisitos

### Funcionais

- [ ] Como usuário que recebeu o link de confirmação, quero clicar no link e ser autenticado automaticamente, para entrar na plataforma sem logar novamente.
- [ ] Como usuário, quero ser levado à home (`/app/home`) após confirmação, para começar a usar o produto.
- [ ] Como usuário, quero ver erro claro se o token for inválido, expirado ou já usado, para saber como recuperar (ir para sign-in).

### Não-funcionais

- **Segurança**: token nunca logado em claro; única iteração por token (`consumed_at`); criação de sessão exige token válido; cookie httpOnly.
- **Idempotência parcial**: token expirado/inválido nunca confirma conta nem cria sessão.
- **Consistência**: textos en-us; erros `{ error: { code, message } }`.
- **Responsividade e acessibilidade**: a página não exige formulário; garantir foco/aria adequados nos estados de erro/loading.

## Regras de negócio

- Um token de confirmação é válido se: existe, `consumed_at IS NULL` e `expires_at > now()`.
- Consumo: marcar `consumed_at` **antes** de criar sessão (atomicidade: token de uso único).
- Uma conta só fica `confirmed_at IS NOT NULL` uma vez; token não "reabre" uma conta já confirmada.
- Sessão criada na confirmação segue a política de sessão única da plataforma (em caso de sessão anterior do mesmo user, a nova é a válida — aplicado via helpers da `auth-base`/`sign-in`).
- Sucesso → cliente redireciona para `/app/home`.

## Dados e integrações

- **POST `/api/v1/auth/confirm-account`** — request: `{ token }`; response 200: `{ user: { id, email, confirmed_at }, redirectTo: "/app/home" }`.
- **Tabelas**: consulta `email_confirmation_tokens` por `token_hash` (hash do token recebido); atualiza `users.confirmed_at`, `email_confirmation_tokens.consumed_at`; insere `sessions` e seta cookie.
- **Integrações**: nenhuma externa nova (email já enviado no sign-up).

## UX e estados de interface

- Ao abrir `/auth/confirm-account?token=...`: estado loading (confirmando...) → sucesso (redireciona para `/app/home`) ou erro (mensagem + botão/link para `/auth/sign-in`).
- Sem token na URL ou token vazio → estado de erro "invalid link".
- Página pública; após sucesso a sessão existe → guard da `auth-base` deixa acessar `/app/*`.

## Critérios de aceite

- [ ] `POST /api/v1/auth/confirm-account` com token válido de um user pendente: confirma a conta (`confirmed_at` preenchido), marca o token consumido, cria sessão com cookie httpOnly e retorna 200 com `redirectTo`.
- [ ] O cliente, em sucesso, redireciona o usuário para `/app/home` autenticado (guard não redireciona de volta).
- [ ] Usar o mesmo token duas vezes: segunda chamada retorna erro (`TOKEN_ALREADY_USED` / 400) e não cria nova sessão.
- [ ] Token expirado retorna erro (`TOKEN_EXPIRED`) e **não** confirma conta nem cria sessão.
- [ ] Token inexistente/inválido retorna erro (`INVALID_TOKEN`).
- [ ] Conta já confirmada com token ainda válido: não regressa a pendente; comportamento definido (safe default: erro controlado ou confirmação idempotente sem criar segunda sessão para o mesmo user) coberto por teste.
- [ ] UI: página sem token mostra "invalid link"; com token válido redireciona; falha mostra mensagem + link para `/auth/sign-in`.
- [ ] Supertest/Vitest cobrem os cenários de token válido, consumido, expirado e inválido.
- [ ] `bun run lint` e `bun run check-types` passam em `@apps/api` e `@apps/app`.

## Decisões técnicas e riscos

- **Token em query string**: simples de clicar; risco de log/referrer — token de vida curta (safe default 24h, herdado do sign-up) e não logado em claro.
- **Confirmar "on load" sem botão**: UX de link direto (padrão de email confirmation); o estado de erro cobre falhas.
- **Atomicidade do consumo**: marcar consumido no mesmo fluxo da criação de sessão para tornar o token de uso único de verdade; usar transação se disponível (Postgres local).
- **Rollback**: apagar endpoint/página; tokens órfãos inócuos.

## Backlog / desejáveis

- "Já confirmado" → redirecionar direto para sign-in com mensagem de sucesso.
- Enriquecer email de confirmação com nome do usuário.
- Renovar token expirado automaticamente.

## Q&A registradas

- **Confirmação exige botão manual ou automática no load?** R: **automática no load** — o link é a ação (padrão de email confirmation).
- **Token já usado?** R: erro `TOKEN_ALREADY_USED`, nunca cria sessão; usuário vai para sign-in.
- **Conta já confirmada com token válido?** R: safe default **erro controlado sem criar nova sessão para o mesmo user** (comportamento coberto por teste na implementação).
- **Sessão da confirmação respeita sessão única?** R: sim — a política de "sessão válida por pessoa" da plataforma se aplica também aqui (helpers da `auth-base`).
