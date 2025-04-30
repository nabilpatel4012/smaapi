import { FastifyInstance } from "fastify";
import { config } from "../config";
import { projectController } from "../modules/core/project/project.controller";
import { apiController } from "../modules/core/api/apis.controller";
import { tableController } from "../modules/core/tables/tables.controller";

export async function registerCoreRoutes(server: FastifyInstance) {
  server.register(projectController, {
    prefix: `${config.API_PREFIX}/core/projects`,
  });
  server.register(apiController, { prefix: `${config.API_PREFIX}/core/apis` });
  server.register(tableController, { prefix: `${config.API_PREFIX}/core` });
}
