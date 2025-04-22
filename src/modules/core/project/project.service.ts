import { Insertable, Updateable } from "kysely"; // Import Kysely types
import { db } from "../../../db/db"; // Your Kysely instance
import { databaseQueryTimeHistogram } from "../../../utils/metrics";
import { logger } from "../../../utils/logger";
import { ProjectsTable } from "../../../db/kysely.schema";
import { IProjectReply } from "../../../common/types/core.types";

/**
 * Creates a new project in the database.
 *
 * @param values - The project data to insert, conforming to the Insertable<ProjectsTable> type.  This typically includes
 *                 `project_name`, `project_description`. `user_id` should also be included.
 * @returns A Promise that resolves to the newly created project data, conforming to IProjectReply, or null if the
 *          creation fails.
 * @throws An error if the database operation fails.
 */
export async function createProject(
  values: Insertable<ProjectsTable>
): Promise<IProjectReply> {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    // Create a new payload with isDeleted set to false
    const payload: Insertable<ProjectsTable> = {
      ...values,
      isDeleted: false,
    };
    // Insert the project
    const result = await db
      .insertInto("projects")
      .values(payload)
      .executeTakeFirstOrThrow();

    // Get the inserted ID
    const insertId = Number(result.insertId);

    // Fetch the newly created project
    const createdProject = await db
      .selectFrom("projects")
      .selectAll()
      .where("project_id", "=", insertId)
      .executeTakeFirst();

    if (!createdProject) {
      throw new Error(
        `Failed to retrieve the newly created project with ID ${insertId}`
      );
    }
    end({ operation: "create_project", success: "true" });
    return createdProject; // Fixed: Return createdProject instead of createProject
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
  offset: number = 0,
  limit: number = 10,
  user_id: number,
  name?: string
): Promise<IProjectReply[]> {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    const result = await db
      .selectFrom("projects")
      .selectAll()
      .where("project_name", "like", name ? `%${name}%` : "%") // Changed ilike to like for MySQL
      .where("user_id", "=", user_id)
      .where("isDeleted", "=", false) // Only get non-deleted projects
      .limit(limit)
      .offset(offset)
      .execute();

    end({ operation: "get_projects", success: "true" });
    return result;
  } catch (error) {
    end({ operation: "get_projects", success: "false" });
    logger.error({ error }, "getProjects: failed to get projects");
    throw error;
  }
}

/**
 * Get a project with project_id.
 *
 * @param project_id - The project id.
 * @param user_id - Required for fetching the user specific projects only
 * @returns A Promise that resolves to a single project data, each conforming to IProjectReply, or throws an error if no project is found.
 * @throws An error if the database operation fails or if the project is not found.
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
      .where("isDeleted", "=", false) // Only get non-deleted projects
      .executeTakeFirst();

    // Check if any project was found
    if (!result) {
      end({ operation: "get_project_by_id", success: "false" });
      throw new Error(
        `Project with ID ${project_id} not found for user ${user_id}`
      );
    }

    end({ operation: "get_project_by_id", success: "true" });
    return result;
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
 *                 This can include `project_name`, `project_description`.
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
    // Create an update payload
    const updatePayload: Updateable<ProjectsTable> = {
      ...values,
    };

    // First update the record
    const updateResult = await db
      .updateTable("projects")
      .set(updatePayload)
      .where("project_id", "=", project_id)
      .where("user_id", "=", user_id)
      .where("isDeleted", "=", false) // Only update non-deleted projects
      .executeTakeFirst();

    // Check if any rows were affected
    const rowsAffected = Number(updateResult?.numUpdatedRows || 0);

    if (rowsAffected === 0) {
      end({ operation: "update_project", success: "false" });
      return null; // No rows were updated (project not found)
    }

    // Fetch the updated project
    const updatedProject = await db
      .selectFrom("projects")
      .selectAll()
      .where("project_id", "=", project_id)
      .where("user_id", "=", user_id)
      .where("isDeleted", "=", false)
      .executeTakeFirst();

    end({ operation: "update_project", success: "true" });
    return updatedProject || null;
  } catch (error) {
    end({ operation: "update_project", success: "false" });
    logger.error({ error }, "updateProject: failed to update project");
    throw error;
  }
}

/**
 * Soft deletes a project from the database.
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
    // First fetch the project to be deleted
    const projectToDelete = await db
      .selectFrom("projects")
      .selectAll()
      .where("project_id", "=", project_id)
      .where("user_id", "=", user_id)
      .where("isDeleted", "=", false)
      .executeTakeFirst();

    if (!projectToDelete) {
      end({ operation: "delete_project", success: "false" });
      return null; // Project not found
    }

    // Soft delete by setting isDeleted to true
    await db
      .updateTable("projects")
      .set({ isDeleted: true })
      .where("project_id", "=", project_id)
      .where("user_id", "=", user_id)
      .execute();

    end({ operation: "delete_project", success: "true" });
    return projectToDelete; // Return the project data that was deleted
  } catch (error) {
    end({ operation: "delete_project", success: "false" });
    logger.error({ error }, "deleteProject: failed to delete project");
    throw error;
  }
}

/**
 * @todo Add this to a seperate route in future
 * Hard deletes a project from the database - should only be used for admin purposes.
 *
 * @param project_id - The ID of the project to permanently delete.
 * @param user_id - Required for deleting the user specific projects only
 * @returns A Promise that resolves to true if deletion was successful, false otherwise.
 * @throws An error if the database operation fails.
 */
export async function hardDeleteProject(
  project_id: number,
  user_id: number
): Promise<boolean> {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    // Permanently delete the project
    const result = await db
      .deleteFrom("projects")
      .where("project_id", "=", project_id)
      .where("user_id", "=", user_id)
      .execute();

    const success = result && result.length > 0;
    end({
      operation: "hard_delete_project",
      success: success ? "true" : "false",
    });
    return success;
  } catch (error) {
    end({ operation: "hard_delete_project", success: "false" });
    logger.error(
      { error },
      "hardDeleteProject: failed to permanently delete project"
    );
    throw error;
  }
}
