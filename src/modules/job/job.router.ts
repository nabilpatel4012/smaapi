import { type FastifyInstance } from "fastify";
import {
  crateJobSchema,
  getJobApplicationSchema,
  getJobApplicationsSchema,
  getJobSchema,
  getJobsSchema,
  updateJobSchema,
} from "./job.schema";
import {
  createJobHandler,
  getJobApplicationHandler,
  getJobApplicationsHandler,
  getJobHandler,
  getJobsHandler,
  updateJobHandler,
} from "./job.controller";
import { ZodTypeProvider } from "fastify-type-provider-zod";

export async function jobRouter(server: FastifyInstance) {
  server.withTypeProvider<ZodTypeProvider>().post("/", {
    schema: crateJobSchema,
    preHandler: [server.authenticate],
    handler: createJobHandler,
  });

  server.withTypeProvider<ZodTypeProvider>().get("/", {
    schema: getJobsSchema,
    handler: getJobsHandler,
  });

  server.withTypeProvider<ZodTypeProvider>().get("/:slug", {
    schema: getJobSchema,
    handler: getJobHandler,
  });

  server.withTypeProvider<ZodTypeProvider>().patch("/:jobId", {
    schema: updateJobSchema,
    preHandler: [server.authenticate],
    handler: updateJobHandler,
  });

  server.withTypeProvider<ZodTypeProvider>().get("/:jobId/applications", {
    schema: getJobApplicationsSchema,
    handler: getJobApplicationsHandler,
  });

  server
    .withTypeProvider<ZodTypeProvider>()
    .get("/:jobId/applications/:applicationId", {
      schema: getJobApplicationSchema,
      handler: getJobApplicationHandler,
    });
}
