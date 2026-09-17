import { db } from "../db";

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password_hash: string;
  confirmed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface PublicUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  confirmed_at: Date | null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    phone: user.phone,
    confirmed_at: user.confirmed_at,
  };
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const rows = await db<User[]>`
    select id, first_name, last_name, email, phone, password_hash,
           confirmed_at, created_at, updated_at
    from users
    where email = ${normalizeEmail(email)}
    limit 1
  `;
  return rows[0] ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const rows = await db<User[]>`
    select id, first_name, last_name, email, phone, password_hash,
           confirmed_at, created_at, updated_at
    from users
    where id = ${id}
    limit 1
  `;
  return rows[0] ?? null;
}

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  passwordHash: string;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const rows = await db<User[]>`
    insert into users (first_name, last_name, email, phone, password_hash)
    values (
      ${input.firstName},
      ${input.lastName},
      ${normalizeEmail(input.email)},
      ${input.phone},
      ${input.passwordHash}
    )
    returning id, first_name, last_name, email, phone, password_hash,
              confirmed_at, created_at, updated_at
  `;
  const user = rows[0];
  if (!user) {
    throw new Error("createUser: no row returned");
  }
  return user;
}

export async function confirmUser(id: string): Promise<void> {
  await db`
    update users
    set confirmed_at = coalesce(confirmed_at, now()), updated_at = now()
    where id = ${id}
  `;
}

export async function updateUserPassword(
  id: string,
  passwordHash: string,
): Promise<void> {
  await db`
    update users
    set password_hash = ${passwordHash}, updated_at = now()
    where id = ${id}
  `;
}
