import { userRouter } from "../modules/user/user.router";
import Fastify, { FastifyReply, FastifyRequest } from "fastify";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import fastifyCookie from "@fastify/cookie";
import fastifySession from "@fastify/secure-session";
import { promises as fs } from "fs";
import { version } from "../../package.json";
import { config } from "../config";
import { prom, reqReplyTime } from "./metrics";
import path from "path";
import { getUserById } from "../modules/user/user.service";
import { DB } from "../db";
import { jobRouter } from "../modules/job/job.router";
import { applicationRouter } from "../modules/application/application.router";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";

declare module "fastify" {
  interface FastifyRequest {
    user: Awaited<ReturnType<typeof getUserById>> | null;
    db: DB;
  }

  interface FastifyInstance {
    authenticate: typeof authenticate;
  }
}

declare module "@fastify/secure-session" {
  interface SessionData {
    userId: string;
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (!request.user) {
    reply.code(401).send({ message: "Unauthorized" });
  }
}

export async function buildServer({ db }: { db: DB }) {
  const fastify = Fastify({
    logger: true,
  });

  // Add schema validator and serializer
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  fastify.register(fastifyCookie);

  fastify.addHook("onRequest", async (req) => {
    req.db = db;
  });

  fastify.addHook("onResponse", reqReplyTime);

  const secretKey = await fs.readFile(path.join(process.cwd(), "session-key"));

  fastify.register(fastifySession, {
    // the name of the attribute decorated on the request-object, defaults to 'session'
    sessionName: "session",
    // the name of the session cookie, defaults to value of sessionName
    cookieName: config.COOKIE_NAME,
    // adapt this to point to the directory where secret-key is located
    key: secretKey,
    // the amount of time the session is considered valid; this is different from the cookie options
    // and based on value wihin the session.
    expiry: 24 * 60 * 60, // Default 1 day
    cookie: {
      path: "/",
      // options for setCookie, see https://github.com/fastify/fastify-cookie
    },
  });

  fastify.addHook("onRequest", async (req) => {
    const userId = req.session.get("userId");

    if (userId) {
      try {
        // Fetch the user from your database
        const user = await getUserById(userId, req.db);
        req.user = user;
      } catch {
        // If user not found or error occurs, set user to null
        req.user = null;
      }
    } else {
      req.user = null;
    }
  });

  fastify.decorate("authenticate", authenticate);

  await fastify.register(fastifySwagger, {
    openapi: {
      openapi: "3.0.0",
      info: {
        title: "Job Board API",
        description: "API for the Job Board",
        version,
      },
      servers: [
        {
          url: `http://localhost:${config.PORT}`,
          description: "Development server",
        },
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
    transform: jsonSchemaTransform,
  });

  await fastify.register(fastifySwaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "full",
      deepLinking: false,
    },
  });

  fastify.after(() => {
    fastify.register(userRouter, { prefix: "/v1/users" });
    fastify.register(jobRouter, { prefix: "/v1/jobs" });
    fastify.register(applicationRouter, { prefix: "/v1/applications" });

    fastify.get("/docs.json", async () => {
      return fastify.swagger();
    });

    fastify.get("/metrics", async (_, reply) => {
      reply.header("Content-Type", prom.register.contentType);

      return prom.register.metrics();
    });

    fastify.get("/healthcheck", async () => {
      return { status: "ok" };
    });
  });

  return fastify;
}
