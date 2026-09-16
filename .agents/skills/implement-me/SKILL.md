---
name: implement-me
description: Executa uma spec do repositório de ponta a ponta. Use quando o usuário pedir para "implementar uma spec", "executar a spec <nome>", "rodar a spec X", ou citar o nome de uma spec em ./.specs/ para ser implementada. Lê o AGENTS.md e a documentação de .docs para adquirir contexto, usa a skill feature-concept para garantir entendimento acertivo, gera o plano conforme RULES.md e implementa de fato, passando pelos portões de QA.
---

# Implement Me

Skill de execução de specs do projeto. O usuário informa o **nome da spec**; você adquire contexto, trava requisitos, planeja e **implementa de verdade**, entregando dentro das regras de `RULES.md` e `QA.md`.

## Entrada

Nome da spec a executar. A spec vive em `./.specs/<nome>.md`. Exemplos:

- `implement.me login-oauth`
- `implement.me ./.specs/carrinho.md`

## Fluxo

### 1. Adquirir contexto (AGENTS.md + documentação)

Leia primeiro, em ordem:

1. `./AGENTS.md` (ou `./.docs/AGENTS.md` se não houver na raiz) — contrato operacional e índice da documentação. **Nunca pule este passo.**
2. Os arquivos de `.docs` relevantes à tarefa antes de codar: `ARCHITECTURE.md` (stack/estrutura do monorepo), `DEVELOPMENT.md` (comandos/portas/padrões), `BUSNIESS.md`/`izanami.md` (domínio, se aplicável), `DESING*.md` (se houver UI).
3. `RULES.md` e `QA.md` — processo e portões de qualidade.

Leia também a própria spec e o código que ela toca. Não pergunte o que já está documentado.

### 2. Localizar a spec

- Caminho padrão: `./.specs/<nome>.md`. Se não existir, procure por variações (case, hifenização, caminho parcial) e por outras specs em `./.specs/`.
- Se não achar, **pare e pergunte** ao usuário; não improvise uma spec.

### 3. Travar requisitos com feature-concept

Antes de planejar, **obrigatoriamente** (ver `RULES.md`):

- Carregue a skill `feature-concept` e realize a entrevista profunda de requisitos com o usuário.
- Confirme o entendimento, escopo e critérios de aceite com aceite explícito.
- Se a entrevista revelar decisões que faltam, registre-as (atualize a spec ou anote Q&As para o plano).

### 4. Gerar o plano

Conforme `RULES.md`, monte um plano e salve em:

```
./.plans/[spec-file-name]-plan.md
```

(no exemplo `login-oauth` → `./.plans/login-oauth-plan.md`). Crie o diretório `./.plans/` se necessário.

O plano deve conter: problema, abordagem, passos de implementação, critérios de aceite e as Q&As da `feature-concept`. Valide o plano com o usuário antes de implementar, se o escopo não for trivial.

### 5. Carregar skills de domínio

Conforme `AGENTS.md`, identifique o domínio e carregue as skills antes de implementar:

- **UI** → `frontend-design` + `web-design-guidelines` (obrigatórias).
- Banco de dados → skill de Postgres; Next.js → skill de Next; React → skill de React; testes → `vitest`/`playwright`/`tdd`; e assim por diante.
- Se não houver skill para o domínio, prossiga e registre a lacuna no plano.

### 6. Implementar

- Siga o plano passo a passo; atualize `./.plans/*.md` se o plano mudar no caminho.
- Respeite convenções existentes do código ao redor e reutilize `packages/ui` (`@repo/ui`).
- Não declare que algo terminou sem ter de fato criado/alterado os arquivos e validado o comportamento.

### 7. Portões de QA

Execute os comandos de `QA.md` antes de entregar:

```bash
bun run lint
bun run check-types
bun run format
```

Somente comandos realmente implementados (ver `QA.md`); não prometa testes que não existem.

### 8. Checklist de fim de iteração (RULES.md)

Ao final, entregue no relatório:

1. **Decisões arquiteturais** — crie um ADR em `./adrs/*.md` (crie o diretório se necessário) e imprima um resumo no relatório.
2. **Passos manuais de QA** da tarefa.
3. **Arquivos modificados.**
4. **Bibliotecas instaladas.**
5. **Racionais** das decisões/implementações/mudanças.

### 9. Commit e push da iteração

Ao final da execução da spec (após QA e relatório), rode:

```bash
bun run commit-and-push
```

- O comando analisa as mudanças pendentes, gera mensagem **Conventional Commits**, faz `git add -A`, commit com co-author **Joaldo Lima** e `git push`.
- Se o push falhar por permissão/remote, o commit fica local — reporte a causa no relatório e reexecute quando resolvido.

### 10. Relatório final

Resumo conciso: o que foi implementado, como validar no navegador/API, portões de QA executados, o estado do commit/push, e pendências registradas.

## Lembrete operacional

- **Faça**, não apenas diga: toda etapa de implementação exige arquivos reais e validação.
- Se travar em uma decisão, retorne à `feature-concept` para perguntar — nunca escolha em silêncio quando o usuário precisa decidir.
- Ao finalizar, deixe o repositório consistente com o plano, ADRs e Q&As registradas.
