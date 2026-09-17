---
title: Sign-out (encerrar sessão)
status: concluido
created: 2026-09-17
updated: 2026-09-17
owner: izanami
type: feature
---

# Sign-out

## Resumo

Permite ao usuário autenticado encerrar a sessão corrente na plataforma. Um botão de sign-out na área privada (`/app/*` — na home) chama `POST /api/v1/auth/sign-out`, que revoga a sessão atual (`sessions.revoked_at`), limpa o cookie httpOnly (`session`) e redireciona para `/auth/sign-in`. Apenas a sessão corrente é encerrada (a política "uma sessão por pessoa" continua valendo nas demais).

## Contexto

Depende da `auth-base`, que já define: tabela `sessions`, helper de leitura de sessão por cookie httpOnly, revogação de sessões e roteamento `/auth/*` público vs `/app/*` privado. O logout estava registrado como backlog da `auth-base` e foi promovido a spec por pedido explícito. Placeholder de home (`/app/home`) abriga o botão até a home real existir.

## Necessidade de negócio

É a contrapartida do login: sem encerrar sessão, o usuário não consegue trocar de conta com segurança em máquina compartilhada, e "a última sessão é a válida" fica desprovida de um logout explícito na sessão atual. Fecha o ciclo básico de auth exigido implicitamente pelo prompt.

- Personas afetadas: todos os usuários da plataforma.
- Métrica de sucesso: sign-out revoga a sessão, limpa o cookie e devolve o usuário ao sign-in; reutilizar a sessão revogada não dá acesso.

## Escopo

- `@apps/app` — botão/ação de sign-out na área privada (`/app/home` placeholder) e redirecionamento para `/auth/sign-in`.
- `@apps/api` — endpoint `POST /api/v1/auth/sign-out`.

### Inclui (MVP)

- `POST /api/v1/auth/sign-out`: lê a sessão atual pelo cookie httpOnly, marca `sessions.revoked_at`, limpa o cookie (`session`) e retorna 200.
- Idempotência: chamar sign-out sem sessão válida retorna 200 (sem erro) — o cliente já estava sem sessão.
- Cliente: ao clicar, chama a API, garante cookie limpo e navega para `/auth/sign-in` (estado loading no botão).
- O guard da `auth-base` passa a barrar `/app/*` após o sign-out (sessão revogada).

### Não inclui (fora de escopo)

- Encerrar **todas** as sessões de outras máquinas ("log out everywhere") — backlog.
- Deleção de conta, inatividade/timer de sessão.
- Confirmação visual elaborada / segundos avisos (MVP: ação direta + feedback).
- Estados de erro além do mínimo (erro de rede → mensagem simples e sem prender o usuário).

## Requisitos

### Funcionais

- [ ] Como usuário autenticado, quero clicar em sign-out, para encerrar minha sessão com segurança.
- [ ] Como usuário, quero ser levado para `/auth/sign-in` após sair, para poder logar de novo ou trocar de conta.
- [ ] Como usuário, quero que o acesso a `/app/*` fique bloqueado após sair, para que ninguém use minha sessão.

### Não-funcionais

- **Segurança**: somente a sessão identificada pelo cookie é revogada; cookie httpOnly é limpo; não logar o token da sessão.
- **Idempotência**: sign-out repetido/indisponível não gera erro falso (sempre 200 quando não há sessão ativa).
- **Consistência**: textos en-us; erros `{ error: { code, message } }`.

## Regras de negócio

- Revogar a **sessão corrente** (a apontada pelo cookie `session`); outras sessões do mesmo usuário (de outras máquinas) permanecem — a "última vence" continua regendo.
- Cookie `session` é removido na resposta (mesmo que o cookie não exista mais — idempotente).
- Após revogar, qualquer request com aquele `token_hash` é tratado como não autenticado (guard redireciona).
- Retorno 200 independente de sessão presente ou não.

## Dados e integrações

- **POST `/api/v1/auth/sign-out`** — request: cookie `session`; response 200 com cookie limpo.
- **Tabelas**: atualiza `sessions.revoked_at = now()` da sessão corrente.
- **Integrações externas**: nenhuma (sem email neste fluxo).

## UX e estados de interface

- Ação disponível na área privada: botão **"Sign out"** no placeholder `/app/home`.
- Estados: idle → loading (clique) → redireciona para `/auth/sign-in`; erro de rede → mensagem simples com retry (sem travar o usuário).
- Após sair, o guard de `/app/*` redireciona para `/auth/sign-in` em qualquer nova navegação.

## Critérios de aceite

- [ ] `POST /api/v1/auth/sign-out` com sessão válida: marca `revoked_at` da sessão corrente, limpa o cookie `session` e retorna 200 (Supertest).
- [ ] `POST /api/v1/auth/sign-out` sem cookie/sessão: retorna 200 sem erro (idempotente).
- [ ] Após o sign-out, uma requisição autenticada com a sessão antiga é barrada (guard/helpers retornam não autenticado).
- [ ] Na UI, clicar em "Sign out" redireciona para `/auth/sign-in`; voltar para `/app/home` é bloqueado pelo guard (Playwright/E2E ou teste de componente).
- [ ] Outras sessões do mesmo usuário (outra máquina) **não** são revogadas por esse sign-out (consultável/testável).
- [ ] `bun run lint` e `bun run check-types` passam em `@apps/api` e `@apps/app`.

## Decisões técnicas e riscos

- **Revoga só a sessão corrente**: premissa do MVP ("log out everywhere" fica no backlog); o prompt pede sessão única mas a escolha de sair "em tudo" é perfil de usuário, não do sign-out.
- **Idempotente e sem segredos**: resposta 200 sempre; não acusa presença/ausência de sessão (evita enumeração trivial).
- **Cookie httpOnly**: limpar via mesmo atributo (max-age 0/expíre), não depende de JS.
- **Rollback**: reverter endpoint/botão; sessões revogadas são inócuas.

## Backlog / desejáveis

- "Log out from all devices" (revogar todas as sessões do usuário num clique).
- Confirmação/undo e mensagens mais ricas (ex.: "You've been signed out. See you soon!").
- Timer de inatividade + sign-out automático.

## Q&A registradas

- **Sign-out revoga sessões de outras máquinas?** R: **não** — apenas a sessão corrente (a "última vence" das outras segue válida). "Log out everywhere" fica no backlog.
- **Sem sessão, sign-out falha?** R: **não** — retorna 200 idempotente e redireciona para sign-in.
- **Onde fica o botão no MVP?** R: no placeholder `/app/home` (única tela privada até a home real existir).
- **Por que entra na ordem 2, antes do sign-up?** R: depende apenas da `auth-base` (sessões/cookie/guard) e dá retorno imediato no placeholder de home; `sign-up`/`sign-in` não são pré-requisitos para existir uma sessão (a confirmação de conta também cria sessão).
