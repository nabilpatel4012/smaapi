import { Insertable, Updateable } from "kysely"; // Import Kysely types
import { db } from "../../../db/db"; // Your Kysely instance
import { databaseQueryTimeHistogram } from "../../../utils/metrics";
import { logger } from "../../../utils/logger";
import { ProjectsTable } from "../../../db/kysley.schema";
import { IProjectReply } from "../../../common/types/core.types";

/**
 * Creates a new project in the database.
 *
 * @param values - The project data to insert, conforming to the Insertable<ProjectsTable> type.  This typically includes
 *                 `project_name`, `project_description`, and `tags` (as a JSON string). `user_id` should also be included.
 * @returns A Promise that resolves to the newly created project data, conforming to IProjectReply, or null if the
 *          creation fails.
 * @throws An error if the database operation fails.
 */
export async function createProject(
  values: Insertable<ProjectsTable>
): Promise<IProjectReply> {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    const payload: Insertable<ProjectsTable> = values;
    const result = await db
      .insertInto("projects")
      .values(payload)
      .returning([
        "project_id",
        "user_id",
        "project_name",
        "project_description",
        "tags",
        "created_at",
      ])
      .executeTakeFirst();
    end({ operation: "create_project", success: "true" });
    return result!;
  } catch (error) {
    end({ operation: "create_project", success: "false" });
    logger.error({ error }, "createProject: failed to create project");
    throw error;
  }
}

/**
 * Retrieves a list of projects from the database, with optional pagination and filtering by name.
 *
 * @param offset - The number of projects to skip from the beginning (for pagination). Defaults to 0.
 * @param limit - The maximum number of projects to retrieve. Defaults to 10.
 * @param name - An optional string to filter projects by name (case-insensitive). If provided, only projects whose
 *               name contains the given string will be returned. If not provided, all projects are considered.
 * @param user_id - Required for fetching the user specific projects only
 * @returns A Promise that resolves to an array of project data, each conforming to IProjectReply, or an empty array if no projects match the criteria. Returns null if there is an error in the database.
 * @throws An error if the database operation fails.
 */
export async function getProjects(
  offset: number,
  limit: number,
  user_id: number,
  name?: string
): Promise<IProjectReply[]> {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    const result = await db
      .selectFrom("projects")
      .selectAll()
      .where("project_name", "ilike", name ? `%${name}%` : "%")
      .where("user_id", "=", user_id)
      .limit(limit ? limit : 10)
      .offset(offset ? offset : 0)
      .execute();
    end({ operation: "get_project", success: "true" });
    return result;
  } catch (error) {
    end({ operation: "get_project", success: "false" });
    logger.error({ error }, "getProject: failed to get project");
    throw error;
  }
}

/**
 * Get a project with project_id.
 *
 * @param project_id - The project id.
 * @param user_id - Required for fetching the user specific projects only
 * @returns A Promise that resolves to a single project data, each conforming to IProjectReply, or an empty object if no projects match the criteria. Returns null if there is an error in the database.
 * @throws An error if the database operation fails.
 */
export async function getProjectById(
  project_id: number,
  user_id: number
): Promise<IProjectReply> {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    const result = await db
      .selectFrom("projects")
      .selectAll()
      .where("project_id", "=", project_id)
      .where("user_id", "=", user_id)
      .execute();
    end({ operation: "get_project_by_id", success: "true" });
    return result[0];
  } catch (error) {
    end({ operation: "get_project_by_id", success: "false" });
    logger.error({ error }, "getProjectById: failed to get project");
    throw error;
  }
}

/**
 * Updates an existing project in the database.
 *
 * @param project_id - The ID of the project to update.
 * @param values - The project data to update, conforming to the Updateable<ProjectsTable> type.
 *                 This can include `project_name`, `project_description`, and `tags` (as a JSON string).
 * @param user_id - Required for updating the user specific projects only
 * @returns A Promise that resolves to the updated project data, conforming to IProjectReply, or null if the update fails
 *          or the project is not found.
 * @throws An error if the database operation fails.
 */
export async function updateProject(
  project_id: number,
  values: Updateable<ProjectsTable>,
  user_id: number
): Promise<IProjectReply | null> {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    const result = await db
      .updateTable("projects")
      .set(values)
      .where("project_id", "=", project_id)
      .where("user_id", "=", user_id)
      .returning([
        "project_id",
        "user_id",
        "project_name",
        "project_description",
        "tags",
        "created_at",
      ])
      .executeTakeFirst();

    end({ operation: "update_project", success: result ? "true" : "false" });
    return result || null; // Return null if no rows were updated (project not found)
  } catch (error) {
    end({ operation: "update_project", success: "false" });
    logger.error({ error }, "updateProject: failed to update project");
    throw error;
  }
}

/**
 * Deletes a project from the database.
 *
 * @param project_id - The ID of the project to delete.
 * @param user_id - Required for deleting the user specific projects only
 * @returns A Promise that resolves to the deleted project data, conforming to IProjectReply, or null if the deletion fails
 *          or the project is not found.
 * @throws An error if the database operation fails.
 */
export async function deleteProject(
  project_id: number,
  user_id: number
): Promise<IProjectReply | null> {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    const result = await db
      .deleteFrom("projects")
      .where("project_id", "=", project_id)
      .where("user_id", "=", user_id)
      .returning([
        "project_id",
        "user_id",
        "project_name",
        "project_description",
        "tags",
        "created_at",
      ])
      .executeTakeFirst();

    end({ operation: "delete_project", success: result ? "true" : "false" });
    return result || null; // Return null if no rows were deleted (project not found)
  } catch (error) {
    end({ operation: "delete_project", success: "false" });
    logger.error({ error }, "deleteProject: failed to delete project");
    throw error;
  }
}
