import z from "zod";
import zennv from "zennv";

const schema = z.object({
  PORT: z.number().default(4000),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().optional(),
  LOG_LEVEL: z.string().default("info"),
  METRICS_PREFIX: z.string().default("app_"),
  COOKIE_NAME: z.string().default("session"),
});

export type Config = z.infer<typeof schema>;

export const config = zennv({
  schema: schema,
  dotenv: true,
});
