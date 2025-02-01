import {
  createUserHandler,
  getCurrentUserHandler,
  loginUserHandler,
  logoutUserHandler,
} from "./user.controller";
import { type FastifyInstance } from "fastify";
import {
  createUserSchema,
  getCurrentUserSchema,
  loginUserSchema,
  logoutUserSchema,
} from "./user.schema";
import { ZodTypeProvider } from "fastify-type-provider-zod";

export async function userRouter(server: FastifyInstance) {
  server.withTypeProvider<ZodTypeProvider>().post("/", {
    schema: createUserSchema,
    handler: createUserHandler,
  });

  server.post("/sessions", {
    schema: loginUserSchema,
    handler: loginUserHandler,
  });

  server.delete("/sessions", {
    preHandler: [server.authenticate],
    handler: logoutUserHandler,
    schema: logoutUserSchema,
  });

  server.get("/me", {
    preHandler: [server.authenticate],
    handler: getCurrentUserHandler,
    schema: getCurrentUserSchema,
  });
}
