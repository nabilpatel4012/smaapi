import {
  and,
  eq,
  getTableColumns,
  gt,
  InferInsertModel,
  sql,
} from "drizzle-orm";
import slugify from "slugify";
import crypto from "crypto";
import { jobs } from "../../db/schema";
import { DB } from "../../db";
import { QueryBuilder } from "drizzle-orm/pg-core";
import { databaseQueryTimeHistogram } from "../../utils/metrics";
import { logger } from "../../utils/logger";

export async function createJob(
  input: Omit<InferInsertModel<typeof jobs>, "slug">,
  db: DB
) {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    const slug =
      slugify(input.title, { lower: true, strict: true }) +
      "-" +
      crypto.randomBytes(5).toString("hex");

    const result = await db
      .insert(jobs)
      .values({ ...input, slug })
      .returning();

    end({
      operation: "create_job",
      success: "true",
    });

    return result[0];
  } catch (error) {
    end({
      operation: "create_job",
      success: "false",
    });

    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ message, input }, "createJob: failed to create job");
    throw error;
  }
}

export async function getJobs(
  {
    search,
    limit = 20,
    cursor,
  }: { search?: string; limit?: number; cursor?: string },
  db: DB
) {
  const end = databaseQueryTimeHistogram.startTimer();

  try {
    const searchQuery = search?.trim()
      ? decodeURIComponent(search.trim())
          // Replace spaces with logical AND operators
          .split(/\s+/)
          .map((term) => `${term}:*`) // Add wildcard to allow prefix matching
          .join(" & ")
      : null;

    const matchQuery = searchQuery
      ? sql`(
      setweight(to_tsvector('english', COALESCE(${jobs.title}, '')), 'A') ||
      setweight(to_tsvector('english', COALESCE(${jobs.description}, '')), 'B')
    ) @@ to_tsquery('english', ${searchQuery})`
      : null;

    const qb = new QueryBuilder();

    qb.select().from(jobs);

    let query = qb
      .select({
        ...getTableColumns(jobs),
        ...(matchQuery
          ? {
              rank: sql`ts_rank((
      setweight(to_tsvector('english', COALESCE(${jobs.title}, '')), 'A') ||
      setweight(to_tsvector('english', COALESCE(${jobs.description}, '')), 'B')
    ), to_tsquery('english', ${searchQuery}))`,
            }
          : {}),

        ...(matchQuery
          ? {
              rank_cd: sql`ts_rank_cd((
        setweight(to_tsvector('english', COALESCE(${jobs.title}, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(${jobs.description}, '')), 'B')
      ), to_tsquery('english', ${searchQuery}))`,
            }
          : {}),
      })
      .from(jobs)
      .where(cursor ? gt(jobs.id, cursor) : undefined)
      // .orderBy((t) => desc(t.rank!))
      .$dynamic();

    if (matchQuery) {
      query = query.where(matchQuery);
    }

    if (typeof limit !== "number") {
      limit = parseInt(limit, 10);
    }

    query = query.limit(Math.min(limit, 20));

    const items = await db.execute(query);

    const nextPage = items[items.length - 1]?.id;

    end({
      operation: "get_jobs",
      success: "true",
    });

    return {
      items: items.map((item) => ({
        ...item,
        userId: item.user_id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      nextCursor: nextPage,
    };
  } catch (error) {
    end({
      operation: "get_jobs",
      success: "false",
    });

    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ message, search, cursor }, "getJobs: failed to get jobs");
    throw error;
  }
}

export async function getJobBySlug(slug: string, db: DB) {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    const result = await db.query.jobs.findFirst({
      where: eq(jobs.slug, slug),
    });

    end({
      operation: "get_job_by_slug",
      success: "true",
    });

    return result;
  } catch (error) {
    end({
      operation: "get_job_by_slug",
      success: "false",
    });

    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ message, slug }, "getJobBySlug: failed to get job");
    throw error;
  }
}

export async function getJobById(
  {
    id,
    userId,
  }: {
    id: string;
    userId: string;
  },
  db: DB
) {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    const result = await db.query.jobs.findFirst({
      where: and(eq(jobs.id, id), eq(jobs.userId, userId)),
    });

    end({
      operation: "get_job_by_id",
      success: "true",
    });

    return result;
  } catch (error) {
    end({
      operation: "get_job_by_id",
      success: "false",
    });

    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ message, id, userId }, "getJobById: failed to get job");
    throw error;
  }
}

export async function updateJob(
  props: Partial<
    Pick<
      InferInsertModel<typeof jobs>,
      "title" | "description" | "status" | "salary"
    >
  > & {
    id: string;
  },
  db: DB
) {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    const { id, ...rest } = props;

    const result = await db
      .update(jobs)
      .set(rest)
      .where(eq(jobs.id, id))
      .returning();

    end({
      operation: "update_job",
      success: "true",
    });

    return result[0];
  } catch (error) {
    end({
      operation: "update_job",
      success: "false",
    });

    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ message, ...props }, "updateJob: failed to update job");
    throw error;
  }
}
