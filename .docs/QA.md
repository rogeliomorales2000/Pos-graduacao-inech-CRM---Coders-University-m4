# QA

Portões de qualidade do projeto. **Todo agente que alterar código deve executar os comandos abaixo antes de entregar** a mudança.

## Comandos disponíveis (implementados)

```bash
# Lint (ESLint, --max-warnings 0)
bun run lint

# Corrige lint + formata (ESLint --fix + Prettier --write)
bun run code:fix

# Tipagem (TypeScript 7)
bun run check-types
# alias
bun run types:check

# Formatação (Prettier)
bun run format

# Testes unitário/smoke (Vitest) + Supertest (E2E da API)
bun run test

# Testes E2E (Playwright: cliente + API)
bun run test:e2e
```

## Testes

A suíte de testes está implementada:

- **Vitest** — testes unitários/smoke (`apps/api` — Route Handler; `apps/app` — render do componente).
- **Supertest** — E2E de API sobre o `GET /` real (`apps/api/tests/api.supertest.spec.ts`).
- **Playwright** — E2E de navegador (`e2e/`), sobe `apps/api` (3002) e `apps/app` (5173) automaticamente; requer `bunx playwright install chromium` na primeira execução.

## Regra de uso

- **Toda mudança de código** → rodar `lint` e `check-types` ao menos; `format` antes do commit.
- **Novo padrão de qualidade** → registrar aqui para valer para toda iteracão.
