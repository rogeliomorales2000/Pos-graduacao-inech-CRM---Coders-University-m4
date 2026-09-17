---
title: Auth base (fundação do domínio de autenticação)
status: rascunho
created: 2026-09-17
updated: 2026-09-17
owner: izanami
type: infra
---

# Auth base

## Resumo

Estabelecer a fundação técnica do domínio de autenticação do produto: schema de `users`/`sessions`/tokens no Postgres local, hash de senhas com bcrypt, abstração de envio de email (`EmailService`: Mailtrap em não-produção, Resend em produção), scaffolding dos endpoints versionados `/api/v1/auth/*`, convenção en-us documentada e o roteamento público/privado do cliente (`/auth/*` público vs `/app/*` privado) com guard de sessão. As features de fluxo (sign-up, sign-in, etc.) constroem sobre esta base.

## Contexto

A spec `foundation` está concluída: o monorepo tem `@apps/api` (Next.js 16, porta 3002, hoje só `GET /` → `{"message":"Hello World"}`), `@apps/app` (React 19 + Vite, porta 5173, hoje só `App.tsx` com `<h1>Intech CRM</h1>`), Postgres local via docker-compose (porta 54322) e o pipeline de migrações Supabase CLI (`db:migrate`) com apenas uma migration inicial.

`ARCHITECTURE.md` marca Supabase (Auth) e Bcrypt como **Alvo** — nada de auth existe ainda. O prompt de autenticação exige comportamento custom (uma sessão válida por pessoa com "última vence", confirmação de celular no login, campos extras nome/telefone, tokens em email) que não se encaixa no supabase-auth pronto. Por decisão registrada no breakdown, a stack é **auth custom + bcrypt** sobre o Postgres local existente; o Supabase entra apenas como banco.

O cliente (`@apps/app`) é Vite + React **sem router** instalado — a fundação de rotas precisa ser criada (nova dependência `react-router-dom`). Não há serviço de email configurado no projeto.

## Necessidade de negócio

Autenticação é o portão de entrada do produto (personas CEO/CMO/CTO, ver `BUSNIESS.md`): sem base de auth, nenhum fluxo de login/cadastro nem telas privadas pode existir. Esta entrega desbloqueia as 5 features de auth (sign-up, confirm-account, sign-in, forgot-password, reset-password) e o princípio "páginas de auth públicas, resto privado".

- Personas afetadas: equipe de desenvolvimento (principal); indiretamente os usuários finais do produto.
- Métrica de sucesso: as features de auth subsequentes são implementáveis sem re-desenhar schema, sessão, email ou roteamento; todas as rotas privadas exigem sessão válida.

## Escopo

- `@apps/api` — schema de auth no Postgres local, biblioteca bcrypt, `EmailService`, scaffolding `/api/v1/auth/*` + helpers de sessão, migração.
- `@apps/app` — router `react-router-dom`, grupos de rota `/auth/*` (público) e `/app/*` (privado) com guard de sessão, página placeholder de home.
- Root/.docs — convenção en-us e versionamento de API documentados (`DEVELOPMENT.md`), dependências novas registradas, ADR.

### Inclui (MVP)

- Migração `supabase/migrations/` criando as tabelas de auth:
  - `users`: `id` (uuid pk), `first_name`, `last_name`, `email` (único), `phone`, `password_hash`, `confirmed_at` (null = não confirmado), `created_at`, `updated_at`.
  - `sessions`: `id` (uuid pk), `user_id` (fk), `token_hash` (único), `expires_at`, `revoked_at` (null = ativa), `created_at`, `last_active_at`.
  - `email_confirmation_tokens`: `id`, `user_id` (fk), `token_hash` (único), `expires_at`, `consumed_at`, `created_at`.
  - `password_reset_tokens`: `id`, `user_id` (fk), `token_hash` (único), `expires_at`, `consumed_at`, `created_at`.
- Instalar `bcrypt` (hash de senhas) e registrar no `package.json` de `@apps/api`.
- `EmailService`: interface com métodos de envio de email de confirmação, reset e nova sessão; implementação `MailtrapEmailProvider` para ambientes não-produção e `ResendEmailProvider` para produção, selecionadas por env (`EMAIL_PROVIDER=mailtrap|resend`, com credenciais em `.env`/`.env.example`). Em dev, os tokens são logáveis/imprimíveis para o fluxo ser validado sem provedor.
- Scaffolding da API versionada: base para handlers sob `/api/v1/auth/*` em `@apps/api/app/api/v1/auth/`, resposta de erro JSON padronizada (`{ error: { code, message } }`), validação de payload de entrada.
- Sessão: helper de criação de sessão (gera token, grava `token_hash`, define cookie httpOnly `session`), leitura da sessão por requisição, revogação de sessões de um usuário (base da regra "uma sessão válida por pessoa").
- Roteamento no cliente: instalar `react-router-dom`; rotas `/auth/*` (sign-in, sign-up, forgot-password, reset-password, confirm-account) públicas e `/app/*` privadas; guard que redireciona não autenticado de `/app/*` para `/auth/sign-in` e autenticado de `/auth/*` para `/app/home`; página placeholder `/app/home`.
- Documentar em `.docs/DEVELOPMENT.md`: convenção **en-us** (páginas, endpoints e código em inglês en-US), versionamento `/api/v1/*`, e como configurar email (Mailtrap/Resend) e credenciais em `.env.example`.
- Registrar ADR em `./adrs/` com: auth custom + bcrypt (não Supabase Auth), tabelas de auth no Postgres local, `EmailService` com Mailtrap/Resend, roteamento `/auth/*` e `/app/*`, dependência `react-router-dom` no cliente.

### Não inclui (fora de escopo)

- Qualquer fluxo de negócio de auth (sign-up, sign-in, confirm-account, forgot-password, reset-password) — são specs separadas que dependem desta.
- Tela de home real com conteúdo de negócio (apenas placeholder).
- Roles/permissões (CEO/CMO/CTO), profiles/edição de dados do usuário.
- Logout (não pedido no prompt; fica no backlog).
- OAuth/social login, MFA, SMS provider.
- Supabase Auth (decisão: auth custom sobre o Postgres local).
- TailwindCSS/shadcn (Alvo; páginas usam estilos mínimos próprios até o design system entrar).
- Deploy/CI, Vercel.

## Requisitos

### Funcionais

- [ ] Como equipe de desenvolvimento, quero um schema de auth versionado, para as features de autenticação persistirem usuarios, sessões e tokens.
- [ ] Como equipe de desenvolvimento, quero senhas hasheadas com bcrypt, para nunca armazenar senha em texto puro.
- [ ] Como equipe de desenvolvimento, quero um `EmailService` com providers Mailtrap (dev) e Resend (prod) selecionáveis por env, para as features de auth mandarem email sem depender de provedor específico.
- [ ] Como usuário, quero que rotas `/auth/*` sejam acessíveis sem sessão (públicas), para entrar nas páginas de login/cadastro.
- [ ] Como usuário, quero que rotas `/app/*` exijam sessão válida (privadas), para que conteúdo interno não seja acessível sem login.
- [ ] Como equipe de desenvolvimento, quero endpoints sob `/api/v1/*`, para versionar a API desde o início.
- [ ] Como equipe de desenvolvimento, quero convenção en-us documentada, para páginas, endpoints e código por toda a plataforma.

### Não-funcionais

- **Segurança**: senha nunca em texto puro (bcrypt); token de sessão guardado como hash no banco; cookie httpOnly para a sessão.
- **Determinismo**: `db:migrate` aplica a migration nova sem quebrar a existente; reexecutar não reaplica.
- **Portabilidade**: `EMAIL_PROVIDER` + credenciais via `.env`; sem credenciais reais no repositório.
- **Consistência**: novo código segue configs compartilhados (`@repo/eslint-config`, `@repo/typescript-config`); en-us em todo texto de UI/API/código.
- **Observabilidade**: erros de email/sessão logados (log padrão/LGTM conforme disponível).

## Regras de negócio

- `email` é único em `users`; colisão na fundação é tratada pelas features (sign-up retorna 409).
- Sessão válida = `revoked_at IS NULL` E `expires_at > now()`.
- Uma sessão por pessoa: na fundação entrega-se o helper de revogar sessões de um usuário; a política "última vence" é aplicada no sign-in (spec `sign-in`).
- Tokens de confirmação/reset são armazenados **hashados** e com `expires_at`; consumidos uma única vez (`consumed_at`).
- Toda resposta de erro da API usa `{ error: { code, message } }`.
- Todo texto exposto (UI, mensagens de erro, email, docs de API) em **en-us**.
- Todo endpoint novo segue o prefixo `/api/v1/*`; auth fica sob `/api/v1/auth/*`.

## Dados e integrações

- **Banco**: Postgres local do docker-compose (porta 54322), via pipeline `db:migrate` (Supabase CLI) existente.
- **Migração**: nova migration em `supabase/migrations/` com as 4 tabelas de auth (`users`, `sessions`, `email_confirmation_tokens`, `password_reset_tokens`), FKs e índices de unicidade (`users.email`, `sessions.token_hash`, tokens `token_hash`).
- **Email**: interface `EmailService` + `MailtrapEmailProvider` (não-prod) e `ResendEmailProvider` (prod). Em dev, implementar fallback que loga o email (com link/token visíveis) para o fluxo ser testável sem provedor.
- **Nova dependência**: `@supabase` não entra; `bcrypt` em `@apps/api`; `react-router-dom` em `@apps/app` (registrar em ADR).
- **Integrações externas**: Mailtrap/Resend com credenciais via `.env` (`.env.example` documenta as vars).

## UX e estados de interface

- Placeholder `/app/home` (privada) e páginas `/auth/*` ainda vazias nesta spec (cada fluxo cria sua página).
- Guard de rota: estado de sessão checado antes de renderizar a rota (loading mínimo enquanto a sessão é verificada); redireciona com clareza (`/app/*` → `/auth/sign-in`; `/auth/*` autenticado → `/app/home`).
- Estilos mínimos próprios (design system/shadcn ainda Alvo). Toda alteração de UI futura exige as skills `frontend-design` e `web-design-guidelines` (ver `AGENTS.md`).

## Critérios de aceite

- [ ] `bun run db:migrate` aplica a migration de auth no banco local sem erro e não quebra migrations anteriores.
- [ ] As tabelas `users`, `sessions`, `email_confirmation_tokens` e `password_reset_tokens` existem no banco com as colunas e restrições definidas (verificado por consulta direta/SQL).
- [ ] `bcrypt` está no `package.json` de `@apps/api` e um hash é gerado/comparado com sucesso em teste unitário.
- [ ] `EmailService` com `EMAIL_PROVIDER=mailtrap` (não-prod) e `resend` (prod) troca de provider pelo env; em dev o fallback loga o email com conteúdo completo; testado por unit test com provider mockado.
- [ ] Existe base de rota `/api/v1/auth` em `@apps/api` respondendo erro JSON padronizado para requisições inválidas (ex.: 404/405 no formato `{ error: { code, message } }`).
- [ ] Helper de sessão cria sessão, lê por cookie httpOnly e revoga sessões de um usuário — coberto por teste unitário/integração.
- [ ] No cliente (`@apps/app`), `/app/home` redireciona para `/auth/sign-in` sem sessão e `/auth/*` redireciona para `/app/home` com sessão (validado por teste de componente/E2E Playwright).
- [ ] `react-router-dom` instalado e configurado em `@apps/app`; rotas `/auth/*` e `/app/*` funcionalmente distintas.
- [ ] `.docs/DEVELOPMENT.md` documenta convenção en-us, versionamento `/api/v1/*` e configuração de email (`EMAIL_PROVIDER`, Mailtrap/Resend, vars em `.env.example`).
- [ ] ADR em `./adrs/` registra as decisões desta spec (auth custom + bcrypt, tabelas de auth, EmailService, roteamento, react-router-dom).
- [ ] `bun run lint` e `bun run check-types` passam em `@apps/api` e `@apps/app`.

## Decisões técnicas e riscos

- **Auth custom + bcrypt (não Supabase Auth)**: decisão do breakdown — requisitos custom (sessão única, confirmação de celular, tokens em email) não encaixam no supabase-auth pronto. Supabase segue como banco apenas. Risco: reimplementar + manter auth; mitigado por escopo pequeno e contratos claros entre specs.
- **Sessões próprias**: cookie httpOnly com `token_hash` (sha-256 do token) no banco; suporta "uma sessão por pessoa" por revogação. Risco de roubo de cookie: mitigar com expiração e `secure` em produção.
- **`react-router-dom` nova dependência no cliente**: não consta em `ARCHITECTURE.md`; registrar ADR. Vite dev precisa de proxy para `/api/v1/*` → `localhost:3002`.
- **Email em dev (Mailtrap ou fallback log)**: fluxo testável sem credenciais reais; Resend entra só em produção.
- **Migração via Supabase CLI aponta para Postgres local**: mesmo pipeline da fundação; sem conflito (Supabase usado como banco puro).
- **Rollback**: reverter a migration/apagar dependências e restaurar docs via git; sem dados de produção.

## Backlog / desejáveis

- Logout (encerrar sessão corrente) — pedido implícito pela política de sessão única; não consta no prompt.
- Revogação de todas as sessões por token de reset (será decisão da spec `reset-password`).
- Roles/permissões (CEO/CMO/CTO).
- Renovação/expiração ativa de sessões (sliding expiration).
- Integração de design system (shadcn/Tailwind) nas páginas de auth quando forem Alvo→Implementado.

## Q&A registradas

- **Stack de auth?** R: **Custom auth + bcrypt** sobre Postgres local; Supabase Auth fica fora (requisitos custom).
- **O que é "confirmação de celular" no sign-in?** R: campo para **repetir o telefone cadastrado** (deve coincidir); sem SMS/OTP (fica no backlog se demandado).
- **Como enviar email?** R: `EmailService` abstrato — **Mailtrap em não-produção, Resend em produção**, selecionados por `EMAIL_PROVIDER`; em dev fallback loga o conteúdo dos emails.
- **Onde ficam as tabelas de auth?** R: no **Postgres local** (mesma base da fundação), novas tabelas criadas por migration `db:migrate`.
- **Roteamento?** R: `/auth/*` **público**, `/app/*` **privado** com guard de sessão; home em `/app/home`.
- **Idioma?** R: **en-us** em páginas, endpoints, mensagens e código; documentado em `DEVELOPMENT.md`.
- **Versionamento de API?** R: `/api/v1/*`, auth sob `/api/v1/auth/*`.
- **Conta não confirmada pode logar?** R: **não** — bloqueia e permite reenviar o link (aplicado na spec `sign-in`).
