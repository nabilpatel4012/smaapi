// // import { createUserHandler } from "./user.controller";
// import { type FastifyInstance } from "fastify";
// import { createUserSchema } from "./user.schema";
// import { ZodTypeProvider } from "fastify-type-provider-zod";

// export async function userRouter(server: FastifyInstance) {
//   server.withTypeProvider<ZodTypeProvider>().post("/", {
//     schema: createUserSchema,
//     // handler: createUserHandler,
//   });
// }
