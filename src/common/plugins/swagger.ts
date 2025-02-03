import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { FastifyInstance } from "fastify";

export async function registerSwagger(server: FastifyInstance) {
  await server.register(fastifySwagger, {
    openapi: {
      openapi: "3.0.0",
      info: {
        title: "Smaapi",
        description: "APIs made easy",
        version: "1.0.0",
      },
      servers: [
        { url: "http://localhost:4000", description: "Smaapi Dev Server" },
      ],
      components: {
        securitySchemes: {
          cookieAuth: {
            type: "apiKey",
            name: "session",
            in: "cookie",
          },
        },
      },
    },
  });

  await server.register(fastifySwaggerUi, { routePrefix: "/docs" });

  server.get("/docs.json", async () => server.swagger());
}
