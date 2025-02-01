import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import * as schema from "./schema";
import { config } from "../config";

export async function setupDB(url: string | undefined = config.DATABASE_URL) {
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = postgres(url, {});

  const db = drizzle(client, {
    schema,
  });

  return { client, db };
}

export async function ping(db: DB) {
  return db.execute(sql`SELECT 1`);
}

export type DB = Awaited<ReturnType<typeof setupDB>>["db"];

export type Client = Awaited<ReturnType<typeof setupDB>>["client"];

export async function teardownDB(client: Client) {
  await client.end();
}
