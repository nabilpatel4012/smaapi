import { Database } from "./kysley.schema";
import { createPool } from "mysql2";
import { Kysely, MysqlDialect, sql } from "kysely";
import { config } from "../config";
import "dotenv/config";
import { logger } from "../utils/logger";

const dialect = new MysqlDialect({
  pool: createPool({
    database: config.DATABASE_NAME,
    host: config.DATABASE_HOST,
    user: config.DATABASE_USERNAME,
    password: config.DATABASE_PASSWORD,
    port: config.DATABASE_PORT,
    connectionLimit: 200,
  }),
});

export const db = new Kysely<Database>({
  dialect,
});

export async function ping() {
  try {
    const query = sql`select 1`.compile(db);
    await db.executeQuery(query);
    console.log("DB CONNECTION SUCCESS");
  } catch (error) {
    logger.info(config);
    console.error("DB CONNECTION FAILED:", error);
    process.exit(1);
  }
}
