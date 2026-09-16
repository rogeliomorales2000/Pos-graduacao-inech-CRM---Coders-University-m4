# Regras

Regras de **processo** do projeto. Todo agente e desenvolvedor deve cumpri-las em cada iteração.

## 1. Plano antes de codar

Antes de iniciar qualquer desenvolvimento, monte um plano e salve em:

```
./.plans/[spec-file-name]-plan.md
```

O plano deve descrever o problema, a abordagem e os passos de implementação.

## 2. Elicitação de requisitos

Para construir o plano, **é obrigatório** usar a skill `feature-concept` para fazer todas as perguntas necessárias e obter um entendimento completo e acertivo do que deve ser implementado.

## 3. Checklist de fim de iteração

Ao final de cada iteração, entregue:

1. **Decisões arquiteturais**
   - Crie um **ADR (Architecture Decision Record)** em `./adrs/*.md` com suas decisões.
   - Imprima um resumo das decisões no relatório.
2. **Lista de passos manuais de QA** da tarefa.
3. **Lista de arquivos modificados**.
4. **Lista de bibliotecas instaladas**.
5. **Racionais** baseados nas decisões/implementações/mudanças realizadas.

## 4. Commit e push ao final da iteração

Ao final de cada iteração (spec concluída), rode `bun run commit-and-push`:

- Analisa as mudanças pendentes e gera mensagem no padrão **Conventional Commits**.
- Executa `git add -A`, cria o commit com o co-author **Joaldo Lima** e faz `git push`.
- Se o push falhar (ex.: remote sem acesso de escrita), o commit fica criado localmente — corrija a causa e rode novamente.
- Para mensagem customizada: `bun run commit-and-push --message "<mensagem>"`.

## Referências

- `AGENTS.md` — contrato operacional e índice da documentação.
- `QA.md` — portões de qualidade a rodar antes de entregar.
