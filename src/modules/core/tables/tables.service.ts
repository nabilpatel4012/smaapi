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
 * Retrieves a list of tables from the database, with optional pagination and filtering by name.
 *
 * @param offset - The number of tables to skip from the beginning (for pagination). Defaults to 0.
 * @param limit - The maximum number of tables to retrieve. Defaults to 10.
 * @param project_id - The ID of the project to filter tables by.
 * @param user_id - The ID of the user to ensure tables belong to their projects.
 * @param name - An optional string to filter tables by name (case-insensitive). If provided, only tables whose
 *               name contains the given string will be returned.
 * @returns A Promise that resolves to an array of table data, each conforming to IProjectTableReply, or an empty array if no tables match the criteria.
 * @throws An error if the database operation fails.
 */
export async function getTables(
  offset: number = 0,
  limit: number = 10,
  project_id: number,
  user_id: number,
  name?: string
): Promise<IProjectTableReply[]> {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    // Build the query to fetch tables
    let query = db
      .selectFrom("projects_tables")
      .innerJoin(
        "projects",
        "projects.project_id",
        "projects_tables.project_id"
      )
      .selectAll("projects_tables")
      .where("projects_tables.project_id", "=", project_id)
      .where("projects.user_id", "=", user_id)
      .where("projects_tables.isDeleted", "=", false)
      .where("projects.isDeleted", "=", false);

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
  project_id: number,
  user_id: number
): Promise<IProjectTableReply> {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    const result = await db
      .selectFrom("projects_tables")
      .innerJoin(
        "projects",
        "projects.project_id",
        "projects_tables.project_id"
      )
      .selectAll("projects_tables")
      .where("projects_tables.table_id", "=", table_id)
      .where("projects_tables.project_id", "=", project_id)
      .where("projects.user_id", "=", user_id)
      .where("projects_tables.isDeleted", "=", false)
      .where("projects.isDeleted", "=", false)
      .executeTakeFirst();

    if (!result) {
      throw new Error(
        `Table with ID ${table_id} not found for project ${project_id}`
      );
    }

    end({ operation: "get_table_by_id", success: "true" });
    return result;
  } catch (error) {
    end({ operation: "get_table_by_id", success: "false" });
    logger.error({ error }, "getTableById: failed to get table");
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
