---
name: feature-concept
description: Entrevista profunda de conceito/requisitos antes de planejar ou implementar. Use SEMPRE ao iniciar uma spec ou feature, antes de montar um plano (obrigatória conforme RULES.md), quando houver ambiguidade de requisitos, ou quando o usuário pedir para "alinhar", "definir", "conceituar", "grillar" ou "validar" uma ideia antes de codar. Faz perguntas profundas e acertivas para garantir precisão na execução.
---

# Feature Concept

Skill de elicitação de requisitos do projeto. Antes de qualquer plano ou implementação, entreviste o usuário de forma **profunda** até obter um entendimento **completo e acertivo** do que será construído.

É a versão própria do "grill-me": você deve questionar de forma insistente, curiosa e específica — sem dar aceite automático a respostas vagas.

## Quando usar

- Ao receber uma spec para planejar (ver `RULES.md`: é obrigatória).
- Ao iniciar qualquer feature/change com premissas não verificadas.
- Quando o pedido for ambíguo, incompleto ou contraditório com a documentação.
- Antes de gerar/organizar o plano em `./.plans/*.md`.

## Fluxo

1. **Preparar contexto** — leia a spec (se existir), `AGENTS.md`, `.docs/*` relevantes e o código tocado. Chegue à entrevista sabendo o assunto; não pergunte o que já está documentado.
2. **Entrevistar** — faça perguntas por tema, em rounds, do macro ao detalhe. Persiga respostas vagas com "por quê" e "como". Sugira trade-offs quando útil, mas deixe o usuário decidir.
3. **Confirmar conceito** — recite o entendimento consolidado (o "conceito") e peça confirmação explícita antes de liberar plano/implementação.
4. **Registrar** — grave as perguntas e respostas no plano (`./.plans/[spec]-plan.md`) ou na própria spec, para a equipe executar sem re-elicitar.

## Regras da entrevista

- **Nunca assuma.** Toda premissa deve ser verificada ou explicitamente aceita pelo usuário.
- **Sem perguntas "sim/não" isoladas.** Prefira "como se comporta quando…?", "o que acontece se…?".
- **Um conceito por vez.** Não misture temas; feche um antes de abrir outro.
- **Siga os furos.** Toda resposta vaga gera um follow-up imediato (quantidade, condição, formato, exceção).
- **Aponte contradições** entre respostas e a documentação/código.
- **Divida para acertar.** Se a feature for grande, quebre em partes e confirme o escopo de cada uma.
- **Não invente requisitos.** Se o usuário não sabe ("decida você"), ofereça a opção padrão (safe default), explique a implicação e siga somente com aceite.
- **Pergunte o suficiente, não tudo.** Quando as respostas já permitem critérios de aceite objetivos e sem ambiguidade, encerre a entrevista.

## Áreas de investigação (checklist de cobertura)

### 1. Problema e objetivo

- Qual o problema real que esta feature resolve? Para quem?
- Qual o resultado esperado/métrica de sucesso?
- Existe solução atual? Por que não atende?

### 2. Escopo

- O que entra? O que **não** entra nesta entrega?
- Quais são os entregáveis mínimos (MVP) e os desejáveis?
- Há restrição de tempo/lançamento acoplada?

### 3. Usuários e UX

- Quem usa (personas/roles) e com quais permissões?
- Como o usuário percorre o fluxo do início ao fim?
- Estados de UI: vazio, carregando, erro, sucesso, sem permissão?
- Responsivo/mobile-first? Acessibilidade (foco, contraste, aria)?

### 4. Regras de negócio

- Quais regras/campos são obrigatórios?
- Quais validações e suas mensagens de erro?
- Que limites de valor/quantidade existem?
- Quem pode editar/excluir/visualizar o quê?

### 5. Dados e integrações

- Quais dados entram/saem? Schema e formato?
- De onde vêm os dados? Existem integrações/APIs/fontes externas?
- Como modelar no banco? Relações e unicidade?
- O que acontece com dados existentes (migração/seed)?

### 6. Técnico e arquitetura

- Qual app/package será tocado (`apps/*`, `packages/*`)?
- Quais padrões do monorepo se aplicam (ver `ARCHITECTURE.md`)?
- Novas dependências são necessárias? É aceitável instalá-las?
- Performance: volume esperado, latência, cache?

### 7. Critérios de aceite

- Como **provar** que a feature está pronta (cenários verificáveis)?
- Quais testes serão considerados suficientes?
- Quais portões de QA rodam antes de entregar (ver `QA.md`)?

### 8. Segurança e não-funcionais

- Há dados sensíveis? Como proteger (validação, sanitização, auth)?
- Erros e respostas no formato esperado pela equipe?
- Logs/observabilidade necessários?

### 9. Dependências e riscos

- O que bloqueia esta entrega (pessoas, dados, outra feature)?
- Qual o principal risco e como mitigar?
- O que acontece se algo der errado no meio? (rollback/parcial)

## Saída

Ao final, apresente um **Conceito** compacto neste formato e obtenha aceite:

```markdown
# Conceito — <nome da feature>

## Objetivo

## Escopo (in / out)

## Personas / fluxo principal

## Regras de negócio chave

## Dados e integrações

## Decisões técnicas

## Critérios de aceite

## Riscos e dependências
```

Só após o aceite, registre as Q&As e avance para o plano.
