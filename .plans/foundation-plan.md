# Plano — foundation.md

Spec: `./.specs/foundation.md` (refinada, status `pronto`, aprovada pelo dono).

## Problema

O monorepo tem apenas os apps starter `web`/`docs`. Não existe base de API (`@apps/api`), cliente (`@apps/app`), testes, nem infra local de banco/observabilidade. Sem isso, features reais não podem começar.

## Abordagem

Criar a fundação como setup de infra/tooling, sem features de negócio:

1. **`@apps/api`** — Next.js 16: Route Handler `GET /` -> `{"message":"Hello World"}` (200, `application/json`). Porta 3002.
2. **`@apps/app`** — Vite + React 19 + TS: página estática com `<h1>Hello World</h1>`. Porta 5173 (Vite default).
3. **Root tooling** — scripts novos (`code:fix`, `types:check`, `test`, `test:e2e`, `infra:up`, `infra:down`, `db:migrate`) mantendo os atuais; turbo tasks para `test`/`lint:fix`.
4. **Testes** — Vitest (smoke unit em api e app), Supertest (E2E `GET /` da API via custom server do Next), Playwright (E2E do cliente + checagem da API).
5. **Infra** — `docker-compose.yml` único: Supabase Postgres (porta 54322) + LGTM (Loki 3100, Grafana 3005, Tempo 3200/4317, Mimir 9009).
6. **Migrações** — Supabase CLI (devDependency), `supabase init` (config.toml), migration inicial em `supabase/migrations/`; `db:migrate` roda `supabase db push` contra a URL local de `DATABASE_URL` (default `postgresql://postgres:postgres@localhost:54322/postgres`).
7. **Docs/ADR** — atualizar `ARCHITECTURE.md`, `DEVELOPMENT.md`, `QA.md`, `DESING_SYSTEM.md`; ADR em `./adrs/0001-foundation-...md`.
8. **Limpeza de conflitos** — nenhuma lib do starter conflita (verificado); documentado no ADR.

## Passos

- [x] Instalar deps de tooling no root: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/dom`, `@playwright/test`, `supabase`.
- [x] Incluir `.turbo` tasks `test` e `lint:fix` (packages com script).
- [x] Criar `apps/api` (Next, route handler, eslint/tsconfig, vitest smoke + supertest).
- [x] Criar `apps/app` (Vite, React, lint/tsconfig/eslint, vitest smoke com testing-library).
- [x] Root scripts novos + `playwright.config.ts` + specs em `e2e/`.
- [x] `docker-compose.yml` + `infra/` (loki.yml, tempo.yml, mimir.yml, grafana provisioning).
- [x] `supabase init` + `supabase migration new` -> migration inicial; `db:migrate` funcionando contra o Postgres do compose.
- [x] Atualizar docs + ADR.
- [x] QA: `bun run code:fix`, `bun run lint`, `bun run check-types`, `bun run test`, `bun run test:e2e`.

## Critérios de aceite (da spec `foundation.md`)

Idem seção "Critérios de aceite" da spec — os 11 itens.

## Q&As da feature-concept (fechadas na spec refinada)

1. Manter `web`/`docs`, criar `api`+`app`.
2. Cliente em **Vite + React** (divergência arquitetural registrada via ADR).
3. Libs na fundação: **Vitest + Playwright + Supertest** apenas.
4. `code:fix`/`types:check` como **aliases** dos comandos atuais.
5. **docker-compose único** (Supabase DB + LGTM) como fonte da infra.
6. `db:migrate` = setup das migrações Supabase (CLI + pasta + migration inicial).
7. Portas: api=3002, app=5173, Grafana=3005.
8. Critério "remover conflitantes" = limpar deps que o plano novo torne obsoletas (verificado: nenhuma).
