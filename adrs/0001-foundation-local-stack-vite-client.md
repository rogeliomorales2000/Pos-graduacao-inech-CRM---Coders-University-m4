# ADR 0001 — Fundação: cliente Vite, infra local via Compose e migrações Supabase

- **Data**: 2026-09-16
- **Status**: Aceito
- **Decisores**: donor de produto / dono do repositório
- **Spec**: `./.specs/foundation.md`

## Contexto

A spec de fundação pede dois projetos novos num monorepo já existente (Turborepo + Bun): `@apps/api` (API) e `@apps/app` (cliente). Três pontos precisavam de decisão explícita porque divergiam ou não estavam detalhados na documentação:

1. A arquitetura (`ARCHITECTURE.md`) previa **Next.js para todas as aplicações** e a API dentro de `apps/web` (Route Handlers). A spec pediu cliente em **React + Vite** e um app de API dedicado.
2. A infra local não estava definida: a arquitetura listava Supabase como Alvo, sem definir se `supabase start` ou Docker Compose seria a fonte da verdade.
3. Não existia pipeline de migrações de banco nem testes.

## Decisão

### 1. Cliente em Vite + React (divergência arquitetural assumida)

- Criar `@apps/app` como **React 19 + Vite + TypeScript** (porta 5173), divergindo do "Next para todas as apps".
- Manter `@apps/api` como **Next.js 16** com Route Handler em `GET /` (porta 3002), consistente com a stack de API já prevista na arquitetura.
- `apps/web` e `apps/docs` (starter Turborepo) são **mantidos**.
- Motivadores: a spec é a fonte do requerimento; Vite reduz complexidade do tooling do cliente hoje. Risco mitigado por revisar o `@repo/ui` quando o design system (Tailwind/shadcn) entrar.

### 2. Docker Compose como fonte da infra local

- Um único `docker-compose.yml` na raiz define o ambiente de desenvolvimento:
  - **Banco**: Postgres 15 (porta 54322) — substitui o `supabase start` para o papel de banco local desta fundação.
  - **LGTM**: Loki (3100), Grafana (3005), Tempo (3200/4317/4318) e Mimir (9009).
- `infra:up`/`infra:down` orquestram o compose.

### 3. Migrações via Supabase CLI

- CLI `supabase` como devDependency do root; `supabase init` gera `supabase/config.toml`.
- Migrações versionadas em `supabase/migrations/`; a migration inicial valida o pipeline (sem schema de negócio).
- `db:migrate` = `supabase db push --db-url` contra `postgresql://postgres:postgres@localhost:54322/postgres?sslmode=disable` (override via `DB_URL`).
- Nota CLI: o flag `--db-url` exige `sslmode=disable` para o Postgres local (que não tem TLS).

### 4. Comandos de qualidade

- `code:fix` e `types:check` como **aliases** (respectivamente `lint:fix`+`format` e `check-types`), preservando os comandos atuais.
- Testes: Vitest (smoke) nos dois apps; **Supertest** real contra o servidor Next (`tests/api.supertest.spec.ts`); Playwright (E2E) na raiz com webServers para api e app.

### 5. Escopo de bibliotecas da fundação

- Entram: Vitest, Playwright, Supertest.
- **Não entram** nesta fundação (ficam em backlog): TailwindCSS, shadcn, Tanstack Query/Table, Lefthook, lint-staged, bcrypt, deploy.

### 6. Limpeza de dependências conflitantes

- Verificado ao final: nenhuma dependência do starter entrou em conflito com o plano novo. O único ajuste foi adicionar `@babel/preset-typescript` ao root (resolução do parser do ESLint a partir dos apps) e normalizar permissões dos binários nativos de toolchain (`turbo`, `tsc`) que o `bun install` extraiu sem `+x`.

## Consequências

- `ARCHITECTURE.md`, `DEVELOPMENT.md`, `QA.md` e `DESING_SYSTEM.md` atualizados para refletir o estado implementado (Alvo → Implementado onde aplicável).
- Advantage: ambiente reprodutível de banco + observabilidade em um comando; qualidade de código verificável por 4 portões.
- Trade-off: divergir de "Next-only" cria um custo de contexto (design system compartilhado) que será endereçado quando Tailwind/shadcn entrarem; o Vite client adiciona um runtime de tooling (Node) que o Next também já exigia.
- Próxima iteração sugerida: configurar Tailwind + shadcn apontando para `@repo/ui`, e a primeira migration de schema de negócio real (supabase skill + Postgres best practices).
