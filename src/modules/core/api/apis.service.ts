import { Insertable, Updateable, Selectable } from "kysely";
import { db } from "../../../db/db";
import { databaseQueryTimeHistogram } from "../../../utils/metrics";
import { logger } from "../../../utils/logger";
import { ApisTable } from "../../../db/kysely.schema";
import {
  IApiBody,
  IApiReply,
  IApiUpdateBody,
} from "../../../common/types/api.types";
import { Api } from "../../core/schema/db-schema";

/**
 * Validates the payload for creating a new API.
 * Throws an error if required fields are missing or invalid.
 *
 * @param values - The API body payload to validate.
 */
function validateApiPayload(values: IApiBody): void {
  if (!values.project_id) {
    throw new Error("project_id is required");
  }
  if (!values.api_name) {
    throw new Error("api_name is required");
  }
  if (!values.http_method) {
    throw new Error("http_method is required");
  }
  if (!values.endpoint_path) {
    throw new Error("endpoint_path is required");
  }
  const validMethods = [
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "PATCH",
    "OPTIONS",
    "HEAD",
  ];
  if (!validMethods.includes(values.http_method)) {
    throw new Error(`http_method must be one of: ${validMethods.join(", ")}`);
  }
}

/**
 * Validates the payload for updating an existing API.
 * Ensures at least one valid field is provided and that http_method is valid (if given).
 *
 * @param values - The API update body payload to validate.
 */
function validateApiUpdatePayload(values: IApiUpdateBody): void {
  const validFields: (keyof IApiUpdateBody)[] = [
    "project_id",
    "api_name",
    "api_description",
    "endpoint_path",
    "http_method",
    "endpoint_description",
    "middleware_config",
    "parameters",
    "allowedFilters",
    "responses",
    "api_status",
  ];
  const hasValidField = validFields.some(
    (field) => values[field] !== undefined
  );
  if (!hasValidField) {
    throw new Error("At least one valid field must be provided for update");
  }
  if (values.http_method) {
    const validMethods = [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "PATCH",
      "OPTIONS",
      "HEAD",
    ];
    if (!validMethods.includes(values.http_method)) {
      throw new Error(`http_method must be one of: ${validMethods.join(", ")}`);
    }
  }
}

/**
 * Creates a new API entry in both SQL and MongoDB databases.
 *
 * @param values - The API details to be inserted.
 * @param user_id - ID of the user creating the API.
 * @returns A promise that resolves to the created API object.
 */
export async function createApi(
  values: IApiBody,
  user_id: number
): Promise<IApiReply> {
  const end = databaseQueryTimeHistogram.startTimer();

  try {
    validateApiPayload(values);

    const result = await db.transaction().execute(async (trx) => {
      const apiPayload: Insertable<ApisTable> = {
        user_id,
        project_id: values.project_id,
        api_name: values.api_name,
        api_description: values.api_description || null,
        endpoint_path: values.endpoint_path,
        http_method: values.http_method,
        endpoint_description: values.endpoint_description || null,
        version_number: 1,
        api_status: "draft",
        created_at: new Date(),
        isDeleted: false,
      };

      const insertResult = await trx
        .insertInto("apis")
        .values(apiPayload)
        .executeTakeFirstOrThrow();

      const insertedId = Number(insertResult.insertId);

      const insertedApi = await trx
        .selectFrom("apis")
        .selectAll()
        .where("api_id", "=", insertedId)
        .executeTakeFirstOrThrow();

      return insertedApi;
    });

    try {
      await Api.create({
        api_id: result.api_id,
        user_id: result.user_id,
        project_id: result.project_id,
        api_name: result.api_name,
        api_description: result.api_description,
        endpoint_path: result.endpoint_path,
        http_method: result.http_method,
        endpoint_description: result.endpoint_description,
        middleware_config: values.middleware_config || null,
        parameters: values.parameters || null,
        allowedFilters: values.allowedFilters || null,
        responses: values.responses || null,
        version_number: result.version_number,
        api_status: result.api_status,
        created_at: new Date(result.created_at),
        isDeleted: false,
        versions: [],
      });
    } catch (mongoError) {
      logger.error(
        { error: mongoError },
        "createApi: failed to store API in MongoDB"
      );
      throw mongoError;
    }

    end({ operation: "create_api", success: "true" });
    return {
      ...result,
      created_at: result.created_at.toISOString(),
      parameters: values.parameters || null,
      allowedFilters: values.allowedFilters || null,
      responses: values.responses || null,
      middleware_config: values.middleware_config || null,
    };
  } catch (error: any) {
    end({ operation: "create_api", success: "false" });
    if (error.errno === 1062) {
      throw error;
    }
    logger.error({ error }, "createApi: failed to create API");
    throw error;
  }
}

/**
 * Retrieves a paginated list of APIs for a specific project and user.
 *
 * @param offset - The number of records to skip.
 * @param limit - The number of records to return.
 * @param project_id - The project ID to filter APIs.
 * @param user_id - The user ID to filter APIs.
 * @param name - Optional name to filter APIs by partial match.
 * @returns A promise that resolves to an array of matching APIs.
 */
export async function getApis(
  offset: number = 0,
  limit: number = 10,
  project_id: number,
  user_id: number,
  name?: string
): Promise<any[]> {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    // let query = db
    //   .selectFrom("apis")
    //   .selectAll()
    //   .where("project_id", "=", project_id)
    //   .where("user_id", "=", user_id)
    //   .where("isDeleted", "=", false);

    // if (name) {
    //   query = query.where("api_name", "like", `%${name}%`);
    // }

    // const result = await query.limit(limit).offset(offset).execute();

    // const formattedResult = await Promise.all(
    //   result.map(async (api) => {
    //     const mongoApi = await Api.findOne({ api_id: api.api_id });
    //     return {
    //       ...api,
    //       created_at: new Date(api.created_at).toISOString(),
    //       parameters: mongoApi?.parameters || null,
    //       allowedFilters: mongoApi?.allowedFilters || null,
    //       responses: mongoApi?.responses || null,
    //       middleware_config: mongoApi?.middleware_config || null,
    //     };
    //   })
    // );

    const formattedResult = await Api.find({ project_id: project_id });
    end({ operation: "get_apis", success: "true" });
    return formattedResult;
  } catch (error) {
    end({ operation: "get_apis", success: "false" });
    logger.error({ error }, "getApis: failed to get APIs");
    throw error;
  }
}

export async function getAPIStats(user_id: number): Promise<any> {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    const result = await Api.aggregate([
      { $match: { user_id: user_id } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          draft: {
            $sum: {
              $cond: [{ $eq: ["$api_status", "draft"] }, 1, 0],
            },
          },
          active: {
            $sum: {
              $cond: [{ $eq: ["$api_status", "active"] }, 1, 0],
            },
          },
          inactive: {
            $sum: {
              $cond: [{ $eq: ["$api_status", "inactive"] }, 1, 0],
            },
          },
          suspended: {
            $sum: {
              $cond: [{ $eq: ["$api_status", "suspended"] }, 1, 0],
            },
          },
        },
      },
    ]);

    end({ operation: "get_api_stats", success: "true" });
    return result;
  } catch (error) {
    end({ operation: "get_api_stats", success: "false" });
    logger.error({ error }, "getApiStats: failed to get API stats");
    throw error;
  }
}

/**
 * Fetches a single API by its ID and user.
 *
 * @param api_id - The ID of the API to retrieve.
 * @param user_id - The user ID for ownership validation.
 * @returns A promise that resolves to the API object.
 */
export async function getApiById(
  api_id: number,
  user_id: number
): Promise<any> {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    const result = await db
      .selectFrom("apis")
      .select(["api_name"])
      .where("api_id", "=", api_id)
      .where("user_id", "=", user_id)
      .where("isDeleted", "=", false)
      .executeTakeFirst();
    if (result) {
      const mongoApi = await Api.findOne({ api_id: api_id });
      end({ operation: "get_api_by_id", success: "true" });
      return mongoApi;
    } else {
      throw new Error(`API with ID ${api_id} not found for user ${user_id}`);
    }

    // return {
    //   ...result,
    //   created_at: new Date(result.created_at).toISOString(),
    //   parameters: mongoApi?.parameters || null,
    //   allowedFilters: mongoApi?.allowedFilters || null,
    //   responses: mongoApi?.responses || null,
    //   middleware_config: mongoApi?.middleware_config || null,
    // };
  } catch (error) {
    end({ operation: "get_api_by_id", success: "false" });
    logger.error({ error }, "getApiById: failed to get API");
    throw error;
  }
}

/**
 * Updates an existing API with new details. Also increments version if key fields change.
 *
 * @param api_id - The ID of the API to update.
 * @param values - The updated fields and values.
 * @param user_id - The user ID performing the update.
 * @returns A promise that resolves to the updated API object, or null if not found.
 */
export async function updateApi(
  api_id: number,
  values: IApiUpdateBody,
  user_id: number
): Promise<IApiReply | null> {
  const end = databaseQueryTimeHistogram.startTimer();

  try {
    validateApiUpdatePayload(values);

    const updatePayload: Updateable<ApisTable> = {
      project_id: values.project_id,
      api_name: values.api_name,
      api_description: values.api_description,
      endpoint_path: values.endpoint_path,
      http_method: values.http_method,
      endpoint_description: values.endpoint_description,
      api_status: values.api_status,
    };

    // Remove undefined fields
    (Object.keys(updatePayload) as (keyof Updateable<ApisTable>)[]).forEach(
      (key) => {
        if (updatePayload[key] === undefined) {
          delete updatePayload[key];
        }
      }
    );

    let shouldIncrementVersion = false; // Declare at higher scope
    const result = await db.transaction().execute(async (trx) => {
      const existingApi = await trx
        .selectFrom("apis")
        .selectAll()
        .where("api_id", "=", api_id)
        .where("user_id", "=", user_id)
        .where("isDeleted", "=", false)
        .executeTakeFirst();

      if (!existingApi) {
        throw new Error(`API with ID ${api_id} not found for user ${user_id}`);
      }

      // Determine if version should increment
      shouldIncrementVersion = !!(
        values.endpoint_path ||
        values.http_method ||
        values.endpoint_description
      );

      if (shouldIncrementVersion) {
        updatePayload.version_number = existingApi.version_number + 1;
      }

      const updateResult = await trx
        .updateTable("apis")
        .set(updatePayload)
        .where("api_id", "=", api_id)
        .where("user_id", "=", user_id)
        .executeTakeFirst();

      if (Number(updateResult.numUpdatedRows) === 0) {
        throw new Error(`API with ID ${api_id} not found for user ${user_id}`);
      }

      const updatedApi = await trx
        .selectFrom("apis")
        .selectAll()
        .where("api_id", "=", api_id)
        .executeTakeFirstOrThrow();

      return updatedApi;
    });

    try {
      const existingMongoApi = await Api.findOne({ api_id: api_id });
      if (!existingMongoApi) {
        throw new Error(`API with ID ${api_id} not found in MongoDB`);
      }

      if (shouldIncrementVersion) {
        const versionSnapshot = {
          version_number: existingMongoApi.version_number,
          api_name: existingMongoApi.api_name,
          api_description: existingMongoApi.api_description,
          endpoint_path: existingMongoApi.endpoint_path,
          http_method: existingMongoApi.http_method,
          endpoint_description: existingMongoApi.endpoint_description,
          middleware_config: existingMongoApi.middleware_config,
          parameters: existingMongoApi.parameters,
          allowedFilters: existingMongoApi.allowedFilters,
          responses: existingMongoApi.responses,
          created_at: existingMongoApi.created_at,
        };

        await Api.findOneAndUpdate(
          { api_id: api_id },
          {
            $set: {
              project_id: result.project_id,
              api_name: result.api_name,
              api_description: result.api_description,
              endpoint_path: result.endpoint_path,
              http_method: result.http_method,
              endpoint_description: result.endpoint_description,
              middleware_config:
                values.middleware_config ?? existingMongoApi.middleware_config,
              parameters: values.parameters ?? existingMongoApi.parameters,
              allowedFilters:
                values.allowedFilters ?? existingMongoApi.allowedFilters,
              responses: values.responses ?? existingMongoApi.responses,
              version_number: result.version_number,
              api_status: result.api_status,
            },
            $push: { versions: versionSnapshot },
          },
          { new: true }
        );
      } else {
        await Api.findOneAndUpdate(
          { api_id: api_id },
          {
            project_id: result.project_id,
            api_name: result.api_name,
            api_description: result.api_description,
            endpoint_path: result.endpoint_path,
            http_method: result.http_method,
            endpoint_description: result.endpoint_description,
            middleware_config:
              values.middleware_config ?? existingMongoApi.middleware_config,
            parameters: values.parameters ?? existingMongoApi.parameters,
            allowedFilters:
              values.allowedFilters ?? existingMongoApi.allowedFilters,
            responses: values.responses ?? existingMongoApi.responses,
            version_number: result.version_number,
            api_status: result.api_status,
          },
          { new: true }
        );
      }
    } catch (mongoError) {
      logger.error(
        { error: mongoError },
        "updateApi: failed to update API in MongoDB"
      );
      throw mongoError;
    }

    const mongoApi = await Api.findOne({ api_id: api_id });

    end({ operation: "update_api", success: "true" });
    return {
      ...result,
      created_at: result.created_at.toISOString(),
      parameters: mongoApi?.parameters || null,
      allowedFilters: mongoApi?.allowedFilters || null,
      responses: mongoApi?.responses || null,
      middleware_config: mongoApi?.middleware_config || null,
    };
  } catch (error: any) {
    end({ operation: "update_api", success: "false" });
    if (error.errno === 1062) {
      throw error;
    }
    logger.error({ error }, "updateApi: failed to update API");
    throw error;
  }
}

/**
 * Marks an API as deleted by setting the isDeleted flag and modifying its endpoint_path.
 * Also updates the corresponding MongoDB document.
 *
 * @param api_id - The ID of the API to delete.
 * @param user_id - The user ID performing the deletion.
 * @returns A promise that resolves to the deleted API object, or null if not found.
 */
export async function deleteApi(
  api_id: number,
  user_id: number
): Promise<IApiReply | null> {
  const end = databaseQueryTimeHistogram.startTimer();

  try {
    const result = await db.transaction().execute(async (trx) => {
      const apiToDelete = await trx
        .selectFrom("apis")
        .selectAll()
        .where("api_id", "=", api_id)
        .where("user_id", "=", user_id)
        .where("isDeleted", "=", false)
        .executeTakeFirst();

      if (!apiToDelete) {
        return null;
      }

      // Modify endpoint_path to avoid unique constraint violation
      const deletedEndpointPath = `${
        apiToDelete.endpoint_path
      }-deleted-${Date.now()}`;

      const updateResult = await trx
        .updateTable("apis")
        .set({
          isDeleted: true,
          endpoint_path: deletedEndpointPath,
        })
        .where("api_id", "=", api_id)
        .where("user_id", "=", user_id)
        .executeTakeFirst();

      if (Number(updateResult.numUpdatedRows) === 0) {
        return null;
      }

      return { ...apiToDelete, endpoint_path: deletedEndpointPath };
    });

    if (result) {
      try {
        const mongoApi = await Api.findOne({ api_id: api_id });
        await Api.findOneAndUpdate(
          { api_id: api_id },
          {
            isDeleted: true,
            endpoint_path: result.endpoint_path,
          }
        );
        end({ operation: "delete_api", success: "true" });
        return {
          ...result,
          created_at: new Date(result.created_at).toISOString(),
          parameters: mongoApi?.parameters || null,
          allowedFilters: mongoApi?.allowedFilters || null,
          responses: mongoApi?.responses || null,
          middleware_config: mongoApi?.middleware_config || null,
        };
      } catch (mongoError) {
        logger.error(
          { error: mongoError },
          "deleteApi: failed to delete API from MongoDB"
        );
        throw mongoError;
      }
    }

    end({ operation: "delete_api", success: "false" });
    return null;
  } catch (error) {
    end({ operation: "delete_api", success: "false" });
    logger.error({ error }, "deleteApi: failed to delete API");
    throw error;
  }
}

/**
 * Syncs all APIs from the SQL database into MongoDB.
 * Overwrites all MongoDB API documents.
 *
 * @returns A promise that resolves when syncing is complete.
 */
export async function syncApisToMongoDB(): Promise<void> {
  try {
    const apis = await db
      .selectFrom("apis")
      .selectAll()
      .where("isDeleted", "=", false)
      .execute();

    await Api.deleteMany({});

    if (apis.length > 0) {
      const formattedApis = apis.map((api) => ({
        api_id: api.api_id,
        user_id: api.user_id,
        project_id: api.project_id,
        api_name: api.api_name,
        api_description: api.api_description,
        endpoint_path: api.endpoint_path,
        http_method: api.http_method,
        endpoint_description: api.endpoint_description,
        middleware_config: null,
        parameters: null,
        allowedFilters: null,
        responses: null,
        version_number: api.version_number,
        api_status: api.api_status,
        created_at: new Date(api.created_at),
        isDeleted: false,
        versions: [],
      }));

      await Api.insertMany(formattedApis);
      logger.info(`Successfully synchronized ${apis.length} APIs to MongoDB`);
    }
  } catch (error) {
    logger.error(
      { error },
      "syncApisToMongoDB: failed to synchronize APIs to MongoDB"
    );
    throw error;
  }
}
