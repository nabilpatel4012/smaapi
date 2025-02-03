import { FastifyInstance } from "fastify";
import { usersController } from "../modules/user/user.controller";
import { config } from "../config";

export async function registerUserRoutes(server: FastifyInstance) {
  server.register(usersController, { prefix: `${config.API_PREFIX}/users` });
}
