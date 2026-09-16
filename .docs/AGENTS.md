# AGENTS

Este arquivo é o **ponto de entrada** para qualquer agente de código que atue neste repositório. Leia-o antes de qualquer tarefa e siga as regras abaixo.

## Regras obrigatórias

1. **Toda alteração de UI** exige carregar as skills obrigatórias antes de implementar:
   - `frontend-design`
   - `web-design-guidelines`

2. **Contexto define a skill.** Antes de iniciar o trabalho, identifique o domínio e carregue a skill correspondente:
   - Banco de dados → skill de Postgres
   - Next.js → skill de Next.js
   - React.js → skill de React.js
   - Copyright / cópias → skill de copies
   - Textos / SEO → skill de SEO
   - Outros domínios → skill específica se existir, senão prossiga e registre a lacuna

3. **Sempre se oriente pela documentação.** O índice abaixo define a responsabilidade de cada arquivo de `.docs`. Leia os arquivos relevantes à sua tarefa antes de codar.

4. **Entregue com qualidade.** Ao final de qualquer mudança, execute os portões de QA descritos em `QA.md` e siga o `RULES.md`.

## Índice da documentação

| Arquivo                                  | Responsabilidade                                                    |
| ---------------------------------------- | ------------------------------------------------------------------- |
| [`AGENTS.md`](./AGENTS.md)               | Contrato operacional para agentes de código (este arquivo)          |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md)   | Stack e estrutura do monorepo: estado atual vs arquitetura alvo     |
| [`BUSNIESS.md`](./BUSNIESS.md)           | Modelo de negócio: produto, personas e conectores de dados          |
| [`izanami.md`](./izanami.md)             | Visão de produto: missão e objetivo de longo prazo                  |
| [`DESING_SYSTEM.md`](./DESING_SYSTEM.md) | Fundação de UI: design system base (shadcn) e local dos componentes |
| [`DESING.md`](./DESING.md)               | Diretrizes visuais e de UX para construção de interfaces            |
| [`DEVELOPMENT.md`](./DEVELOPMENT.md)     | Convenções de desenvolvimento: comandos, portas e padrões           |
| [`QA.md`](./QA.md)                       | Portões de qualidade: comandos a rodar antes de entregar            |
| [`RULES.md`](./RULES.md)                 | Regras de processo: plano, ADRs e checklist de fim de iteração      |
