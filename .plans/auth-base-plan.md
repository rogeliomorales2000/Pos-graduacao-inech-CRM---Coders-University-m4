# Plano — auth-base (fundação do domínio de autenticação)

## Problema

O produto não tem autenticação. `@apps/api` só responde `GET /` e `@apps/app` só
tem placeholder. Sem schema de auth, hash de senha, envio de email, sessão e
roteamento público/privado, nenhum fluxo de login/cadastro pode existir.

Uma iteração anterior ficou **interrompida com o trabalho já escrito e não
commitado** (lib `auth/*`, migration, endpoints dos fluxos, testes de API). A
árvore de trabalho também contém a UI apenas como placeholder: os formulários de
sign-up, sign-in, confirm-account, forgot-password e reset-password **não
existem**.

## Escopo (aprovado via feature-concept)

Entregar **auth-base + as features de fluxo em uma única iteração** (decisão do
usuário), validar/consertar o que já está escrito, implementar as UIs faltantes
e commitar o módulo inteiro.

- **auth-base**: migration `users`/`sessions`/tokens com FK; `bcrypt`; `EmailService`
  (console/Mailtrap/Resend por env); scaffolding `/api/v1/auth/*` com erro JSON
  `{ error: { code, message, fields } }`; helpers de sessão e cookie httpOnly;
  roteamento `/auth/*` público + `/app/*` privado com guard; docs en-us/versionamento/email; ADR.
- **Fluxos (API + UI)**: sign-up, confirm-account, sign-in (+ resend-confirmation),
  forgot-password, reset-password; endpoints `/me` e `/sign-out` já commitados.
- **Fora de escopo**: OAuth/MFA/SMS/roles, Tailwind/shadcn, deploy, rate limiting robusto.

### Decisões do usuário (Q&A)

- **Fluxos não commitados** → commitar tudo nesta iteração (auth-base + fluxos).
- **UI dos fluxos** → implementar as 5 páginas agora (com `frontend-design` +
  `web-design-guidelines`).
- **Rota de debug `dev-session`** → remover (fora de qualquer spec).
- **Testes** → não adicionar testes novos; confiar na suíte existente
  (`sessions.spec`, rotas, guard). Corrigir artefatos que quebrem a suíte.
- **Rota-base `/api/v1/auth`** → catch-all opcional retornando erro JSON
  padronizado (404) para requisições inválidas.

## Abordagem

1. Revisar/consertar o código não commitado (artefato `user.id/ml` em `sessions.spec.ts`).
2. Remover `dev-session`; adicionar catch-all JSON da base `/api/v1/auth`.
3. Implementar as UIs dos 5 fluxos e integrá-las ao router (`react-router-dom`),
   respeitando acessibilidade (labels, `autocomplete`, `aria-invalid`,
   `aria-live`, foco no primeiro erro, estados idle/loading/error/success).
4. Documentar (`DEVELOPMENT.md`, `ARCHITECTURE.md`), registrar ADR e atualizar
   status das specs/INDEX.
5. Portões de QA: `db:migrate`, `lint`, `check-types`, `format`, `test`.
6. Commit/push via `bun run commit-and-push`.

## Passos

1. Corrigir `sessions.spec.ts`; remover `app/api/v1/auth/dev-session/`.
2. Adicionar `app/api/v1/auth/[[...unknown]]/route.ts` (404 JSON padronizado).
3. `@apps/app`: helpers de API (`signUp`, `signIn`, `resendConfirmation`,
   `confirmAccount`, `forgotPassword`, `resetPassword`) e parser de erro.
4. `@apps/app`: páginas `/auth/sign-up`, `/auth/confirm-account`, `/auth/sign-in`
   (form real), `/auth/forgot-password`, `/auth/reset-password`.
5. `@apps/app`: registrar rotas em `App.tsx` sob `RequirePublic`; estilos de
   formulário em `index.css` (acessíveis, responsivos, `prefers-reduced-motion`).
6. Docs: `DEVELOPMENT.md` (en-us, `/api/v1/*`, email), `ARCHITECTURE.md`
   (bcrypt/auth implementados), ADR `0005`.
7. Atualizar `status` das specs e `INDEX.md`.
8. QA + commit/push + relatório.

## Critérios de aceite (consolidados)

- Migration aplica no banco local sem quebrar; tabelas com colunas/índices/unicidade.
- Senha em bcrypt; tokens hashados (sha-256); cookie httpOnly `session`.
- Sessão: cria, lê por cookie, valida (`revoked_at IS NULL` e `expires_at > now`),
  revoga por usuário ("última vence").
- `EmailService` troca de provider por `EMAIL_PROVIDER`; dev loga o conteúdo.
- API: erros no formato `{ error: { code, message } }`; unknown route sob
  `/api/v1/auth` retorna 404 JSON.
- Fluxos API conforme cada spec (sign-up 201/409/400; confirm-account token;
  sign-in sessão única; forgot genérico; reset revoga sessões).
- UI: `/app/home` sem sessão → `/auth/sign-in`; `/auth/*` autenticado → `/app/home`;
  forms com estados e acessibilidade.
- `lint`, `check-types`, `format`, `test` passam.

## Riscos

- `bcrypt` é módulo nativo (build) — fallback `bcryptjs` (registrar).
- Testes de API exigem Postgres local (docker-compose) de pé.
- Suíte E2E depende de `bunx playwright install chromium`.
