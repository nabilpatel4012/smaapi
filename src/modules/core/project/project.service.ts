import { Insertable, SelectExpression, Updateable } from "kysely"; // Import Kysely types
import { db } from "../../../db/db"; // Your Kysely instance
import { databaseQueryTimeHistogram } from "../../../utils/metrics";
import { logger } from "../../../utils/logger";
import {
  ProjectsTable,
  ProjectDbsTable,
  UsersTable,
  Database,
} from "../../../db/kysely.schema";
import { IProjectReply } from "../../../common/types/core.types";
import { encrypt, decrypt } from "../../../utils/crypto";
import { generateSubdomain } from "../../../utils/subdomain";
import { cloudflareService } from "./cloudflare";

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
  values: Insertable<ProjectsTable> & { db_creds: object } // Add db_creds to input
): Promise<IProjectReply> {
  const end = databaseQueryTimeHistogram.startTimer();
  const { db_creds, ...projectValues } = values;

  try {
    // Start a transaction
    const result = await db.transaction().execute(async (trx) => {
      // Fetch user to get password_hash for encryption
      const user = await trx
        .selectFrom("users")
        .select(["password_hash"])
        .where("user_id", "=", projectValues.user_id)
        .executeTakeFirstOrThrow();

      // Encrypt db_creds
      const encryptedCreds = encrypt(
        JSON.stringify(db_creds),
        user.password_hash
      );

      // Insert the project
      const projectPayload: Insertable<ProjectsTable> = {
        ...projectValues,
        isDeleted: false,
      };
      const projectResult = await trx
        .insertInto("projects")
        .values(projectPayload)
        .executeTakeFirstOrThrow();

      const projectId = Number(projectResult.insertId);

      // Generate subdomain
      const subdomain = generateSubdomain(
        projectValues.user_id,
        projectId,
        Date.now()
      );
      const subdomainUrl = await cloudflareService.createSubdomain(subdomain);

      // Update project with subdomain_url
      await trx
        .updateTable("projects")
        .set({ subdomain_url: subdomainUrl })
        .where("project_id", "=", projectId)
        .execute();

      // Insert into project_dbs
      const projectDbPayload: Insertable<ProjectDbsTable> = {
        project_id: projectId,
        user_id: projectValues.user_id,
        db_creds: encryptedCreds,
        isDeleted: false,
      };
      await trx.insertInto("project_dbs").values(projectDbPayload).execute();

      // Fetch the newly created project
      const createdProject = await trx
        .selectFrom("projects")
        .selectAll()
        .where("project_id", "=", projectId)
        .executeTakeFirstOrThrow();

      return createdProject;
    });

    end({ operation: "create_project", success: "true" });
    return result;
  } catch (error: any) {
    end({ operation: "create_project", success: "false" });
    if (error.errno === 1062) {
      throw error;
    }
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
  name?: string,
  select?: string[]
): Promise<IProjectReply[]> {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    const query = db
      .selectFrom("projects")
      .where("project_name", "like", name ? `%${name}%` : "%")
      .where("user_id", "=", user_id)
      .where("isDeleted", "=", false)
      .limit(limit)
      .offset(offset);
    const result = await (select
      ? query
          .select(select as SelectExpression<Database, "projects">[])
          .execute()
      : query.selectAll().execute());

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
  } catch (error: any) {
    end({ operation: "update_project", success: "false" });
    if (error.errno === 1062) {
      throw error;
    }
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
    // Start a transaction
    const result = await db.transaction().execute(async (trx) => {
      // Fetch the project to be deleted
      const projectToDelete = await trx
        .selectFrom("projects")
        .selectAll()
        .where("project_id", "=", project_id)
        .where("user_id", "=", user_id)
        .where("isDeleted", "=", false)
        .executeTakeFirst();

      if (!projectToDelete) {
        return null; // Project not found
      }

      // Delete Cloudflare DNS record
      if (projectToDelete.subdomain_url) {
        const subdomain = projectToDelete.subdomain_url.split(".")[0];
        // await cloudflareService.deleteSubdomain(subdomain);
        console.log("deleting domain");
      }

      // Soft delete project
      await trx
        .updateTable("projects")
        .set({ isDeleted: true })
        .where("project_id", "=", project_id)
        .where("user_id", "=", user_id)
        .execute();

      // Soft delete project_dbs entry
      await trx
        .updateTable("project_dbs")
        .set({ isDeleted: true })
        .where("project_id", "=", project_id)
        .where("user_id", "=", user_id)
        .execute();

      return projectToDelete;
    });

    end({ operation: "delete_project", success: "true" });
    return result;
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

export async function getProjectDbCreds(
  project_id: number,
  user_id: number
): Promise<object> {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    // Fetch project_dbs entry
    const projectDb = await db
      .selectFrom("project_dbs")
      .select(["db_creds"])
      .where("project_id", "=", project_id)
      .where("user_id", "=", user_id)
      .where("isDeleted", "=", false)
      .executeTakeFirstOrThrow();

    // Fetch user password_hash
    const user = await db
      .selectFrom("users")
      .select(["password_hash"])
      .where("user_id", "=", user_id)
      .executeTakeFirstOrThrow();

    // Decrypt db_creds
    const decryptedCreds = decrypt(projectDb.db_creds, user.password_hash);
    end({ operation: "get_project_db_creds", success: "true" });
    return JSON.parse(decryptedCreds);
  } catch (error) {
    end({ operation: "get_project_db_creds", success: "false" });
    logger.error({ error }, "getProjectDbCreds: failed to get db creds");
    throw error;
  }
}
