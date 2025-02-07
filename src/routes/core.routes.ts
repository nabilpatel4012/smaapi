import { FastifyInstance } from "fastify";
import { coreController } from "../modules/core/ core.controller";
import { config } from "../config";
import { projectController } from "../modules/core/project/project.controller";

export async function registerCoreRoutes(server: FastifyInstance) {
  server.register(coreController, { prefix: `${config.API_PREFIX}/core` });
  server.register(projectController, {
    prefix: `${config.API_PREFIX}/core/projects`,
  });
}
