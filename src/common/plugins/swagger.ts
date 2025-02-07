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
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT", // Optional: Specifies the token format
          },
        },
      },
      security: [
        { bearerAuth: [] }, // Make bearer auth global (can be overridden per route)
      ],
    },
  });

  await server.register(fastifySwaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      persistAuthorization: true, // Persist the authorization between page refreshes
    },
  });

  server.get("/docs.json", async () => server.swagger());
}
