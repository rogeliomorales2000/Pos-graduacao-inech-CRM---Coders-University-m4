# Arquitetura

Este documento descreve a arquitetura do projeto em **duas camadas**:

- **Implementado**: o que está de fato no repositório e pode ser verificado.
- **Alvo / Planejado**: o que está planejado mas **ainda não foi implementado**.

> Regra: nenhum agente deve assumir que um item "Alvo" já existe. Marcos claros: um item só é movido para "Implementado" quando sua dependência estiver no `package.json` e em uso.

## Estado atual (implementado)

### Monorepo

- **Turborepo** monorepo, package manager **Bun**.
- Root scripts (via `turbo`): `build`, `dev`, `lint`, `check-types`, `format`, `test`, `test:e2e`, `code:fix`, `types:check`.
- **Qualidade de código:** ESLint 10 + Prettier 3 + TypeScript 7.
- **Testes:** Vitest (unit/smoke), Playwright (E2E) e Supertest (E2E de API) implementados.

### Estrutura de diretórios

```
coder-university-m4/
├── apps/
│   ├── web/     # Next.js 16 — porta 3000
│   ├── docs/    # Next.js 16 — porta 3001
│   ├── api/     # Next.js 16 (API) — porta 3002
│   └── app/     # React 19 + Vite (cliente) — porta 5173
├── packages/
│   ├── ui/                  # @repo/ui — componentes React 19
│   ├── eslint-config/       # @repo/eslint-config — configs flat (base, next, react-internal)
│   └── typescript-config/   # @repo/typescript-config — tsconfigs compartilhados
├── .docs/       # Documentação do projeto
└── turbo.json
```

### Stack front-end

| Ferramenta     | Status       | Papel                                         |
| -------------- | ------------ | --------------------------------------------- |
| Next.js 16     | Implementado | Aplicações web e API (`web`/`docs`/`api`)     |
| React 19       | Implementado | Criação de UIs                                |
| Vite           | Implementado | Build do cliente `@apps/app` (ver ADR `0001`) |
| TypeScript 7   | Implementado | Tipagem                                       |
| TailwindCSS    | **Alvo**     | Estilização / CSS                             |
| shadcn         | **Alvo**     | Design system (ver `DESING_SYSTEM.md`)        |
| Tanstack Query | **Alvo**     | Queries e mutations                           |
| Tanstack Table | **Alvo**     | Tabelas                                       |

### Stack back-end

| Ferramenta     | Status       | Papel                                              |
| -------------- | ------------ | -------------------------------------------------- |
| Next.js 16     | Implementado | Criação de API (Route Handlers / Server Actions)   |
| Supabase       | **Alvo**     | Autenticação + Banco de Dados + Storage            |
| Postgres local | Implementado | Banco de dados de desenvolvimento (Docker Compose) |
| Bcrypt         | **Alvo**     | Hash de senhas                                     |
| TypeScript 7   | Implementado | Tipagem                                            |

### Qualidade e testes

| Ferramenta | Status       | Papel                            |
| ---------- | ------------ | -------------------------------- |
| Vitest     | Implementado | Testes unitários e de integração |
| Playwright | Implementado | Testes E2E                       |
| Supertest  | Implementado | Testes E2E de API                |
| Commitlint | Implementado | Lint das mensagens de commit     |

### Infraestrutura

| Item                 | Status       | Papel                                               |
| -------------------- | ------------ | --------------------------------------------------- |
| Vercel               | **Alvo**     | Deploy da aplicação                                 |
| Supabase (Auth)      | **Alvo**     | Autenticação                                        |
| Supabase (Storage)   | **Alvo**     | Armazenamento de arquivos                           |
| PostgreSQL local     | Implementado | Banco de dados local (Docker Compose)               |
| LGTM (Grafana Stack) | Implementado | Observabilidade local (Loki, Grafana, Tempo, Mimir) |
| Lefthook             | Implementado | Scripts em hooks do git (commit-msg: commitlint)    |
| lint-staged          | **Alvo**     | Formatação de arquivos em `git add`                 |

## Ferramentas de qualidade atuais (verificáveis)

- **Lint**: `bun run lint` (ESLint via turbo, `--max-warnings 0`)
- **Formatação**: `bun run format` (Prettier) — `bun run code:fix` aplica `eslint --fix` + Prettier
- **Tipagem**: `bun run check-types` / `bun run types:check` (TypeScript 7)
- **Testes**: `bun run test` (Vitest: smoke unit + Supertest de API), `bun run test:e2e` (Playwright)
- **Mensagens de commit**: `bun run commitlint` (Conventional Commits via hook `commit-msg` do Lefthook)
- **Infra local**: `bun run infra:up` / `bun run infra:down` (Docker Compose), `bun run db:migrate` (Supabase CLI)

> Os itens "Alvo" formam o roadmap de arquitetura. Implemente-os apenas quando houver demanda e registre a decisão em um ADR (ver `RULES.md`).
