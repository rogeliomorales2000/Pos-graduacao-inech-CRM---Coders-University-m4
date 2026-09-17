# Plano — Módulo de autenticação (auth-base + fluxos)

## Problema

As páginas de auth (`/auth/*`) são placeholders: `/auth/sign-in` não tem form e
`/auth/sign-up`, `/auth/confirm-account`, `/auth/forgot-password` e
`/auth/reset-password` não existem. Também não existe a fundação de auth
(tabela `users`, bcrypt, `EmailService`, tokens), impedindo qualquer fluxo real.
O usuário pediu os forms com campos de email/senha/telefone, aplicando as specs.

## Escopo (aprovado pelo usuário)

- **auth-base** (fundação): tabelas `users`, `email_confirmation_tokens`,
  `password_reset_tokens` + FK de `sessions`; bcrypt; `EmailService`
  (Mailtrap/Resend/handler de dev); validação; helpers de sessão.
- **sign-up**: `POST /api/v1/auth/sign-up` + página `/auth/sign-up`.
- **confirm-account**: `POST /api/v1/auth/confirm-account` + página
  `/auth/confirm-account` (dependência do sign-in).
- **sign-in**: `POST /api/v1/auth/sign-in` + `POST /api/v1/auth/resend-confirmation`
  + página `/auth/sign-in`.
- **forgot-password**: `POST /api/v1/auth/forgot-password` + página.
- **reset-password**: `POST /api/v1/auth/reset-password` + página.

Fora de escopo: OAuth, MFA, OTP/SMS, roles/permissões, rate limiting robusto,
"log out everywhere" (já coberto parcialmente), Tailwind/shadcn (alvo).

## Abordagem

Implementar na ordem de dependência, cada camada testável antes da próxima.
Banco via migration Supabase CLI; senha com bcrypt; token sempre hashado
(sha-256); sessão única por pessoa (revogar anteriores + criar nova);
`EmailService` com provider selecionado por `EMAIL_PROVIDER` e fallback de dev
que loga o email (permite validar sem credenciais).

## Q&As da feature-concept

- **Escopo agora?** auth-base + os forms (backend real), incluindo
  confirm-account como dependência do sign-in.
- **Quais páginas?** sign-in, sign-up, forgot-password, reset-password
  (+ confirm-account por dependência).
- **Ordem?** dependência: auth-base → sign-up → confirm-account → sign-in →
  forgot-password → reset-password.
- **Provider de email em dev?** fallback que loga o conteúdo (sem credenciais);
  Mailtrap/Resend via env quando configurados.
- **Erros?** `{ error: { code, message } }`, textos en-us.

## Passos de implementação

1. Migration `supabase/migrations/<ts>_auth.sql`: `users`,
   `email_confirmation_tokens`, `password_reset_tokens`, FK de `sessions`.
2. `@apps/api`: instalar `bcrypt`; criar `lib/auth/passwords.ts`,
   `lib/auth/tokens.ts`, `lib/auth/email/*`, `lib/auth/validation.ts`;
   `revokeAllSessionsForUser` em `sessions.ts`.
3. Endpoints:
   - `app/api/v1/auth/sign-up/route.ts`
   - `app/api/v1/auth/confirm-account/route.ts`
   - `app/api/v1/auth/sign-in/route.ts`
   - `app/api/v1/auth/resend-confirmation/route.ts`
   - `app/api/v1/auth/forgot-password/route.ts`
   - `app/api/v1/auth/reset-password/route.ts`
4. Testes Vitest/Supertest por endpoint (sucesso + erros principais).
5. `@apps/app`: funções de API e páginas dos 5 fluxos; rotas em `App.tsx`;
   estilos de form no `index.css` (skills `frontend-design` +
   `web-design-guidelines`).
6. Remover a rota temporária `dev-session` ao final (não faz parte das specs).
7. QA: `bun run lint`, `bun run check-types`, `bun run format`, `bun run test`.
8. Atualizar status das specs e criar ADR `0005-auth-module.md`.

## Critérios de aceite (consolidados)

- Migration aplica sem quebrar; tabelas com colunas/índices/unicidade.
- Senha nunca em texto puro; tokens hashados; cookie httpOnly.
- sign-up: 201 feliz; 409 duplicado; 400 mismatch/validação; email com link.
- confirm-account: token válido confirma + cria sessão; expirado/consumido/
  inválido erram sem efeito.
- sign-in: credenciais corretas → sessão nova e anteriores revogadas; telefone/
  senha errados → genérico; não confirmada → 403 + reenvio.
- forgot/reset: forgot sempre genérico; reset válido troca senha, consome token,
  revoga sessões, email de sucesso; mismatch/erros sem efeito.
- UI: forms acessíveis (labels, foco, erros), estados loading/erro/sucesso,
  navegação entre páginas; guard continua funcionando.
- lint/check-types/test passam.

## Riscos

- bcrypt é módulo nativo (build). Fallback: `bcryptjs` (com registro em ADR/Q&A).
- Disco em 99% (~450 MB): instalar deps e rodar testes pode exigir limpeza.
- Testes com banco real: precisam do Postgres do docker-compose de pé.
