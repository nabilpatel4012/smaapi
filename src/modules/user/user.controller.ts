import { FastifyRequest, FastifyReply } from "fastify";
import z from "zod";
import { createUser, findUserByEmail, verifyPassword } from "./user.service";
import { httpError } from "../../utils/http";
import { StatusCodes } from "http-status-codes";
import { logger } from "../../utils/logger";
import { createUserSchema, loginUserSchema } from "./user.schema";
import { PostgresError } from "postgres";

export async function createUserHandler(
  req: FastifyRequest<{
    Body: z.infer<typeof createUserSchema.body>;
  }>,
  reply: FastifyReply
) {
  const { email, password } = req.body;

  try {
    await createUser({ email, password }, req.db);

    return reply.code(StatusCodes.CREATED).send({
      message: "User created successfully",
    });
  } catch (e) {
    const error = e as PostgresError;

    if (error.code === "23505") {
      return httpError({
        reply,
        message: "User already exists",
        code: StatusCodes.CONFLICT,
      });
    }
    logger.error({ error }, "createUser: error creating user");
    return httpError({
      reply,
      message: "Error creating user",
      code: StatusCodes.BAD_REQUEST,
      cause: error.message,
    });
  }
}

export async function loginUserHandler(
  req: FastifyRequest<{
    Body: z.infer<typeof loginUserSchema.body>;
  }>,
  reply: FastifyReply
) {
  const { email, password } = req.body;

  try {
    const user = await findUserByEmail({ email }, req.db);

    if (!user || !user?.password) {
      return httpError({
        reply,
        message: "invalid email or password",
        code: StatusCodes.UNAUTHORIZED,
      });
    }

    const isValidPassword = await verifyPassword({
      candidatePassword: password,
      hashedPassword: user.password,
    });

    if (!isValidPassword) {
      return httpError({
        reply,
        message: "invalid email or password",
        code: StatusCodes.UNAUTHORIZED,
        cause: "invalid password",
      });
    }

    req.session.set("userId", user.id);

    return "Logged in successfully";
  } catch (error) {
    logger.error({ error }, "loginUser: error logging in user");

    return httpError({
      reply,
      message: "Error logging in user",
      code: StatusCodes.BAD_REQUEST,
    });
  }
}

export async function getCurrentUserHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  return reply.send(request.user);
}

export async function logoutUserHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  request.session.delete();

  return reply.send({
    message: "Logged out successfully",
  });
}
