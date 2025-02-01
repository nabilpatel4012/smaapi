import { z } from "zod";
import { createSelectSchema } from "drizzle-zod";
import { users } from "../../db/schema";
import { errorResponses } from "../../utils/http";

export const createUserSchema = {
  tags: ["users"],
  body: z.object({
    email: z
      .string()
      .email()
      .transform((email) => email.toLowerCase()),
    password: z.string().min(8),
  }),
  response: {
    200: createSelectSchema(users).omit({
      password: true,
    }),
    ...errorResponses,
  },
} as const;

export const loginUserSchema = {
  tags: ["users", "auth"],
  body: z.object({
    email: z
      .string()
      .email()
      .transform((email) => email.toLowerCase()),
    password: z.string().min(8),
  }),
  response: {
    200: z.object({
      message: z.string(),
    }),
    ...errorResponses,
  },
} as const;

export const logoutUserSchema = {
  tags: ["users", "auth"],
  response: {
    200: z.object({
      message: z.string(),
    }),
    ...errorResponses,
  },
} as const;

export const getCurrentUserSchema = {
  tags: ["users"],
  response: {
    200: createSelectSchema(users).omit({
      password: true,
    }),
    ...errorResponses,
  },
} as const;
