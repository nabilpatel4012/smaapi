import { FastifyReply } from "fastify";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";

export function httpError({
  reply,
  message,
  code,
  cause,
}: {
  reply: FastifyReply;
  message: string;
  code: StatusCodes;
  cause?: string;
}) {
  return reply.status(code).send({
    message,
    cause,
  });
}

export const httpErrorSchema = z.object({
  message: z.string(),
  cause: z.string().optional(),
});

export const errorResponses = {
  404: httpErrorSchema,
  400: httpErrorSchema,
  401: httpErrorSchema,
  500: httpErrorSchema,
};
