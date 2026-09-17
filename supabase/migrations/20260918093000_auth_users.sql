-- Auth: fundação do domínio (usuários e tokens).
-- Depende da migration de sessões e completa a FK de sessions.user_id -> users.
-- Fluxos (sign-up, confirm-account, sign-in, forgot/reset) constroem sobre esta base.

create table public.users (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null unique,
  phone text not null,
  password_hash text not null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sessões órfãs (criadas antes da existência de users) não podem violar a FK.
delete from public.sessions where user_id not in (select id from public.users);

alter table public.sessions
  add constraint sessions_user_id_fkey
  foreign key (user_id) references public.users (id) on delete cascade;

create table public.email_confirmation_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index email_confirmation_tokens_user_id_idx
  on public.email_confirmation_tokens (user_id);

create table public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index password_reset_tokens_user_id_idx
  on public.password_reset_tokens (user_id);
