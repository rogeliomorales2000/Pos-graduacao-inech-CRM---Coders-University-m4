# ADR 0003 — Comando `commit-and-push` e co-author Joaldo Lima

- **Data**: 2026-09-17
- **Status**: Aceito
- **Decisores**: dono do repositório

## Contexto

O commit de cada iteração era manual: analisar `git status`, montar mensagem, `git add`, `git commit` e `git push`. Isso não escalava com o fluxo de execução de specs da skill `implement-me`, que precisa encerrar cada iteração com commit e push padronizados.

## Decisão

### 1. Script `bun run commit-and-push`

- Script em `scripts/commit-and-push.mjs` (Bun) parametrizado pelo root `package.json`.
- Fluxo: lê `git status --porcelain=v1 -uall`, classifica os arquivos, gera mensagem **Conventional Commits**, valida com `commitlint`, executa `git add -A`, commita e faz `git push`.
- Flags: `--message "<header>"` (mensagem manual) e `--no-push`.
- Co-author via env: `GIT_COAUTHOR_NAME` (default `Joaldo Lima`) e `GIT_COAUTHOR_EMAIL` (default `jasmon.rogelio@uni9.edu.br`).

### 2. Heurística de mensagem

- Tipo derivado das categorias presentes: código/migração → `feat`; só teste → `test`; só docs/spec → `docs`; só config → `chore`.
- Escopo prioriza apps/packages (`api`, `app`, `web`, `docs`, `ui`) e ignora diretórios-ponto e arquivos de raiz.
- Corpo lista os arquivos por status e recebe o trailer `Co-authored-by`.
- Linhas do corpo são prefixadas com `-` e quebradas em 100 caracteres para respeitar `body-max-line-length`/`footer-max-line-length` do commitlint.

### 3. Uso no encerramento de specs

- `RULES.md` e a skill `implement-me` passam a exigir `bun run commit-and-push` ao final de cada iteração.
- Se o push falhar (ex.: token sem permissão), o commit fica local e o erro é reportado.

## Consequências

- Encerramento de spec passa a ser um único comando, com mensagem consistente e co-author garantido.
- Positivas: menos passos manuais, mensagem sempre aderente ao commitlint, histórico uniforme.
- Trade-offs: a heurística não entende a semântica da mudança (mensagem genérica quando não há palavra-chave conhecida) — mitigado pela flag `--message`.
- Push via HTTPS usa o remote configurado em `.git/config` (token embutido localmente; nunca versionado).

## Validação

- Execução real criou o commit `feat(api, app): configura lint de mensagens de commit` com trailer `Co-authored-by: Joaldo Lima <...>`.
- push → **403**: token fine-grained sem permissão de escrita no repositório (ação pendente do dono no GitHub).
