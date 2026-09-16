---
title: Fundação (base dos projetos api e app)
status: pronto
created: 2026-09-16
updated: 2026-09-16
owner: izanami
type: infra
---

# Fundação

## Resumo

Preparar a base de desenvolvimento dos dois projetos do monorepo: `@apps/api` (Novo projeto em Next.js, servirá como API) e `@apps/app` (Novo projeto em React.js com Vite, servirá como cliente). A entrega configura tooling de qualidade (lint, tipagem, testes), comandos de infraestrutura local (`infra:up`/`infra:down`/`db:migrate`) com Supabase + stack LGTM via `docker-compose.yml`, e instala as bibliotecas de teste planejadas na arquitetura (Vitest, Playwright, Supertest). Ao final, o repositório fica pronto para iniciar a implementação de features reais.

## Contexto

O monorepo já existe (Turborepo + Bun) com os apps starter `apps/web` (Next 16, porta 3000) e `apps/docs` (Next 16, porta 3001), além dos packages `@repo/ui`, `@repo/eslint-config` e `@repo/typescript-config`. ESLint 10, Prettier 3 e TypeScript 7 já estão implementados, mas **não há testes configurados** nem infraestrutura local de banco/observabilidade.

A arquitetura (`ARCHITECTURE.md`) marca como **Alvo** as ferramentas que esta fundação vai implementar: Vitest, Playwright, Supertest, Supabase (banco local) e observabilidade. O front-end/design system (TailwindCSS, shadcn, Tanstack) continua Alvo e fica fora desta entrega. A spec original pedia um cliente em **React + Vite**, decisão assumida aqui mesmo divergindo da arquitetura atual (que lista Next.js para todas as apps) — a divergência será resolvida com ADR e atualização dos docs (ver Q&A).

## Necessidade de negócio

Desbloquear a fase **Fundação** (ver `izanami.md`): sem base de API, cliente, testes e infra local, nenhuma feature real (autenticação Supabase, conectores, experts) pode começar. Entrega valor para a equipe de desenvolvimento criar features com segurança: todo código novo já nasce com lint, tipagem, testes e ambiente local reprodutível.

- Personas afetadas: equipe de desenvolvimento (principal); indiretamente CEO/CMO/CTO (produto).
- Métrica de sucesso: todo novo PR roda `lint`, `check-types` e `test` sem falhas; ambiente local sobe com um único comando (`infra:up` + `dev`).

## Escopo

- `@apps/api` — novo projeto Next.js 16 (API) — porta **3002**
- `@apps/app` — novo projeto React 19 + Vite (cliente) — porta **5173**
- Root — scripts, `docker-compose.yml`, atualização de docs
- `apps/web` e `apps/docs` — **mantidos** como estão (starter para apps web)

### Inclui (MVP)

- Criar `@apps/api` (Next.js 16 + TypeScript) com `GET /` retornando JSON `{"message":"Hello World"}` (Route Handler no path raiz).
- Criar `@apps/app` (React 19 + Vite + TypeScript) com uma página simples cujo título é "Hello World".
- Configurar ESLint e Prettier nos dois apps novos reutilizando os configs de `@repo/eslint-config`/`@repo/typescript-config`.
- Adicionar comandos root `code:fix` (alias: ESLint `--fix` + Prettier `--write`) e `types:check` (alias de `check-types`), **mantendo** os comandos atuais `lint`, `format`, `check-types`.
- Configurar **Vitest** com testes smoke simples em `@apps/api` e `@apps/app`; comando `test`.
- Configurar **Playwright** (E2E) para o cliente e **Supertest** para `GET /` da API; comando `test:e2e`.
- Criar `docker-compose.yml` na raiz com:
  - Stack **Supabase local**: Postgres (fonte de dados local); Auth/Storage sem features nesta entrega.
  - Stack **LGTM**: Loki (logs), Grafana, Tempo (traces), Mimir (métricas).
- Adicionar comandos root `infra:up` e `infra:down` para subir/derrubar a infra do compose.
- Setup de migrações Supabase: CLI `supabase` como devDependency, pasta `supabase/migrations/` com migration inicial; comando `db:migrate` aplicando migrações contra o banco local do compose.
- Atualizar `ARCHITECTURE.md`, `DEVELOPMENT.md`, `DESING_SYSTEM.md` (onde aplicável), `QA.md` e `BUSNIESS.md` se necessário para refletir o novo estado (Alvo → Implementado; `test`/`test:e2e` registrados em `QA.md`).
- Registrar ADR em `./adrs/` com as decisões desta fundação (client Vite, compose como fonte da infra, migrações via CLI).
- Limpar dependências conflitantes do `package.json` (remover libs que o plano novo tornar obsoletas/conflitantes — ex.: restos do starter que não se aplicam à stack planejada).

### Não inclui (fora de escopo)

- Implementação de features reais de negócio (auth, conectores, experts, telas do produto).
- TailwindCSS / shadcn / design system (Alvo; pendência do `DESING_SYSTEM.md` fica para iterção seguinte).
- Tanstack Query / Tanstack Table.
- Lefthook / lint-staged (hooks de git).
- Deploy/CI (Vercel, pipelines).
- Bcrypt/hash de senhas.
- Schema de negócio no Postgres (só a estrutura de migrações + migration inicial).
- Configuração de Auth/Storage do Supabase (apenas banco disponível).
- Alterações em `apps/web` e `apps/docs` além do necessário para o turbo rodar nas raízes.

## Requisitos

### Funcionais

- [ ] Como equipe de desenvolvimento, quero um app de API que responda JSON em `GET /`, para ter um primeiro endpoint verificável.
- [ ] Como equipe de desenvolvimento, quero um cliente renderizando "Hello World", para validar a toolchain (Vite + React + TS) ponta a ponta.
- [ ] Como equipe de desenvolvimento, quero comandos `code:fix`, `types:check`, `test`, `test:e2e`, `infra:up`, `infra:down` e `db:migrate`, para operar qualidade e infra local com um nome só.
- [ ] Como equipe de desenvolvimento, quero lint, tipagem, testes smoke + E2E passando no monorepo, para garantir que código novo não quebra bases.
- [ ] Como equipe de desenvolvimento, quero subir o banco (Supabase local) e observabilidade (LGTM) via compose, para desenvolver com infra local reprodutível.

### Não-funcionais

- **Portabilidade**: infra local reproduzível por qualquer dev via `docker compose`.
- **Observabilidade**: LGTM coleta logs (Loki), métricas (Mimir) e traces (Tempo) dos serviços locais que os emitem.
- **Consistência**: dois apps novos seguem os configs compartilhados (`@repo/eslint-config`, `@repo/typescript-config`); zero configuração duplicada divergente.
- **Determinismo**: `infra:up`/`infra:down` idempotentes; `db:migrate` só aplica migrações pendentes.
- **Segurança**: `.env` com segredos/creds locais nunca entra no git; fornecer `.env.example` documentando o que preencher.

## Regras de negócio

> Operacionais (é uma spec de infra; não há regra de domínio de negócio nesta entrega).

- Portas fixas: `web`=3000, `docs`=3001, `api`=**3002**, `app`=**5173**. Nenhum serviço novo pode colidir.
- Nomes de comando normalizados com `:` (Ex.: `infra:up`, não `infra.up`); todo comando novo existe no root `package.json` via turbo.
- `code:fix` **deve** deixar o repo 100% formatado e sem warnings de lint (roda `eslint --fix` + `prettier --write` em todo o monorepo).
- `db:migrate` **não pode** rodar sem o banco local do compose de pé; mensagem de erro clara se o banco estiver fora.
- `infra:up` deve ser idempotente: reexecutar com todos os serviços já de pé não pode quebrar.
- Migrações são versionadas em `supabase/migrations/`; `db:migrate` só aplica as pendentes; nunca apaga migração aplicada.
- Ao final, itens que se tornam dependência conflitante são removidos do `package.json` **antes** de marcar a fundação como concluída.

## Dados e integrações

- **Banco local**: Postgres a partir do stack Supabase no `docker-compose.yml` (fonte da verdade da infra é o compose — não o `supabase start`).
- **Migrações**: Supabase CLI (devDependency no root ou workspace api) + `supabase/migrations/` com **uma migration inicial** (ex.: número de versão + `-- no-op` ou tabela mínima de controle), aplicada por `db:migrate` no banco local.
- **Integrações externas nesta fundação**: nenhuma (sem APIs de terceiros; conectores ficam para features futuras).
- **Observabilidade**: LGTM (Loki + Grafana + Tempo + Mimir) até via compose; Grafana acessível em porta a definir em `DEVELOPMENT.md` (safe default 3005).
- **Seed**: não se aplica — não há dados de negócio.

## UX e estados de interface

- `@apps/app` é uma **página estática** ("Hello World"): sem fluxo, sem estados de vazio/loading/erro/sucesso — não se aplica nesta entrega.
- Design system/shadcn **não** entra aqui; a página usa estilos mínimos próprios. Toda alteração futura de UI continua exigindo as skills `frontend-design` e `web-design-guidelines` (ver `AGENTS.md`).

## Critérios de aceite

- [ ] `bun run dev` (via turbo) inicia `@apps/api` e `@apps/app` sem erro; `apps/api` responde em `http://localhost:3002` e `apps/app` em `http://localhost:5173`.
- [ ] `GET http://localhost:3002/` retorna HTTP 200 com `Content-Type: application/json` e corpo `{"message":"Hello World"}` (verificado por teste Supertest).
- [ ] Página do `@apps/app` renderiza o título "Hello World" (verificado por Playwright E2E).
- [ ] `bun run code:fix` roda sem erro e deixa o monorepo 100% formatado e sem warnings de lint.
- [ ] `bun run types:check` passa em todos os packages (alias de `check-types`).
- [ ] `bun run test` executa a suíte Vitest (smoke de `@apps/api` e `@apps/app`) com sucesso.
- [ ] `bun run test:e2e` executa Playwright (cliente) e Supertest (API `GET /`) com sucesso.
- [ ] `docker-compose.yml` na raiz sobe os serviços Supabase (Postgres) + LGTM (Loki, Grafana, Tempo, Mimir) com `bun run infra:up` e derruba com `bun run infra:down`, ambos sem erro.
- [ ] `supabase/migrations/` existe com migration inicial e `bun run db:migrate` aplica sem erro contra o banco local; reexecutar não reaplica.
- [ ] Dependências conflitantes removidas do `package.json` (nenhuma lib do starter vira conflito com a stack nova) e apps/web/docs continuam funcionando.
- [ ] `ARCHITECTURE.md`, `DEVELOPMENT.md`, `QA.md` e `DESING_SYSTEM.md` (onde aplicável) refletem o estado novo: `test`/`test:e2e` registrados em `QA.md`; itens implementados movidos de Alvo → Implementado.
- [ ] ADR em `./adrs/` registra: client Vite (divergência com Next-only da arquitetura), compose como fonte da infra, migrações via CLI Supabase, portas dos novos apps.

## Decisões técnicas e riscos

- **Client em Vite (divergência com `ARCHITECTURE.md`)**: a spec manda React+Vite; a arquitetura lista Next para todas as apps. Decisão: seguir a spec, registrar ADR e atualizar `ARCHITECTURE.md`/`DESING_SYSTEM.md`. Risco: `@repo/ui` (design system) foi pensado p/ apps Next; mitigar revisando compatibilidade quando Tailwind/shadcn entrarem (próxima iterção).
- **API no `@apps/api` (Next) mantém consistência** com a arquitetura atual de API (Route Handlers).
- **Compose como fonte da verdade da infra**: decisão de não usar `supabase start`; requer mapear os serviços Supabase esperados pelo CLI para o `db:migrate`. Risco: incompatibilidade de versões CLI/compose — mitigar com pinagem de versão do CLI + `.env.example`.
- **Playwright**: exige download de browsers na primeira execução (`playwright install`); registrar no `DEVELOPMENT.md` para não surpreender.
- **Portas próximas**: 3000/3001/3002/5173 — risco baixo de colisão; documentadas em `DEVELOPMENT.md`.
- **Dependência de Docker local**: toda a infra depende de Docker de pé na máquina do dev.
- **Rollback**: por ser setup, a reversão é remover scripts/apps criados e restaurar `package.json`/docs via git; não há dados de produção envolvidos.

## Backlog / desejáveis

- TailwindCSS + shadcn e tokens iniciais (pendências do `DESING_SYSTEM.md`).
- Tanstack Query / Tanstack Table no cliente.
- Lefthook + lint-staged (hooks de git).
- Schema real de negócio + migrations das features (auth, conectores, experts).
- Bcrypt / hash de senhas.
- Deploy e CI (Vercel).
- Testes de integração no `@apps/api` com banco de verdade (quando houver schema).

## Q&A registradas

- **O que fazer com `apps/web` e `apps/docs` existentes?** R: manter ambos e **criar** `@apps/api` e `@apps/app`.
- **Client usa Vite (spec) ou Next (arquitetura)?** R: **Vite + React**, conforme a spec. Exige ADR + atualização dos docs.
- **Quais libs Alvo entram na fundação?** R: **Vitest (smoke), Playwright (E2E), Supertest (API)**. Tailwind+shadcn, Tanstack Query/Table e Lefthook+lint-staged ficam para backlog.
- **Como resolver `code:fix`/`types:check` vs comandos atuais?** R: adicionar como **aliases**, mantendo `lint`, `format`, `check-types` atuais.
- **Fonte da verdade da infra local?** R: **docker-compose único** com Supabase (banco) + LGTM; `infra:up`/`infra:down` controlam.
- **O que `db:migrate` aplica, sem schema de negócio ainda?** R: setup das migrações Supabase (CLI + pasta `supabase/migrations/` + migration inicial); aplica no banco local do compose.
- **Portas dos apps novos?** R: safe default **api=3002**, **app=5173** (Vite default); Grafana 3005.
- **Interpretação do critério "remover pontos [implementado] que conflitam" (ex.: ESLint+Prettier)?** R: **limpar dependências conflitantes** do `package.json` que o plano novo tornar obsoletas/conflitantes.
- **Haverá UI nesta entrega?** R: página estática "Hello World", sem estados — regras de UX do `DESING.md` não se aplicam nesta fundação.
