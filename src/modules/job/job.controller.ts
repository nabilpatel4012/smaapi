import { FastifyReply, FastifyRequest } from "fastify";

import {
  createJob,
  getJobById,
  getJobBySlug,
  getJobs,
  updateJob,
} from "./job.service";
import { httpError } from "../../utils/http";
import { StatusCodes } from "http-status-codes";
import { PostgresError } from "pg-error-enum";
import { logger } from "../../utils/logger";
import { PostgresError as PostgresErrorType } from "postgres";
import { z } from "zod";
import {
  crateJobSchema,
  getJobApplicationSchema,
  getJobApplicationsSchema,
  getJobSchema,
  getJobsSchema,
  updateJobSchema,
} from "./job.schema";
import {
  getJobApplication,
  getJobApplications,
} from "../application/application.service";

export async function createJobHandler(
  request: FastifyRequest<{ Body: z.infer<typeof crateJobSchema.body> }>,
  reply: FastifyReply
) {
  const { title, description, status, keywords, salary } = request.body;

  try {
    const result = await createJob(
      {
        title,
        description,
        status,
        keywords,
        salary,
        userId: request.user!.id,
      },
      request.db
    );
    return reply.status(201).send(result);
  } catch (error) {
    const e = error as PostgresErrorType;

    if (e.code === PostgresError.UNIQUE_VIOLATION) {
      return httpError({
        reply,
        message: "Job with that title already exists",
        code: StatusCodes.CONFLICT,
      });
    }

    return httpError({
      reply,
      message: "Failed to create job",
      code: StatusCodes.INTERNAL_SERVER_ERROR,
    });
  }
}

export async function getJobsHandler(
  request: FastifyRequest<{
    Querystring: z.infer<typeof getJobsSchema.querystring>;
  }>,
  reply: FastifyReply
) {
  try {
    const { search, limit, cursor } = request.query;

    const result = await getJobs({ search, limit, cursor }, request.db);

    return reply.status(200).send(result);
  } catch (error) {
    const e = error as PostgresErrorType;

    logger.error({ error }, "getJobs: failed to get jobs");

    return httpError({
      reply,
      message: "Failed to get jobs",
      code: StatusCodes.INTERNAL_SERVER_ERROR,
      cause: e.message,
    });
  }
}

export async function getJobHandler(
  request: FastifyRequest<{ Params: z.infer<typeof getJobSchema.params> }>,
  reply: FastifyReply
) {
  const { slug } = request.params;

  const result = await getJobBySlug(slug, request.db);

  if (!result) {
    return httpError({
      reply,
      message: "Job not found",
      code: StatusCodes.NOT_FOUND,
    });
  }

  return reply.status(200).send(result);
}

export async function updateJobHandler(
  request: FastifyRequest<{
    Params: z.infer<typeof updateJobSchema.params>;
    Body: z.infer<typeof updateJobSchema.body>;
  }>,
  reply: FastifyReply
) {
  const { jobId } = request.params;
  const body = request.body;

  const result = await updateJob({ id: jobId, ...body }, request.db);

  return reply.status(200).send(result);
}

export async function getJobApplicationsHandler(
  request: FastifyRequest<{
    Params: z.infer<typeof getJobApplicationsSchema.params>;
  }>,
  reply: FastifyReply
) {
  const { jobId } = request.params;

  const job = await getJobById(
    {
      id: jobId,
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

  const items = await getJobApplications(jobId, request.db);

  return reply.status(200).send({ items });
}

export async function getJobApplicationHandler(
  request: FastifyRequest<{
    Params: z.infer<typeof getJobApplicationSchema.params>;
  }>,
  reply: FastifyReply
) {
  const { jobId, applicationId } = request.params;

  const job = await getJobById(
    {
      id: jobId,
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

  const result = await getJobApplication({ jobId, applicationId }, request.db);

  if (!result) {
    return httpError({
      reply,
      message: "Application not found",
      code: StatusCodes.NOT_FOUND,
    });
  }

  return reply.status(200).send(result);
}
