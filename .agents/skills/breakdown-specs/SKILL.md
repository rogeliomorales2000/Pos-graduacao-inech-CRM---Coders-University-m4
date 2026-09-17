---
name: breakdown-specs
description: Quebra um prompt/ideia composta em várias specs pequenas e executáveis em ./.specs/, orquestrando a skill create-spec em cada fatia e gerando um roadmap de execução. Use quando o usuário fornecer um prompt grande/composto com várias features ou fluxos distintos (ex.: autenticação com sign-in, sign-up, confirm-account e forgot-password; um CRUD de produtos que vira create/list/update/delete; módulo de gestão com CRUD de produtos e users), ou disser algo como "quebrar em specs", "dividir em specs menores", "fazer o breakdown desse prompt", "decompor em features", "uma spec para cada feature", "módulo de X com vários fluxos", "CRUD de produtos", "CRUD de produtos e users", "separar isso em partes implementáveis" — mesmo que não use a palavra spec. NÃO use para prompts de uma única operação/fluxo indivisível (ex.: só sign-in, só o create de um produto — aí é create-spec direto) nem para implementar (é implement-me).
---

# Breakdown Specs

Recebe um prompt/ideia **composta** e o divide em **specs pequenas e independentes**, uma por **fluxo/capability do usuário**, usando a skill `create-spec` em cada fatia e produzindo um **roadmap de execução** que define a ordem de implementação (uma feature por vez).

É o pré-processador do ciclo de vida: `breakdown-specs` (dividir) → `create-spec` (escrever cada fatia) → `refine-spec` (refinar) → `implement-me` (executar).

Sua entrega é a **decomposição aprovada + specs completas em `./.specs/` + o roadmap em `./.specs/INDEX.md`**. Você não implementa código.

## Quando usar vs create-spec

| Situação                                                                                                           | Skill                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Prompt de **uma única operação/fluxo indivisível** (ex.: só `sign-in`, só `produtos-create`)                       | `create-spec` direto                                                                                               |
| Prompt **composto**: autenticação com vários fluxos, um CRUD inteiro (produtos) ou vários CRUDs (produtos + users) | `breakdown-specs`                                                                                                  |
| Prompt composto que já veio **decomposto** (ex.: lista de features)                                                | Confirme com o usuário se as fatias propostas estão certas e siga `create-spec` por item — não re-decomponha à toa |

## Princípios do breakdown

- **Uma spec por fluxo/capability do usuário**: cada fatia deve ser **implementável e testável isoladamente**. Ex.: um prompt de autenticação vira `sign-in`, `sign-up`, `confirm-account`, `forgot-password` como specs separadas — não uma spec "auth" gigante.
- **CRUD = uma spec por operação**: um CRUD é composto de operações independentes, cada uma observável e validável isoladamente. Ex.: o CRUD de produtos vira `produtos-create`, `produtos-list`, `produtos-update`, `produtos-delete` como specs separadas. Um módulo com várias entidades (produtos **e** users) multiplica: uma spec por operação por entidade.
- **Fronteira clara**: cada spec tem escopo "inclui / não inclui" exatamente definido, sem sobreposição entre fatias.
- **Dependências explícitas e ordem**: o roadmap registra o que cada spec depende e a ordem de execução (uma por iteração).
- **Infra/fundação vira spec própria quando é pré-requisito**: se as features dependem de base que não existe (auth infra, schema de tabela, setup), ela entra como fatia inicial no roadmap (ex.: `auth-base`).
- **Só divida até o ponto de independência**: agrupe na mesma spec o que pertence semanticamente a um único fluxo; separe o que pode ser entregue e validado sozinho.

## Fluxo

### 1. Adquirir contexto

Leia primeiro, em ordem:

1. `./.docs/AGENTS.md` (ou `./AGENTS.md`) — contrato operacional e índice da documentação.
2. `.docs/ARCHITECTURE.md` — apps/packages existentes e o que é Alvo vs Implementado. Nunca assuma item Alvo como existente.
3. `.docs/RULES.md` e `.docs/QA.md` — processo e portões.
4. O template `./.specs/_template.md` — alvo estrutural de cada fatia.
5. As specs já existentes em `./.specs/` — para não duplicar e para respeitar o que já foi decidido.

### 2. Analisar e decompor o prompt

- Identifique as **capacidades/fluxos distintos** que o usuário pediu no prompt.
- Para cada uma, defina:
  - **Nome provisório** (kebab-case, curto, que descreva a fatia — ex.: `sign-in`, `confirm-account`; para CRUD use `entidade-operação`: `produtos-create`, `produtos-list`).
  - **Escopo MVP em uma linha** (o que entra e o que não entra).
  - **Dependências** em relação às outras fatias e à fundação.
- Reordene mentalmente do macro ao detalhe: base/infra → capacidades primárias → capacidades derivadas.

### 3. Validar o breakdown com o usuário

- Apresente o plano de divisão: lista de specs (nome, escopo de 1 linha, dependências) e a **ordem de execução sugerida**.
- Se houver ambiguidade sobre granularidade ou sobre o que entra em cada fatia, **carregue a skill `feature-concept`** e entreviste.
- **Pare e confirme com aceite explícito antes de gerar qualquer spec** — refazer fatias erradas é caro. Ajuste o plano conforme o retorno e só siga com "ok/pode gerar".

### 4. Gerar cada spec com create-spec

- Para cada fatia aprovada, **carregue a skill `create-spec`** e execute-a com o **escopo daquela fatia** como prompt de entrada.
- Cada fatia resulta em `./.specs/<nome>.md` **completa** (frontmatter + seções do template + critérios de aceite), pronta para `refine-spec`.
- Se uma fatia ainda se revelar grande demais ao escrever, **quebre de novo**: feche o escopo revisado com o usuário, gere as sub-specs e registre a hierarquia no roadmap.

### 5. Gerar o roadmap de execução

Crie/atualize `./.specs/INDEX.md` com:

- Lista das specs em **ordem de execução recomendada** (uma por iteração).
- Dependências entre elas (ex.: `sign-in` depende de `auth-base`).
- Instrução clara: **implementar uma feature por vez** via `implement-me`, respeitando a ordem do INDEX.
- Status/resumo de 1 linha por spec, atualizado conforme as fatias são implementadas.

O INDEX é o espelho vivo da intenção do prompt: se o prompt/esforço mudar, re-execute o breakdown e atualize o INDEX antes de seguir.

## Regras

- **Você decompõe e orquestra, não escreve as specs do zero.** Escrever cada fatia = seguir `create-spec`; refinar em profundidade = `refine-spec`; implementar = `implement-me`.
- **Não invente fatias**: cada spec deve ter correspondência clara com um pedido do prompt ou com uma dependência necessária (ex.: base de infra). Fatia inventada só com aceite do usuário.
- **Confirmar antes de gerar**: nunca gera batch de specs sem o breakdown validado (passo 3).
- **Nunca sobrescreva spec existente sem perguntar** — use `refine-spec` ou peça autorização.
- **Nomes em kebab-case**, alinhados ao `./.specs/_template.md`.
- **Não implemente código** e não rode `commit-and-push`: sua entrega é a decomposição e as specs, sob revisão do usuário.
