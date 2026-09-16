# ADR 0002 — Commitlint + Conventional Commits via Lefthook

- **Data**: 2026-09-17
- **Status**: Aceito
- **Decisores**: dono do repositório

## Contexto

Não existia controle de qualidade sobre mensagens de commit. O `ARCHITECTURE.md` listava o **Lefthook** como Alvo para hooks de git, sem definir contrato de mensagens nem runner. O repositório ainda não era um repo git (`git init` foi feito nesta iteração).

## Decisão

### 1. Conventional Commits como contrato de mensagens

- Validar mensagens com **commitlint** usando `@commitlint/config-conventional`.
- Tipos permitidos explicitados em `commitlint.config.mjs`: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- Formato: `<type>(escopo?): <descrição>`.

### 2. Lefthook como runner de hooks (implementado agora)

- **Lefthook** (diferente de Husky) por: ser nativo do ecossistema Bun do monorepo, já constar como Alvo na arquitetura e dispensar `husky-init`.
- Único hook ativo: `commit-msg` → `bunx commitlint --edit "$1"`.
- `prepare: lefthook install` no `package.json` re-instala os hooks em qualquer `bun install`.
- `lint-staged` permanece **Alvo** (formatar arquivos em stage), sem escopo no momento.

### 3. Git inicializado

- `git init` executado para os hooks ativarem; o commit inicial da fundação fica por conta do dono do repositório.

## Consequências

- Commits com mensagem fora do padrão são bloqueados pelo hook `commit-msg`.
- Script auxiliar: `bun run commitlint` (CI pode reutilizar com `--from`/`--to`).
- Positivas: histórico consistente (~ facilitate changelog automático); equipa alinhada ao Conventional Commits.
- Trade-off: mensagens como "wip" deixam de ser possíveis (exigência aceita pelo dono).

## Validação

- `echo "mensagem inválida" | bunx commitlint` → falha (exit 1).
- `echo "feat: ..." | bunx commitlint` → passa.
- Commit real com mensagem inválida → hook rejeita e aborta o commit; com mensagem válida → commit criado (teste de hook foi revertido, sem commits residuais no histórico).
