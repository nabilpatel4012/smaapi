import path from "path";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { beforeEach, afterAll, beforeAll } from "vitest";
import { Client, DB, setupDB, teardownDB } from "../db";
import { sql } from "drizzle-orm";

let container: StartedPostgreSqlContainer;
let dbClient: Client;
let db: DB;

const timeout = 30_000;

beforeAll(async () => {
  container = await new PostgreSqlContainer().start();

  const DATABASE_URL = container.getConnectionUri();
  process.env.DATABASE_URL = DATABASE_URL;

  const database = await setupDB(DATABASE_URL);
  dbClient = database.client;
  db = database.db;

  const migrationsFolder = path.join(process.cwd(), "migrations");
  await migrate(db, {
    migrationsFolder,
  });
}, timeout);

beforeEach(async () => {
  await db.execute(sql`
    TRUNCATE TABLE users CASCADE;
    TRUNCATE TABLE jobs CASCADE;
    TRUNCATE TABLE applications CASCADE;
  `);
});

afterAll(async () => {
  await teardownDB(dbClient);
  await container?.stop();
}, timeout);

export { db };
