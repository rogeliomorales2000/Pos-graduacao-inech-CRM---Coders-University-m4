---
name: refine-spec
description: Refina e melhora uma spec existente em ./.specs/. Use quando o usuário disser "refinar a spec", "refine-spec", "melhorar/clarificar a spec X", "atualizar a spec de uma feature", "essa spec está crua", "dar uma revisada na spec", ou apontar para um arquivo em .specs/ pedindo para deixá-lo mais completo e executável. Também use quando a spec estiver ambígua, incompleta, sem critérios de aceite ou fora do template. NÃO use para implementar — implementação é da skill implement-me.
---

# Refine Spec

Pega uma spec existente em `./.specs/` e a transforma em uma spec **completa, clara e executável**, alinhada ao template canônico e à documentação do projeto — **sem mudar o intent original sem perguntar**.

É a segunda etapa do ciclo: `create-spec` (criar) → `refine-spec` (refinar) → `implement-me` (executar). O resultado precisa estar bom o suficiente para o `implement-me` executar sem re-elicitar requisitos.

## Entrada

- A spec a refinar: caminho direto (ex.: `./.specs/login-oauth.md`) ou o nome (procure em `./.specs/`).
- `./AGENTS.md` (ou `./.docs/AGENTS.md`), `.docs/*` relevantes, `RULES.md` e `QA.md`.
- O template canônico: `./.specs/_template.md` — use-o como alvo estrutural (frontmatter + títulos das seções; placeholders a preencher).
- Spec já preenchida de referência: `./.specs/foundation.md`.

## Fluxo

### 1. Ler a spec e o contexto

1. Localize e leia a spec inteira. Se o nome não bater, procure variações (case, hifenização, parcial) em `./.specs/`; se não achar, **pare e pergunte**.
2. Leia `AGENTS.md`, os docs de domínio/UI relevantes e o código que a spec toca.
3. Leia `./.specs/_template.md` para saber o alvo estrutural.

### 2. Diagnosticar

Compare a spec atual com o template e produza um diagnóstico objetivo do que falta ou está fraco. Verifique, por exemplo:

- Seções ausentes ou com placeholder não preenchido.
- Frontmatter incompleto (`title`, `status`, `owner`, `type`, datas).
- **Critérios de aceite** vagos, não verificáveis ou inexistentes.
- Escopo sem a seção "não inclui" (risco de escopo escorregadio).
- Regras de negócio sem validações/limites/mensagens de erro.
- Dados e integrações sem schema/fonte/migração.
- UX sem estados de vazio/carregando/erro/sucesso (quando houver UI).
- Contradições internas ou com a documentação/arquitetura.
- Termos ambíguos ("rápido", "bonito", "bom") que precisam virar critério mensurável.
- Requisitos técnicos que assumem itens "Alvo" do `ARCHITECTURE.md` como existentes.

Apresente o diagnóstico ao usuário em poucos itens, com o que será corrigido.

### 3. Preencher as lacunas com feature-concept

- Para cada lacuna que exija **decisão do usuário** (escopo, regra de negócio, comportamento de borda, dado/integração), **carregue a skill `feature-concept`** e entreviste até obter resposta ou aceite explícito.
- Não invente requisitos. Para decisões de baixo impacto, ofereça um safe default e registre nas Q&As.
- Respeite o que já foi decidido na spec: **não reabra decisões fechadas** sem motivo, a menos que encontre uma contradição — nesse caso aponte e pergunte.

### 4. Reescrever a spec

- Reorganize e complete o conteúdo **espelhando o frontmatter e os títulos das seções do `./.specs/_template.md`**, preservando o intent e as decisões válidas da spec original.
- Mantenha o **mesmo nome de arquivo**; não crie uma spec duplicada.
- Torne tudo objetivo e verificável. Reescreva itens vagos como critérios de aceite mensuráveis.
- Preencha ou atualize o frontmatter; atualize `updated` para hoje e ajuste `status` se o usuário indicar (ex.: `rascunho` → `pronto`).
- Registre nas Q&As as perguntas/respostas da entrevista e os safe defaults adotados.

### 5. Validar e salvar

- Rode de novo o checklist do template: todas as seções preenchidas (ou justificadamente "não se aplica"), critérios de aceite sem ambiguidade, "Inclui" coerente com "Não inclui".
- Grave no mesmo caminho `./.specs/<nome>.md`.
- Apresente ao usuário um resumo das mudanças — o que foi completado, o que foi decidido e o que mudou de entendimento (se algo mudou) — e peça confirmação.
- Se o usuário discordar de algo, ajuste e grave novamente.

## Regras

- **Refinar, não reescrever do zero.** Preserve o intent; mudanças de escopo exigem aceite.
- **Nunca altere o nome/arquivo sem pedir.** Se houver uma spec melhor nomeada, sugira, mas não renomeie sozinho.
- **Sem código.** Esta skill produz documento; `implement-me` é quem implementa.
- **Não invente requisitos.** Lacuna sem decisão = pergunta (ou safe default registrado e aceito).
- Se a spec estiver tão incompleta que virou outra feature, proponha criar uma nova via `create-spec` em vez de forçar a atual.
