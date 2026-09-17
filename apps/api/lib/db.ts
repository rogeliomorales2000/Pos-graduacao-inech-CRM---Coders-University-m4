import postgres, { type Sql } from "postgres";

const connectionString =
  process.env.DB_URL ??
  "postgresql://postgres:postgres@localhost:54322/postgres";

const globalForDb = globalThis as unknown as { cu4Pg?: Sql };

export const db: Sql =
  globalForDb.cu4Pg ?? postgres(connectionString, { max: 5 });

if (process.env.NODE_ENV !== "production") {
  globalForDb.cu4Pg = db;
}
