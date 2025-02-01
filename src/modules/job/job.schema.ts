import { z } from "zod";
import { applications, jobs } from "../../db/schema";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { errorResponses } from "../../utils/http";

export const crateJobSchema = {
  tags: ["jobs"],
  body: createInsertSchema(jobs).omit({
    id: true,
    slug: true,
    createdAt: true,
    updatedAt: true,
    userId: true,
  }),
  response: {
    200: createSelectSchema(jobs),
    ...errorResponses,
  },
};

export const getJobsSchema = {
  tags: ["jobs"],
  querystring: z.object({
    search: z.string().optional(),
    limit: z
      .string()
      .optional()
      .transform((val) => parseInt(val!, 10)),
    cursor: z.string().optional(),
  }),
  response: {
    200: z.object({
      items: z.array(createSelectSchema(jobs)),
      nextCursor: z.string().optional(),
    }),
    ...errorResponses,
  },
};

export const getJobSchema = {
  tags: ["jobs"],
  params: z.object({
    slug: z.string(),
  }),
  response: {
    200: createSelectSchema(jobs),
    ...errorResponses,
  },
};

export const updateJobSchema = {
  tags: ["jobs"],
  params: z.object({
    jobId: z.string(),
  }),
  body: createUpdateSchema(jobs),
  response: {
    200: createUpdateSchema(jobs),
    ...errorResponses,
  },
};

export const getJobApplicationsSchema = {
  tags: ["jobs"],
  params: z.object({
    jobId: z.string(),
  }),
  response: {
    200: z.object({
      items: z.array(createSelectSchema(applications)),
    }),
    ...errorResponses,
  },
};

export const getJobApplicationSchema = {
  tags: ["jobs"],
  params: z.object({
    jobId: z.string(),
    applicationId: z.string(),
  }),
  response: {
    200: createSelectSchema(applications),
    ...errorResponses,
  },
};
