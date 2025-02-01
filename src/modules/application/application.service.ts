import { InferInsertModel, and, eq } from "drizzle-orm";
import { applications } from "../../db/schema";
import { DB } from "../../db";
import { databaseQueryTimeHistogram } from "../../utils/metrics";
import { logger } from "../../utils/logger";

export async function createApplication(
  input: Omit<InferInsertModel<typeof applications>, "status">,
  db: DB
) {
  const metricsLabels = {
    operation: "create_application",
    success: "true",
  };

  const end = databaseQueryTimeHistogram.startTimer();
  try {
    const result = await db.insert(applications).values(input).returning();

    end(metricsLabels);
    return result[0];
  } catch (error) {
    end({ ...metricsLabels, success: "false" });
    throw error;
  }
}

export async function updateApplication(
  id: string,
  props: Partial<
    Pick<
      InferInsertModel<typeof applications>,
      "status" | "coverLetter" | "resume"
    >
  >,
  db: DB
) {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    const result = await db
      .update(applications)
      .set(props)
      .where(eq(applications.id, id))
      .returning();

    end({ operation: "update_application", success: "true" });
    return result[0];
  } catch (error) {
    end({ operation: "update_application", success: "false" });
    throw error;
  }
}

export async function getApplicationById(id: string, db: DB) {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    const result = await db.query.applications.findFirst({
      where: eq(applications.id, id),
    });

    end({
      operation: "get_application_by_id",
      success: "true",
    });

    return result;
  } catch (error) {
    end({
      operation: "get_application_by_id",
      success: "false",
    });

    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error(
      { message, id },
      "getApplicationById: failed to get application"
    );
    throw error;
  }
}

export async function getJobApplications(jobId: string, db: DB) {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    const result = await db.query.applications.findMany({
      where: eq(applications.jobId, jobId),
    });

    end({
      operation: "get_job_applications",
      success: "true",
    });

    return result;
  } catch (error) {
    end({
      operation: "get_job_applications",
      success: "false",
    });

    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error(
      { message, jobId },
      "getJobApplications: failed to get applications"
    );
    throw error;
  }
}

export async function getJobApplication(
  {
    jobId,
    applicationId,
  }: {
    jobId: string;
    applicationId: string;
  },
  db: DB
) {
  const end = databaseQueryTimeHistogram.startTimer();

  try {
    const result = await db.query.applications.findFirst({
      where: and(
        eq(applications.jobId, jobId),
        eq(applications.id, applicationId)
      ),
    });

    end({
      operation: "get_job_application",
      success: "true",
    });

    return result;
  } catch (error) {
    end({
      operation: "get_job_application",
      success: "false",
    });

    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error(
      {
        message,
        jobId,
        applicationId,
      },
      "getJobApplication: failed to get job application"
    );

    throw error;
  }
}
