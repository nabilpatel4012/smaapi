import { FastifyInstance } from "fastify";

export async function registerHealthRoutes(server: FastifyInstance) {
  server.get("/healthcheck", async () => ({ status: "ok" }));
}
