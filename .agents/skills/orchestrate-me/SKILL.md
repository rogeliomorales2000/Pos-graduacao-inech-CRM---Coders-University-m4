---
name: orchestrate-me
description: Orquestra a implementação em paralelo de um range de specs (ex.: "001-010") usando subagents. Use quando o usuário disser "orchestrate-me 001-010", "implementar as specs 001 a 010", "rodar o range 003-007 de specs", "implementar N specs de uma vez em paralelo", "subagent por spec", "orquestrar a execução paralela de specs" ou citar um range numérico de specs em ./.specs/ para serem implementadas juntas. O agente principal vira orquestrador: resolve o range, ordena as specs por dependência, dispara um subagent (via implement-me) por spec em background, monitora progresso e commita uma vez por spec no final. Complementa o implement-me (uma spec) com execução em lote parallel.
---

# Orchestrate Me

Skill de **orquestração paralela** de specs do projeto. O usuário informa um **range numérico de specs** (ex.: `001-010`); você atua como **orquestrador** e dispara **um subagent por spec** — cada um implementa sua spec de ponta a ponta em `background`, reportando progresso — e consolida o resultado no final, commitando **uma vez por spec**.

## Entrada

Range de specs a executar, no formato:

- `orchestrate-me 001-010` → implementa as specs `001` até `010` (inclusive; o orquestrador resolve `010` como o fim do range).
- `orchestrate-me 005` → spec única.
- `orchestrate-me 001,004,007` → lista explícita.

As specs vivem em `./.specs/<NNN>-<nome>.md` (prefixo numérico de 3 dígitos). Se as specs ainda não tiverem prefixo numérico (ex.: `auth-base.md`), **primeiro normalize** a nomenclatura conforme §2.

## Fundamentos

- **Um subagent por spec.** Cada spec é entregue a um subagent `general` (novo contexto), que roda o fluxo `implement-me` de ponta a ponta para aquela spec.
- **Paralelismo batch.** Subagents são disparados **juntos** (uma única mensagem com múltiplas chamadas `Task`) e rodam em background. Você não implementa código de spec nenhuma — só orquestra.
- **Progresso contínuo.** Cada subagent registra progresso em `./.orchestration/<run-id>/<spec>-progress.md` (e `-done.md` ao concluir). Você informa o usuário conforme os subagents avançam e concluem.
- **Commits controlados pelo orquestrador.** Subagents NÃO committam nem fazem push. Você agrupa os arquivos alterados por spec e commita **uma vez por spec**, em ordem de dependência, ao final (§6).

## Fluxo

### 1. Adquirir contexto (obrigatório)

Leia primeiro, em ordem:

1. `./AGENTS.md` (ou `./.docs/AGENTS.md`) — contrato operacional e índice da documentação.
2. `.docs/ARCHITECTURE.md`, `.docs/DEVELOPMENT.md`, `.docs/RULES.md`, `.docs/QA.md` — stack, comandos, processo e portões de qualidade.
3. `./.specs/INDEX.md` — índice/roadmap e ordem das specs.

### 2. Resolver e normalizar a nomenclatura das specs

- Liste `./.specs/*.md`. O padrão desejado é `NNN-<nome>.md` (`001-auth-base.md`, `002-sign-out.md`, …).
- Se qualquer spec (exceto `_template.md` e `INDEX.md`) estiver **sem o prefixo numérico**, use `git mv` para renomear seguindo a ordem do `INDEX.md` (coluna Ordem). Ex.: `auth-base.md` → `001-auth-base.md`. Ajuste links do `INDEX.md` se citarem o nome antigo.
- Não renomeie specs que já tenham número; apenas reordene/mantenha o mapeamento. Se houver colisão de números ou dúvida de ordem, **pergunte ao usuário** antes de renomear.

### 3. Resolver o range → lista de specs

- Para `001-010`: interpole todos os números no intervalo inclusive; para cada número, procure a spec `NNN-*.md`.
- Para lista `001,004,007`: um por número. Para spec única `005`: só ela.
- Número sem arquivo correspondente → **pare e pergunte ao usuário** (pode ser intervalo ainda não criado ou renomeado); não improvise.
- Resultado: uma lista ordenada de paths, ex.:

```
./.specs/001-auth-base.md
./.specs/002-sign-out.md
...
```

### 4. Ordenar por dependência (gradiente de levas)

- Leia cada spec do range e coleto suas dependências declaradas (seção "Contexto"/cabeçalho de dependências ou referências a outras specs em `./.specs/`).
- Monte o grafo e faça ordenação topológica (deploy em levas por nível):
  - **Leva 1**: specs sem dependência dentro do lote (ex.: a base).
  - **Leva N**: specs que dependem de specs já concluídas em levas anteriores.
- Dentro de uma leva, rodam **em paralelo**. Levas rodam **em sequência** (não dispare leva N+1 antes de todas as specs da leva N terem subagent `-done` + style QA).
- Ex.: `001-auth-base` (leva 1), depois `002-sign-out`/`003-sign-up` (leva 2), depois `004-confirm-account` (leva 3), etc.

### 5. Disparar os subagents (paralelo, background)

Para cada spec da leva atual, chame a tool `Task` com `subagent_type: "general"`. **Todos os subagents da leva na mesma mensagem** (uma chamada `Task` por spec). O prompt de cada subagent deve conter, explicitamente:

```text
Você é um agente implementador TASK<NNN> para a spec ./specs/<NNN>-<nome>.md.

1) Leia .docs/AGENTS.md, .docs/RULES.md, .docs/QA.md, .docs/DEVELOPMENT.md, ./specs/INDEX.md.
2) Carregue e siga a skill implement-me para esta spec específica, de ponta a ponta:
   - feature-concept (entrevista) → plano em ./.plans/<NNN>-<nome>-plan.md
   - skills de domínio (Conforme AGENTS.md) → implementação real
   - portões de QA que existirem (bun run lint, bun run check-types, bun run format)
   - ADR em ./adrs/
3) NÃO rode commit nem push, NÃO use git add/commit/push. Deixe a árvore suja.
4) Registre progresso ao fim de cada etapa em ./.orchestration/<run-id>/<NNN>-progress.md (cumulativo; cabeçalho com data/hora).
5) Ao concluir, escreva ./.orchestration/<run-id>/<NNN>-done.md com: status, arquivos modificados (paths), bibliotecas instaladas, resumo do QA rodado, ADR criado, decisões e racionais.
6) Reporte no seu retorno final: resumo da spec, arquivos alterados, QA passado, pendências.
```

Crie `./.orchestration/<run-id>/` (ex.: `run-2026-09-17-auth`) antes do primeiro disparo.

### 6. Monitorar progresso e reportar

- Após disparar a leva, informe ao usuário: quantos subagents em background, quais specs e o run-id.
- A tool `Task` notifica conclusão por subagent automaticamente. Entre notificações, leia `./.orchestration/<run-id>/*-progress.md` (paralelo a duas levas ou a novos disparos) e **reporte atualizações** (subagent X avançou para etapa Y; Z concluiu com N arquivos).
- Enquanto uma leva roda, você pode preparar: validar que `-done.md` têm o formato esperado, armar a ordem de commits.

### 7. QA/estado ao fim de cada leva (gate)

Após todos `-done.md` da leva:

- Rode os portões do projeto **se ainda não tiverem sido** (conferir `-done.md`); se o subagent não conseguiu rodar um portão, rode você.
- Vá para a próxima leva (§5), repetindo até esgotar.

### 8. Commits (uma vez por spec, ordem de dependência)

Subagents deixaram a árvore de trabalho com as mudanças. Agora **você** commita, uma spec por vez, na ordem das levas:

> **Hook no caminho:** o repo usa `lefthook` cujo hook `commit-msg` roda `bunx commitlint`; o `bunx` só existe em `~/.bun/bin`, e o `commitlint` quebra sob o node do sistema (v18) com `SyntaxError: Invalid regular expression flags`. Para todo `git commit`, exporte:
>
> ```bash
> mkdir -p /tmp/opencode/pathwrap
> printf '#!/bin/sh\nexec /home/izanami/.bun/bin/bun "$@"\n' > /tmp/opencode/pathwrap/node
> chmod +x /tmp/opencode/pathwrap/node
> export PATH="/tmp/opencode/pathwrap:$HOME/.bun/bin:$PATH"
> ```
>
> Sem isso o commit falha de forma escondida (hook aborta silenciosamente). As mensagens levam o trailer `Co-authored-by: Joaldo Lima <jasmon.rogelio@uni9.edu.br>`.

1. Para cada spec, leia `./.orchestration/<run-id>/<NNN>-done.md` → lista de paths alterados.
2. `git add <paths da spec em questão>` (só os dela).
3. `git commit -m "<conventional> ..."` com o co-author **Joaldo Lima** (`Co-authored-by: Joaldo Lima <jasmon.rogelio@uni9.edu.br>`); mensagem no padrão do repo (ex.: `feat(api, app): spec 003 — sign-up`).
4. Verifique `git status` entre commits para não misturar specs; se um arquivo foi tocado por duas specs, **commite na spec de ordem anterior e registre o conflito** — não duplique.
5. Ao finalizar todos, `git push`. Se falhar (permissão/remote), o commit fica local — reporte a causa.

### 9. Relatório final

Resumo consolidado da orquestração:

1. Specs planejadas (range) × concluídas, com status por spec.
2. Ordem de execução (levas) e justificativa.
3. Subagents disparados e seus run-ids.
4. Commits criados (um por spec) e estado do push.
5. ADRs criados, arquivos modificados agregados, bibliotecas instaladas.
6. Pendências e conflitos de arquivos entre specs.

## Lembrete operacional

- **Nunca** implemente o código de uma spec você mesmo quando houver múltiplas specs em lote — o subagent é quem faz. Você garante contexto, ordem, QA e commits.
- Se uma spec individual precisar de contexto profundo/entrevista, o subagent usa `feature-concept` — você não re-elicita pelo orquestrador.
- Se o range pedir muitas specs e houver limites de paralelismo, rode em levas menores (ex.: máx. 4-5 subagents simultâneos por leva) e explique ao usuário.
- Deixe o repositório consistente: `.plans/`, `./adrs/`, `.orchestration/<run-id>/` registrados, commits por spec, push ok (ou causa reportada).
