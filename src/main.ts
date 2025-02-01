import { config } from "./config";
import { ping, setupDB } from "./db";
import { logger } from "./utils/logger";
import { prom } from "./utils/metrics";
import { buildServer } from "./utils/server";

const { PORT, HOST } = config;

async function main() {
  const { db } = await setupDB(config.DATABASE_URL);
  try {
    await ping(db);
    logger.info("database connected");
  } catch (e) {
    logger.error(e, "ping failed");
    process.exit(1);
  }
  const server = await buildServer({
    db,
  });
  try {
    await server.listen({ port: PORT, host: HOST });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
  logger.info(config, "using config");
  await server.ready();
  prom.collectDefaultMetrics({
    prefix: config.METRICS_PREFIX,
  });
}

main();
