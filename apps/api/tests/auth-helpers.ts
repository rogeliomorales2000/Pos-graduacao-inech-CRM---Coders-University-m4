import { randomUUID } from "node:crypto";

import type { EmailService } from "@/lib/auth/email";
import { hashPassword } from "@/lib/auth/passwords";
import type { User } from "@/lib/auth/users";
import { db } from "@/lib/db";

export interface CapturedEmail {
  type: "confirmation" | "new-session" | "reset" | "reset-success";
  to: string;
  link?: string;
}

export function createCapturingEmailService() {
  const emails: CapturedEmail[] = [];
  const service: EmailService = {
    async sendConfirmationEmail({ to, confirmationLink }) {
      emails.push({ type: "confirmation", to, link: confirmationLink });
    },
    async sendNewSessionEmail({ to }) {
      emails.push({ type: "new-session", to });
    },
    async sendPasswordResetEmail({ to, resetLink }) {
      emails.push({ type: "reset", to, link: resetLink });
    },
    async sendPasswordResetSuccess({ to }) {
      emails.push({ type: "reset-success", to });
    },
  };
  return { service, emails };
}

export function tokenFromLink(link: string | undefined): string {
  if (!link) {
    return "";
  }
  return new URL(link).searchParams.get("token") ?? "";
}

export interface TestUserOptions {
  email?: string;
  phone?: string;
  password?: string;
  confirmed?: boolean;
}

export interface TestUser {
  user: User;
  email: string;
  phone: string;
  password: string;
}

export async function createTestUser(
  options: TestUserOptions = {},
): Promise<TestUser> {
  const id = randomUUID();
  const email = options.email ?? `user-${id}@example.com`;
  const phone = options.phone ?? "+5511999999999";
  const password = options.password ?? "password123";
  const passwordHash = await hashPassword(password);
  const confirmedAt = options.confirmed === true ? new Date() : null;

  const rows = await db<User[]>`
    insert into users (first_name, last_name, email, phone, password_hash, confirmed_at)
    values ('Test', 'User', ${email}, ${phone}, ${passwordHash}, ${confirmedAt})
    returning id, first_name, last_name, email, phone, password_hash,
              confirmed_at, created_at, updated_at
  `;
  const user = rows[0];
  if (!user) {
    throw new Error("createTestUser: no row returned");
  }
  return { user, email, phone, password };
}

export async function deleteUsers(ids: string[]): Promise<void> {
  if (ids.length > 0) {
    await db`delete from users where id = any(${ids})`;
  }
}
