import { Insertable, Updateable } from "kysely"; // Import Kysely types
import { db } from "../../../db/db"; // Your Kysely instance
import { databaseQueryTimeHistogram } from "../../../utils/metrics";
import { logger } from "../../../utils/logger";
import { ProjectsTablesTable } from "../../../db/kysely.schema";
import { IProjectTableReply } from "../../../common/types/core.types";

/**
 * Creates a new table in the database.
 *
 * @param values - The table data to insert, conforming to the Insertable<ProjectsTablesTable> type. This typically includes
 *                 `table_name`, `project_id`. `isDeleted` is automatically set to false.
 * @returns A Promise that resolves to the newly created table data, conforming to IProjectTableReply.
 * @throws An error if the database operation fails or if the project_id does not exist.
 */
export async function createTable(
  values: Insertable<ProjectsTablesTable>
): Promise<IProjectTableReply> {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    // Create a new payload with isDeleted set to false
    const payload: Insertable<ProjectsTablesTable> = {
      ...values,
      table_schema: values.table_schema
        ? JSON.stringify(values.table_schema)
        : values.table_schema,
      isDeleted: false,
    };
    // Insert the table
    const result = await db
      .insertInto("projects_tables")
      .values(payload)
      .executeTakeFirstOrThrow();

    // Get the inserted ID
    const insertId = Number(result.insertId);

    // Fetch the newly created table
    const createdTable = await db
      .selectFrom("projects_tables")
      .selectAll()
      .where("table_id", "=", insertId)
      .executeTakeFirst();

    if (!createdTable) {
      throw new Error(
        `Failed to retrieve the newly created table with ID ${insertId}`
      );
    }
    end({ operation: "create_table", success: "true" });
    return createdTable;
  } catch (error: any) {
    end({ operation: "create_table", success: "false" });
    if (error.errno === 1062) {
      throw error; // Duplicate entry
    }
    if (error.errno === 1452) {
      throw new Error(`Project with ID ${values.project_id} does not exist`);
    }
    logger.error({ error }, "createTable: failed to create table");
    throw error;
  }
}

/**
 * Interface for table filtering options - only these specific filters are allowed
 */
interface GetTablesFilters {
  readonly project_id?: number;
  readonly name?: string;
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * Enhanced function to retrieve a list of tables from the database with flexible filtering options.
 *
 * @param user_id - The ID of the user to ensure tables belong to their projects.
 * @param filters - Optional filters object containing:
 *   - project_id: Filter tables by project ID
 *   - name: Filter tables by name (case-insensitive partial match)
 *   - limit: Maximum number of tables to retrieve (defaults to 10)
 *   - offset: Number of tables to skip for pagination (defaults to 0)
 * @returns A Promise that resolves to an array of table data, each conforming to IProjectTableReply, or an empty array if no tables match the criteria.
 * @throws An error if the database operation fails.
 */
export async function getTables(
  user_id: number,
  filters: GetTablesFilters = {}
): Promise<IProjectTableReply[]> {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    // Validate that only allowed filter keys are provided
    const allowedKeys: (keyof GetTablesFilters)[] = [
      "project_id",
      "name",
      "limit",
      "offset",
    ];
    const providedKeys = Object.keys(filters) as (keyof GetTablesFilters)[];
    const invalidKeys = providedKeys.filter(
      (key) => !allowedKeys.includes(key)
    );

    if (invalidKeys.length > 0) {
      throw new Error(
        `Invalid filter keys provided: ${invalidKeys.join(
          ", "
        )}. Allowed filters are: ${allowedKeys.join(", ")}`
      );
    }

    const { project_id, name, limit = 10, offset = 0 } = filters;

    // Build the query to fetch tables
    let query = db
      .selectFrom("projects_tables")
      .innerJoin(
        "projects",
        "projects.project_id",
        "projects_tables.project_id"
      )
      .selectAll("projects_tables")
      .where("projects.user_id", "=", user_id)
      .where("projects_tables.isDeleted", "=", false)
      .where("projects.isDeleted", "=", false);

    // Add project_id filter if provided
    if (project_id !== undefined) {
      query = query.where("projects_tables.project_id", "=", project_id);
    }

    // Add name filter if provided
    if (name) {
      query = query.where("projects_tables.table_name", "like", `%${name}%`);
    }

    const result = await query.limit(limit).offset(offset).execute();

    end({ operation: "get_tables", success: "true" });
    return result;
  } catch (error) {
    end({ operation: "get_tables", success: "false" });
    logger.error({ error }, "getTables: failed to get tables");
    throw error;
  }
}

/**
 * Legacy version of getTables for backward compatibility.
 * @deprecated Use getTables with filters object instead
 */
export async function getTablesLegacy(
  offset: number = 0,
  limit: number = 10,
  user_id: number,
  project_id?: number,
  name?: string
): Promise<IProjectTableReply[]> {
  return getTables(user_id, { offset, limit, project_id, name });
}

/**
 * Interface for getTablesByProjectId options - only these specific options are allowed
 */
interface GetTablesByProjectIdOptions {
  readonly limit?: number;
  readonly offset?: number;
  readonly name?: string;
}

/**
 * Retrieves all tables that belong to a specific project.
 *
 * @param project_id - The ID of the project to get tables for.
 * @param user_id - The ID of the user to ensure the project belongs to them.
 * @param options - Optional parameters (only limit, offset, and name are allowed):
 *   - limit: Maximum number of tables to retrieve (defaults to 50)
 *   - offset: Number of tables to skip for pagination (defaults to 0)
 *   - name: Filter tables by name (case-insensitive partial match)
 * @returns A Promise that resolves to an array of table data for the specified project.
 * @throws An error if the database operation fails or if the project doesn't exist/belong to the user.
 */
export async function getTablesByProjectId(
  project_id: number,
  user_id: number,
  options: GetTablesByProjectIdOptions = {}
): Promise<IProjectTableReply[]> {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    // Validate that only allowed option keys are provided
    const allowedKeys: (keyof GetTablesByProjectIdOptions)[] = [
      "limit",
      "offset",
      "name",
    ];
    const providedKeys = Object.keys(
      options
    ) as (keyof GetTablesByProjectIdOptions)[];
    const invalidKeys = providedKeys.filter(
      (key) => !allowedKeys.includes(key)
    );

    if (invalidKeys.length > 0) {
      throw new Error(
        `Invalid option keys provided: ${invalidKeys.join(
          ", "
        )}. Allowed options are: ${allowedKeys.join(", ")}`
      );
    }

    const { limit = 50, offset = 0, name } = options;

    // Validate inputs
    if (isNaN(project_id) || project_id <= 0) {
      throw new Error("Invalid project ID");
    }
    if (isNaN(user_id) || user_id <= 0) {
      throw new Error("Invalid user ID");
    }

    // First verify the project exists and belongs to the user
    const projectExists = await db
      .selectFrom("projects")
      .select("project_id")
      .where("project_id", "=", project_id)
      .where("user_id", "=", user_id)
      .where("isDeleted", "=", false)
      .executeTakeFirst();

    if (!projectExists) {
      throw new Error(
        `Project with ID ${project_id} not found or does not belong to user ${user_id}`
      );
    }

    // Build the query to fetch tables for the specific project
    let query = db
      .selectFrom("projects_tables")
      .selectAll()
      .where("project_id", "=", project_id)
      .where("isDeleted", "=", false);

    // Add name filter if provided
    if (name) {
      query = query.where("table_name", "like", `%${name}%`);
    }

    const result = await query
      .orderBy("table_id", "desc") // Order by newest first
      .limit(limit)
      .offset(offset)
      .execute();

    end({ operation: "get_tables_by_project_id", success: "true" });
    return result;
  } catch (error) {
    end({ operation: "get_tables_by_project_id", success: "false" });
    logger.error(
      { error, project_id, user_id },
      "getTablesByProjectId: failed to get tables by project ID"
    );
    throw error;
  }
}

/**
 * Retrieves a table by its ID, ensuring it belongs to the specified project and user.
 *
 * @param table_id - The ID of the table to retrieve.
 * @param project_id - The ID of the project the table belongs to.
 * @param user_id - The ID of the user to ensure the table belongs to their project.
 * @returns A Promise that resolves to the table data, conforming to IProjectTableReply.
 * @throws An error if the table is not found or if the database operation fails.
 */
export async function getTableById(
  table_id: number,
  user_id: number,
  project_id?: number
): Promise<IProjectTableReply> {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    // Validate inputs
    if (isNaN(table_id) || table_id <= 0) {
      throw new Error("Invalid table ID");
    }
    if (isNaN(user_id) || user_id <= 0) {
      throw new Error("Invalid user ID");
    }

    let query = db
      .selectFrom("projects_tables")
      .innerJoin(
        "projects",
        "projects.project_id",
        "projects_tables.project_id"
      )
      .selectAll("projects_tables")
      .where("projects_tables.table_id", "=", table_id)
      .where("projects.user_id", "=", user_id)
      .where("projects_tables.isDeleted", "=", false)
      .where("projects.isDeleted", "=", false);

    // Conditionally add project_id filter if provided
    if (project_id !== undefined) {
      if (isNaN(project_id) || project_id <= 0) {
        throw new Error("Invalid project ID");
      }
      query = query.where("projects_tables.project_id", "=", project_id);
    }

    const result = await query.executeTakeFirst();

    if (!result) {
      throw new Error(
        `Table with ID ${table_id} not found${
          project_id !== undefined ? ` for project ${project_id}` : ""
        }`
      );
    }

    end({ operation: "get_table_by_id", success: "true" });
    return result;
  } catch (error) {
    end({ operation: "get_table_by_id", success: "false" });
    logger.error(
      { error, table_id, user_id, project_id },
      "getTableById: failed to get table"
    );
    throw error;
  }
}

/**
 * Updates an existing table in the database.
 *
 * @param table_id - The ID of the table to update.
 * @param values - The table data to update, conforming to the Updateable<ProjectsTablesTable> type.
 * @param project_id - The ID of the project the table belongs to.
 * @param user_id - The ID of the user to ensure the table belongs to their project.
 * @returns A Promise that resolves to the updated table data, conforming to IProjectTableReply, or null if the update fails
 *          or the table/project is not found.
 * @throws An error if the database operation fails.
 */
export async function updateTable(
  table_id: number,
  values: Updateable<ProjectsTablesTable>,
  project_id: number,
  user_id: number
): Promise<IProjectTableReply | null> {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    // Verify the project exists and belongs to the user
    const projectExists = await db
      .selectFrom("projects")
      .select("project_id")
      .where("project_id", "=", project_id)
      .where("user_id", "=", user_id)
      .where("isDeleted", "=", false)
      .executeTakeFirst();

    if (!projectExists) {
      end({ operation: "update_table", success: "false" });
      return null;
    }

    // Create an update payload
    const updatePayload: Updateable<ProjectsTablesTable> = {
      ...values,
      table_schema: values.table_schema
        ? JSON.stringify(values.table_schema)
        : values.table_schema,
    };

    // Update the table
    const updateResult = await db
      .updateTable("projects_tables")
      .set(updatePayload)
      .where("table_id", "=", table_id)
      .where("project_id", "=", project_id)
      .where("isDeleted", "=", false)
      .executeTakeFirst();

    const rowsAffected = Number(updateResult?.numUpdatedRows || 0);

    if (rowsAffected === 0) {
      end({ operation: "update_table", success: "false" });
      return null;
    }

    // Fetch the updated table
    const updatedTable = await db
      .selectFrom("projects_tables")
      .selectAll()
      .where("table_id", "=", table_id)
      .where("project_id", "=", project_id)
      .where("isDeleted", "=", false)
      .executeTakeFirst();

    end({ operation: "update_table", success: "true" });
    return updatedTable || null;
  } catch (error: any) {
    end({ operation: "update_table", success: "false" });
    if (error.errno === 1062) {
      throw error;
    }
    logger.error({ error }, "updateTable: failed to update table");
    throw error;
  }
}

/**
 * Soft deletes a table from the database.
 *
 * @param table_id - The ID of the table to delete.
 * @param project_id - The ID of the project the table belongs to.
 * @param user_id - The ID of the user to ensure the table belongs to their project.
 * @returns A Promise that resolves to the deleted table data, conforming to IProjectTableReply, or null if the deletion fails
 *          or the table/project is not found.
 * @throws An error if the database operation fails.
 */
export async function deleteTable(
  table_id: number,
  project_id: number,
  user_id: number
): Promise<IProjectTableReply | null> {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    // Verify the project exists and belongs to the user
    const projectExists = await db
      .selectFrom("projects")
      .select("project_id")
      .where("project_id", "=", project_id)
      .where("user_id", "=", user_id)
      .where("isDeleted", "=", false)
      .executeTakeFirst();

    if (!projectExists) {
      end({ operation: "delete_table", success: "false" });
      return null;
    }

    // Fetch the table to be deleted
    const tableToDelete = await db
      .selectFrom("projects_tables")
      .selectAll()
      .where("table_id", "=", table_id)
      .where("project_id", "=", project_id)
      .where("isDeleted", "=", false)
      .executeTakeFirst();

    if (!tableToDelete) {
      end({ operation: "delete_table", success: "false" });
      return null;
    }

    // Soft delete by setting isDeleted to true
    await db
      .updateTable("projects_tables")
      .set({ isDeleted: true })
      .where("table_id", "=", table_id)
      .where("project_id", "=", project_id)
      .execute();

    end({ operation: "delete_table", success: "true" });
    return tableToDelete;
  } catch (error) {
    end({ operation: "delete_table", success: "false" });
    logger.error({ error }, "deleteTable: failed to delete table");
    throw error;
  }
}
