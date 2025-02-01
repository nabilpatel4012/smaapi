import { FastifyInstance } from "fastify";
import {
  createApplicationHandler,
  updateApplicationHandler,
} from "./application.controller";
import {
  createApplicationSchema,
  updateApplicationSchema,
} from "./application.schema";
import { ZodTypeProvider } from "fastify-type-provider-zod";

export async function applicationRouter(server: FastifyInstance) {
  server.withTypeProvider<ZodTypeProvider>().post("/", {
    schema: createApplicationSchema,
    preHandler: [server.authenticate],
    handler: createApplicationHandler,
  });

  server.withTypeProvider<ZodTypeProvider>().patch("/:applicationId", {
    schema: updateApplicationSchema,
    preHandler: [server.authenticate],
    handler: updateApplicationHandler,
  });
}
