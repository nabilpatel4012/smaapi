import { FastifyReply, FastifyRequest } from "fastify";
import { PostgresError as PostgresErrorEnum } from "pg-error-enum";
import { PostgresError } from "postgres";
import {
  CreateApplicationBody,
  UpdateApplicationBody,
  UpdateApplicationParams,
} from "./application.schema";
import {
  createApplication,
  getApplicationById,
  updateApplication,
} from "./application.service";
import { httpError } from "../../utils/http";
import { StatusCodes } from "http-status-codes";
import { getJobById } from "../job/job.service";
import { logger } from "../../utils/logger";

export async function createApplicationHandler(
  request: FastifyRequest<{
    Body: CreateApplicationBody;
  }>,
  reply: FastifyReply
) {
  try {
    const result = await createApplication(
      {
        ...request.body,
        userId: request.user!.id,
      },
      request.db
    );

    return reply.status(StatusCodes.CREATED).send(result);
  } catch (error) {
    if (error instanceof PostgresError) {
      logger.error({ error, body: request.body }, "database error");

      if (error.code === PostgresErrorEnum.UNIQUE_VIOLATION) {
        return httpError({
          reply,
          message: "Application already exists",
          code: StatusCodes.CONFLICT,
        });
      }

      if (error.code === PostgresErrorEnum.FOREIGN_KEY_VIOLATION) {
        return httpError({
          reply,
          message: "Job not found",
          code: StatusCodes.NOT_FOUND,
        });
      }
    }

    logger.error(
      { error, body: request.body },
      "createApplicationHandler: unexpected error"
    );

    return httpError({
      reply,
      message: "Failed to create application",
      code: StatusCodes.INTERNAL_SERVER_ERROR,
    });
  }
}

export async function updateApplicationHandler(
  request: FastifyRequest<{
    Params: UpdateApplicationParams;
    Body: UpdateApplicationBody;
  }>,
  reply: FastifyReply
) {
  try {
    const application = await getApplicationById(
      request.params.applicationId,
      request.db
    );

    if (!application) {
      return httpError({
        reply,
        message: "Application not found",
        code: StatusCodes.NOT_FOUND,
      });
    }

    const job = await getJobById(
      {
        id: application.jobId,
        userId: request.user!.id,
      },
      request.db
    );

    if (!job) {
      return httpError({
        reply,
        message: "Job not found",
        code: StatusCodes.NOT_FOUND,
      });
    }

    const result = await updateApplication(
      request.params.applicationId,
      request.body,
      request.db
    );

    return reply.send(result);
  } catch (error) {
    logger.error(
      { error, params: request.params, body: request.body },
      "updateApplicationHandler: failed to update application"
    );

    return httpError({
      reply,
      message: "Failed to update application",
      code: StatusCodes.INTERNAL_SERVER_ERROR,
    });
  }
}
