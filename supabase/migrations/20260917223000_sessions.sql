-- Auth: tabela de sessões.
-- Pré-requisito mínimo da spec sign-out (auth-base completa users/tokens depois).
-- user_id não referencia users ainda (tabela criada na auth-base) — sem FK por ora.

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

create index sessions_user_id_idx on public.sessions (user_id);
create index sessions_token_hash_idx on public.sessions (token_hash);