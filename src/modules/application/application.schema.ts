import { z } from "zod";
import { createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { applications } from "../../db/schema";
import { errorResponses } from "../../utils/http";

export const createApplicationSchema = {
  tags: ["application"],
  body: z.object({
    jobId: z.string(),
    coverLetter: z.string(),
    resume: z.string(),
  }),
  response: {
    201: createSelectSchema(applications),
    ...errorResponses,
  },
} as const;

export type CreateApplicationBody = z.infer<
  typeof createApplicationSchema.body
>;

export const updateApplicationSchema = {
  tags: ["application"],
  params: z.object({
    applicationId: z.string(),
  }),
  body: createUpdateSchema(applications).omit({
    id: true,
    jobId: true,
    createdAt: true,
    updatedAt: true,
  }),
  response: {
    200: createSelectSchema(applications),
    ...errorResponses,
  },
} as const;

export type UpdateApplicationParams = z.infer<
  typeof updateApplicationSchema.params
>;
export type UpdateApplicationBody = z.infer<
  typeof updateApplicationSchema.body
>;
