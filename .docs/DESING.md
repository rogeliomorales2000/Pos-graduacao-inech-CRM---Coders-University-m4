# Design

Diretrizes visuais e de UX para construir interfaces do produto. Componentes e tokens ficam no `DESING_SYSTEM.md`; aqui estão os princípios de uso.

> Toda alteração de UI **exige** carregar as skills obrigatórias (`frontend-design`, `web-design-guidelines`) — ver `AGENTS.md`.

## Princípios

1. **Clareza primeiro** — cada tela comunica uma intenção; remova ruído.
2. **Consistência** — reutilize os componentes do design system; nunca crie variações soltas.
3. **Hierarquia visual** — uma ação principal por seção; contraste guia o olhar.
4. **Responsividade** — interfaces funcionam em mobile, tablet e desktop.
5. **Acessibilidade** — contraste adequado, navegação por teclado, textos alternativos.

## Estados das interfaces

Toda superfície interativa deve definir:

| Estado      | Regra                                        |
| ----------- | -------------------------------------------- |
| **Loading** | Indicar carregamento; nunca deixar tela muda |
| **Empty**   | Explicar o que o usuário pode fazer          |
| **Error**   | Mensagem clara + caminho de recuperação      |
| **Success** | Confirmar a ação concluída                   |

## Como aplicar

- Use os tokens e variantes definidos no `DESING_SYSTEM.md`.
- Ao introduzir um novo padrão visual, proponha-o como componente no design system antes de colar no app.
- Em dúvida sobre identidade visual (tipografia, cor, tom), consulte a visão de produto em `izanami.md`.
