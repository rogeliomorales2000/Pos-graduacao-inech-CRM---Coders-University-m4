---
title: <título curto da feature>
status: rascunho # rascunho | pronto | em-andamento | concluido | depreciado
created: YYYY-MM-DD
updated: YYYY-MM-DD
owner: <responsável>
type: feature # feature | change | infra | bugfix | refactor
---

# <Nome da feature>

<!--
COMO USAR ESTE TEMPLATE
1. Copie para `./.specs/<nome-em-kebab-case>.md` — ou gere já preenchido com a skill `create-spec`.
2. Substitua os placeholders `<...>` e apague as instruções (linhas começando com `>`) e este comentário.
3. Refine com a skill `refine-spec` antes de implementar com a skill `implement-me`.
Regra: toda seção deve ser preenchida ou marcada como "não se aplica, porque …".
-->

## Resumo

> 2 a 3 frases: o que é, para quem e qual o resultado esperado. Quem ler só isto deve entender a entrega.

<...>

## Contexto

> Por que a feature existe: problema real, limitações do estado atual do código e decisões anteriores (referencie ADRs em `./adrs/`).

<...>

## Necessidade de negócio

> Valor entregue, personas afetadas (ver `BUSNIESS.md`) e métrica de sucesso que prova que valeu a pena.

<...>

## Escopo

> Apps/packages afetados, seguindo `ARCHITECTURE.md`. Ex.: `@apps/web`, `@packages/ui`.

<...>

### Inclui (MVP)

- <item objetivo e verificável desta entrega>

### Não inclui (fora de escopo)

- <item explicitamente fora — é o que mais evita escopo escorregadio>

## Requisitos

### Funcionais

- [ ] Como <persona>, quero <ação>, para <benefício>.

### Não-funcionais

> Só os que se aplicam: performance, acessibilidade, segurança, observabilidade, responsividade.

- <...>

## Regras de negócio

> Validações, limites de valor/quantidade, permissões por role, bordas e mensagens de erro. Cada regra deve ser testável.

- <...>

## Dados e integrações

> Schemas, campos, relações e unicidade; APIs/fontes externas; migração ou seed de dados existentes. Consulte a skill de Postgres/banco quando se aplicar.

<...>

## UX e estados de interface

> Se houver UI: fluxo do início ao fim e estados de vazio/carregando/erro/sucesso/sem-permissão. Siga `DESING*.md` e carregue `frontend-design` + `web-design-guidelines` antes de implementar.

<...>

## Critérios de aceite

> Cenários concretos e verificáveis — a definição objetiva de "pronto" para esta spec.

- [ ] <...>

## Decisões técnicas e riscos

> Padrões do monorepo que se aplicam, dependências novas (aceitas?), riscos e mitigação, bloqueios e plano de rollback.

<...>

## Backlog / desejáveis

> Itens fora do MVP, registrados para iterações futuras.

- <...>

## Q&A registradas

> Perguntas e respostas da entrevista (`feature-concept` / `refine-spec`) e safe defaults escolhidos, para a equipe executar sem re-elicitar.

- <...>

<!--
CHECKLIST DE QUALIDADE (skill refine-spec) — conferir antes de salvar:
- [ ] Frontmatter completo (title, status, owner, type, datas).
- [ ] Resumo entende a entrega sem ler o resto.
- [ ] "Inclui" não conflita com "Não inclui".
- [ ] Critérios de aceite objetivos, sem termos vagos ("rápido", "bonito", "bom").
- [ ] Regras de negócio testáveis (limites, mensagens de erro).
- [ ] Dados com schema/fonte/migração definidos.
- [ ] UX cobre os estados (quando houver UI).
- [ ] Nada assume itens "Alvo" do ARCHITECTURE.md como já implementados.
- [ ] Q&As/decisões registradas.
-->
