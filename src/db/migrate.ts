import "dotenv/config";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { config } from "../config";

async function run() {
  const { setupDB } = await import("./");
  const { db, client } = await setupDB(config.DATABASE_URL);
  await migrate(db, { migrationsFolder: "./migrations" });
  // Don't forget to close the connection, otherwise the script will hang
  await client.end();
}

run();
