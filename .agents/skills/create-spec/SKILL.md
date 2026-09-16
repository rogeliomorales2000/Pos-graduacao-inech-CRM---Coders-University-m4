---
name: create-spec
description: Cria uma spec refinada a partir de um prompt/ideia e salva em ./.specs/. Use quando o usuário disser algo como "criar uma spec", "criar spec para determinada feature", "transformar esse prompt em spec", "escrever uma spec de um tema", "fazer a spec de X", ou fornecer um pedido solto que precisa virar um documento de spec do repositório. Também use quando quiser registrar uma feature/requisito novo que ainda não tem spec em .specs/. NÃO use para implementar — implementação é da skill implement-me.
---

# Create Spec

Converte um **prompt/ideia crua** em uma **spec refinada e executável**, salva em `./.specs/<nome>.md`. É a porta de entrada do ciclo de vida de uma spec no repositório: depois dela vem `refine-spec` (refinar/atualizar) e `implement-me` (executar).

**Você escreve, não implementa.** Sua entrega é o arquivo de spec, não código.

## Entrada

- `./AGENTS.md` (ou `./.docs/AGENTS.md`) — contrato e índice da documentação.
- O prompt/ideia do usuário sobre a feature.
- Os arquivos de `.docs` relevantes (`ARCHITECTURE.md`, `BUSNIESS.md`, `izanami.md`, `DESING*.md`, `RULES.md`, `QA.md`).
- O template canônico: `./.specs/_template.md`. Espelhe o **frontmatter** e os **títulos das seções** e substitua os placeholders `<...>` pelo domínio da sua feature; apague as instruções `>` do template.
- Uma spec já preenchida, como referência de nível de detalhe: `./.specs/foundation.md` (se existir).

## Fluxo

### 1. Adquirir contexto

Leia primeiro, em ordem:

1. `AGENTS.md` — contrato operacional e domínios/skills aplicáveis.
2. `ARCHITECTURE.md` — para saber quais `apps/*` e `packages/*` existem e o que é "Alvo" vs "Implementado". Nunca assuma que um item "Alvo" já existe.
3. Documentos de domínio/UI se a feature tocar negócio ou interface (`BUSNIESS.md`, `izanami.md`, `DESING*.md`).
4. `RULES.md` e `QA.md` — processo e portões.
5. O template `./.specs/_template.md` e, como referência de estilo, `foundation.md`.

Leia também o código que a feature toca, se o prompt apontar para ele. Não pergunte o que já está documentado.

### 2. Entender e clarificar a ideia

- Releia o prompt do usuário e identifique o que está **explícito** e o que está **implícito ou faltando**.
- Se houver ambiguidade, requisito contraditório ou lacuna de decisão (escopo, regras de negócio, dados, critérios de aceite), **carregue a skill `feature-concept`** e faça a entrevista profunda antes de escrever. Não invente requisitos em silêncio.
- Se o usuário disser "decida você" para algo, ofereça um **safe default**, explique a implicação e registre a decisão nas Q&As.
- Não entreviste à toa: pergunte só quando agrega. Se o prompt já permite critérios de aceite objetivos, escreva direto.

### 3. Escrever a spec

- Crie `./.specs/<nome>.md` espelhando o **frontmatter** e os **títulos das seções** do `./.specs/_template.md`, substituindo os placeholders `<...>` e as instruções `>` pelo entendimento da sua feature.
- **Nome do arquivo em kebab-case** (ex.: `login-oauth`, `checkout-carrinho`). Use um nome curto que descreva a feature, não o prompt.
- Preencha o frontmatter: `title`, `status: rascunho`, `created`/`updated` com a data de hoje, `owner` (o usuário que pediu, se souber), `type`.
- Escreva de forma **objetiva e verificável**: cada requisito, regra e critério de aceite deve ser testável. Prefira "como usuário, quero… para…". Evite adjetivos vagos ("rápido", "bonito", "bom").
- Escopo explícito: liste o que **não** entra. É a seção que mais evita retrabalho.
- Sempre defina critérios de aceite mensuráveis — são a prova de "pronto" para `implement-me`.

### 4. Validar antes de salvar

Conferir contra o template:

- Todas as seções obrigatórias presentes e preenchidas (ou marcadas como "não se aplica, porque…").
- Critérios de aceite objetivos, sem ambiguidade.
- Nada no “Inclui” conflita com o “Não inclui”.
- Nas Q&As, registradas as decisões tomadas na entrevista.

### 5. Salvar e apresentar

- Grave em `./.specs/<nome>.md`.
- Apresente um resumo curto: nome do arquivo, escopo, e qualquer decisão que tenha sido tomada como default na entrevista.
- Peça confirmação explícita do usuário. Se ele quiser ajustes, edite o mesmo arquivo.

## Regras

- **É spec, não plano, não código.** Não crie o plano (isso é `implement-me`) nem implemente.
- **Nunca sobrescreva uma spec existente sem pedir.** Se `./.specs/<nome>.md` já existir, avise e proponha `refine-spec` para atualizar em vez de duplicar.
- **Não assuma stack/ferramentas "Alvo" da arquitetura como existentes** — registre como decisão técnica/risco se a feature depender delas.
- Se a feature for grande demais, quebre em specs menores e confirme o escopo de cada uma com o usuário.
