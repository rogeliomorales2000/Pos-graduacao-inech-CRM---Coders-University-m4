# Design System

## Base

Toda interface (UI) será construída sobre **shadcn/ui** como camada de components. Isso significa que o design system deste projeto é uma especialização do shadcn — herdando suas primitivas (Radix UI) e filosofia de código copiado/versionado.

> **Status: alvo** — shadcn/Tailwind ainda não estão instalados. Ver `ARCHITECTURE.md` (backend não afetado).

## Onde os componentes vivem

- Componentes de UI ficam no package `@repo/ui` (`packages/ui/src/`).
- Componentes adicionados via shadcn devem seguir esse package para serem compartilhados entre os apps (`web`, `docs` e `app`).

## Principios

- **Acessibilidade** em primeiro lugar (primitivas Radix).
- **Tokens** para cor, tipografia e espaçamento — centralizados, sem valores mágicos.
- **Variantes** de componentes via `cva` (estilo shadcn).
- **Consistência**: mesma primitiva para o mesmo papel em todo o produto.

## Pendências de setup (início da implementação)

1. Instalar e configurar TailwindCSS.
2. Iniciar shadcn (`components.json`) apontando para `@repo/ui`.
3. Definir tokens iniciais (tema de cor, tipografia, espaçamento).
4. Documentar tokens no próprio design system conforme forem definidos.
