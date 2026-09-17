# Desenvolvimento

Convenções e referências para trabalhar neste repositório. Leia antes de codar qualquer tarefa.

## Comandos essenciais

O projeto usa **Bun** como package manager e **Turborepo** para orquestrar tarefas no monorepo.

```bash
# Desenvolvimento (inicia todos os apps via turbo)
bun run dev

# Build de produção
bun run build

# Lint (ESLint, turbo executa em todos os packages)
bun run lint

# Corrige lint + formata (ESLint --fix + Prettier --write)
bun run code:fix

# Tipagem (turbo executa check-types em todos os packages)
bun run check-types
# alias
bun run types:check

# Formatação (Prettier em todo o repo)
bun run format

# Testes unitários/smoke + Supertest (Vitest)
bun run test

# Testes E2E (Playwright: cliente + API)
bun run test:e2e

# Infra local (Docker Compose: Supabase DB + LGTM)
bun run infra:up
bun run infra:down

# Aplica migrações no banco local (Supabase CLI, pasta supabase/migrations)
bun run db:migrate
```

## Portas

| App         | Porta |
| ----------- | ----- |
| `apps/web`  | 3000  |
| `apps/docs` | 3001  |
| `apps/api`  | 3002  |
| `apps/app`  | 5173  |

## Infra local (Docker Compose)

O `docker-compose.yml` na raiz sobe o banco de desenvolvimento e a stack de observabilidade:

| Serviço   | Porta(s)               | Papel                               |
| --------- | ---------------------- | ----------------------------------- |
| `db`      | `54322 -> 5432`        | Postgres (banco de desenvolvimento) |
| `loki`    | `3100`                 | Logs (LGTM)                         |
| `tempo`   | `3200`, `4317`, `4318` | Traces (LGTM)                       |
| `mimir`   | `9009`                 | Métricas (LGTM)                     |
| `grafana` | `3005`                 | Dashboard unificado (admin/admin)   |

- `bun run infra:up` sobe tudo; `bun run infra:down` derruba.
- Banco local ao qual `db:migrate` aponta por padrão: `postgresql://postgres:postgres@localhost:54322/postgres` (override via env `DB_URL`).
- Migrações ficam em `supabase/migrations/`; crie novas com `bunx supabase migration new <nome>`.

## Estrutura do monorepo

- `apps/web` — aplicação principal Next.js 16
- `apps/docs` — segunda aplicação Next.js 16
- `apps/api` — API Next.js 16 (Route Handler em `GET /` retorna JSON helloworld)
- `apps/app` — cliente React 19 + Vite
- `packages/ui` — componentes React compartilhados (`@repo/ui`)
- `packages/eslint-config` — configurações ESLint flat (`@repo/eslint-config`)
- `packages/typescript-config` — tsconfigs compartilhados (`@repo/typescript-config`)
- `.docs` — documentação do projeto

## Convenções do produto

### Idioma (en-us)

- Todo texto **exposto** é escrito em **en-us** (inglês en-US): páginas, mensagens
  de erro, emails, documentação de API, nomes de endpoints e de campos.
- Código (identificadores, tipos, comentários) e mensagens de commit seguem en-us.
- Rotas de auth são **públicas** (`/auth/*`); o restante é **privado** (`/app/*`)
  e exige sessão válida (guard do cliente).

### Versionamento de API

- Todo endpoint novo vive sob **`/api/v1/*`**; autenticação sob `/api/v1/auth/*`.
- Erros seguem `{ error: { code, message, fields? } }` (ex.: `VALIDATION_ERROR`
  com `fields`, `EMAIL_ALREADY_REGISTERED`, `INVALID_CREDENTIALS`).
- Endpoints de auth atuais: `POST /api/v1/auth/sign-up`,
  `/confirm-account`, `/sign-in`, `/resend-confirmation`, `/forgot-password`,
  `/reset-password`; `GET /api/v1/auth/me`; `POST /api/v1/auth/sign-out`.
- Sub-rotas inexistentes sob `/api/v1/auth` respondem 404 JSON no mesmo formato.

## Email (auth)

- Provider selecionado por **`EMAIL_PROVIDER`**:
  - `console` — default em dev; loga o conteúdo do email (token/link visíveis)
    para validar o fluxo sem credenciais.
  - `mailtrap` — ambientes **não-produção**; requer `MAILTRAP_API_TOKEN`.
  - `resend` — **produção**; requer `RESEND_API_KEY` (default em produção).
- `APP_URL` monta os links de confirmação/reset (default `http://localhost:5173`);
  `EMAIL_FROM` define o remetente.
- Credenciais **só via `.env`** (nunca no repositório); `.env.example` lista as
  variáveis (`EMAIL_PROVIDER`, `MAILTRAP_API_TOKEN`, `RESEND_API_KEY`,
  `EMAIL_FROM`, `APP_URL`, `DB_URL`).

## Workflow de código

### Convenção de commits

- Mensagens de commit seguem **Conventional Commits**: `<type>(escopo?): <descrição>`.
- Tipos permitidos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- Contrato em `commitlint.config.mjs`; validado automaticamente pelo hook `commit-msg` (Lefthook).
- Para conferir manualmente: `bun run commitlint --edit <arquivo>` ou `echo "<mensagem>" | bun run commitlint`.

### Commit e push ao final de cada iteração

- `bun run commit-and-push` analisa as mudanças pendentes (`git status`), gera mensagem **Conventional Commits**, executa `git add -A`, cria o commit com o co-author **Joaldo Lima** e faz `git push`.
- Flags: `--message "<header>"` (define a mensagem manualmente) e `--no-push` (apenas commit).
- Configuração do co-author via env: `GIT_COAUTHOR_NAME` / `GIT_COAUTHOR_EMAIL`.

### Antes de codar

1. Leia `AGENTS.md` e entenda a tarefa.
2. Se houver skill relevante, carregue-a.
3. Monte um plano e salve em `./.plans/[spec]-plan.md` (ver `RULES.md`).

### Durante o desenvolvimento

- Siga convenções existentes do código ao redor.
- Prefira reutilizar componentes do `@repo/ui`.
- Valide no navegador e rode `bun run lint` antes de commitar.

### Após finalizar

1. Execute os portões de QA (ver `QA.md`).
2. Siga o checklist de fim de iteração em `RULES.md`.

## Ferramentas planejadas (a instalar conforme demanda)

- **lint-staged**: hooks de git para lint/formatação em stage.
- **TailwindCSS + shadcn**: design system (ver `DESING_SYSTEM.md`).
