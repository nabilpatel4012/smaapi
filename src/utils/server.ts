import "reflect-metadata";
import fastify, { FastifyInstance } from "fastify";
import { config } from "../config";
import { logger } from "./logger";
import { ping } from "../db/db";
import { registerSwagger } from "../common/plugins/swagger";
import { registerCors } from "../common/plugins/cors";
import { registerMetrics } from "../common/plugins/prometheus";
import { registerUserRoutes } from "../routes/user.routes";
import { registerHealthRoutes } from "../routes/common.routes";
import auth from "../common/plugins/auth";
import cookie, { FastifyCookieOptions } from "@fastify/cookie";
import { registerCoreRoutes } from "../routes/core.routes";

class Application {
  server: FastifyInstance;

  constructor() {
    this.server = fastify();
  }

  async registerPlugins() {
    await registerCors(this.server);
    await registerSwagger(this.server);
    await registerMetrics(this.server);
    await this.server.register(auth);
    await this.server.register(cookie, {
      secret: config.JWT_SECRET,
      parseOptions: {},
    } as FastifyCookieOptions);
  }

  async registerRoutes() {
    await registerUserRoutes(this.server);
    await registerCoreRoutes(this.server);
    await registerHealthRoutes(this.server);
  }

  async startServer() {
    try {
      await this.server.listen({ host: config.HOST, port: config.PORT });
      logger.info(`Server running at http://${config.HOST}:${config.PORT}`);
    } catch (error) {
      logger.error("Server startup failed:", error);
      process.exit(1);
    }
  }
  async main() {
    await ping();
    await this.registerPlugins();
    await this.registerRoutes();
    await this.startServer();
  }
}

export default Application;
