---
description: Gera mensagem conventional-commits, faz git add, commit com co-author Joaldo Lima e git push.
agent: build
---

Execute o comando de encerramento da iteração neste repositório:

```bash
bun run commit-and-push $ARGUMENTS
```

Regras:

- Rode exatamente esse comando (opcionalmente com `--message "<header>"` e/ou `--no-push`).
- Não faça commit manual por fora: o script lê `git status`, gera a mensagem **Conventional Commits**, valida no `commitlint`, executa `git add -A`, commita com o trailer `Co-authored-by: Joaldo Lima` e faz `git push`.
- Se não houver mudanças, ele informa que a árvore está limpa e sai sem erro.
- Se o push falhar (permissão/remote), reporte a causa e mantenha o commit local; não use `--force`.
- Ao terminar, mostre: hash e header do commit, arquivos incluídos e o resultado do push.
