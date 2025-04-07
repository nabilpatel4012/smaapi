import { Insertable, Updateable } from "kysely";
import { db } from "../../../db/db";
import { databaseQueryTimeHistogram } from "../../../utils/metrics";
import { logger } from "../../../utils/logger";
import { ApisTable } from "../../../db/kysley.schema";
import { IApiBody, IApiReply } from "../../../common/types/api.types";
import { Api } from "../../core/schema/db-schema"; // Import the Mongoose model

/**
 * Creates a new API in both the relational database and MongoDB.
 *
 * @param values - The API data to insert, conforming to the Insertable<ApisTable> type.
 * @returns A Promise that resolves to the newly created API data, conforming to IApiReply.
 * @throws An error if either database operation fails.
 */
export async function createApi(
  values: IApiBody,
  user_id: number
): Promise<any> {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    // Step 1: Insert into relational database first
    const payload = values;
    // const payload: Insertable<ApisTable> = values;
    // const result = await db
    //   .insertInto("apis")
    //   .values(payload)
    //   .returningAll()
    //   .executeTakeFirst();

    // Step 2: Insert the same data into MongoDB
    // if (result) {
    //   try {
    //     await Api.create({
    //       ...result,
    //       created_at: new Date(result.created_at),
    //       updated_at: result.updated_at
    //         ? new Date(result.updated_at)
    //         : undefined,
    //     });
    //   } catch (mongoError) {
    //     logger.error(
    //       { error: mongoError },
    //       "createApi: failed to store API in MongoDB"
    //     );
    //     // We don't throw here - we prioritize the relational DB as the source of truth
    //   }
    // }

    // end({ operation: "create_api", success: "true" });
    console.log(payload);
    return payload!;
  } catch (error) {
    end({ operation: "create_api", success: "false" });
    logger.error({ error }, "createApi: failed to create API");
    throw error;
  }
}

/**
 * Retrieves a list of APIs from the relational database, with optional pagination and filtering.
 *
 * @param offset - The number of APIs to skip from the beginning (for pagination).
 * @param limit - The maximum number of APIs to retrieve.
 * @param project_id - The project ID to filter APIs by.
 * @param user_id - Required for fetching the user specific APIs only.
 * @param name - An optional string to filter APIs by name (case-insensitive).
 * @returns A Promise that resolves to an array of API data.
 * @throws An error if the database operation fails.
 */
// export async function getApis(
//   offset: number,
//   limit: number,
//   project_id: number,
//   user_id: number,
//   name?: string
// ): Promise<IApiReply[]> {
//   const end = databaseQueryTimeHistogram.startTimer();
//   try {
//     const result = await db
//       .selectFrom("apis")
//       .selectAll()
//       .where("project_id", "=", project_id)
//       .where("user_id", "=", user_id)
//       .where((eb) => (name ? eb.where("api_name", "ilike", `%${name}%`) : eb))
//       .limit(limit || 10)
//       .offset(offset || 0)
//       .execute();
//     end({ operation: "get_apis", success: "true" });
//     return result;
//   } catch (error) {
//     end({ operation: "get_apis", success: "false" });
//     logger.error({ error }, "getApis: failed to get APIs");
//     throw error;
//   }
// }

/**
 * Get an API with api_id.
 *
 * @param api_id - The API id.
 * @param user_id - Required for fetching the user specific APIs only.
 * @returns A Promise that resolves to a single API data.
 * @throws An error if the database operation fails.
 */
// export async function getApiById(
//   api_id: number,
//   user_id: number
// ): Promise<IApiReply> {
//   const end = databaseQueryTimeHistogram.startTimer();
//   try {
//     const result = await db
//       .selectFrom("apis")
//       .selectAll()
//       .where("api_id", "=", api_id)
//       .where("user_id", "=", user_id)
//       .execute();
//     end({ operation: "get_api_by_id", success: "true" });
//     return result[0];
//   } catch (error) {
//     end({ operation: "get_api_by_id", success: "false" });
//     logger.error({ error }, "getApiById: failed to get API");
//     throw error;
//   }
// }

/**
 * Updates an existing API in both the relational database and MongoDB.
 *
 * @param api_id - The ID of the API to update.
 * @param values - The API data to update, conforming to the Updateable<ApisTable> type.
 * @param user_id - Required for updating the user specific APIs only.
 * @returns A Promise that resolves to the updated API data.
 * @throws An error if the database operation fails.
 */
// export async function updateApi(
//   api_id: number,
//   values: Updateable<ApisTable>,
//   user_id: number
// ): Promise<IApiReply | null> {
//   const end = databaseQueryTimeHistogram.startTimer();
//   try {
//     // Step 1: Update in relational database first
//     const result = await db
//       .updateTable("apis")
//       .set({
//         ...values,
//         updated_at: new Date().toISOString(),
//       })
//       .where("api_id", "=", api_id)
//       .where("user_id", "=", user_id)
//       .returning([
//         "api_id",
//         "project_id",
//         "user_id",
//         "api_name",
//         "api_description",
//         "method",
//         "endpoint",
//         "endpoint_description",
//         "parameters",
//         "allowedFilters",
//         "responses",
//         "created_at",
//         "updated_at",
//         "api_status",
//       ])
//       .executeTakeFirst();

//     // Step 2: Update in MongoDB
//     if (result) {
//       try {
//         await Api.findOneAndUpdate(
//           { api_id: api_id },
//           {
//             ...values,
//             updated_at: new Date(),
//           }
//         );
//       } catch (mongoError) {
//         logger.error(
//           { error: mongoError },
//           "updateApi: failed to update API in MongoDB"
//         );
//         // We don't throw here - we prioritize the relational DB as the source of truth
//       }
//     }

//     end({ operation: "update_api", success: result ? "true" : "false" });
//     return result || null;
//   } catch (error) {
//     end({ operation: "update_api", success: "false" });
//     logger.error({ error }, "updateApi: failed to update API");
//     throw error;
//   }
// }

/**
 * Deletes an API from both the relational database and MongoDB.
 *
 * @param api_id - The ID of the API to delete.
 * @param user_id - Required for deleting the user specific APIs only.
 * @returns A Promise that resolves to the deleted API data.
 * @throws An error if the relational database operation fails.
 */
// export async function deleteApi(
//   api_id: number,
//   user_id: number
// ): Promise<IApiReply | null> {
//   const end = databaseQueryTimeHistogram.startTimer();
//   try {
//     // Step 1: Delete from relational database first

//     // const result = await db
//     //   .deleteFrom("apis")
//     //   .where("api_id", "=", api_id)
//     //   .where("user_id", "=", user_id)
//     //   .returning([
//     //     "api_id",
//     //     "project_id",
//     //     "user_id",
//     //     "api_name",
//     //     "api_description",
//     //     "method",
//     //     "endpoint",
//     //     "endpoint_description",
//     //     "parameters",
//     //     "allowedFilters",
//     //     "responses",
//     //     "created_at",
//     //   ])
//     //   .executeTakeFirst();

//     // Step 2: Delete from MongoDB
//     if (result) {
//       try {
//         await Api.deleteOne({ api_id: api_id });
//       } catch (mongoError) {
//         logger.error(
//           { error: mongoError },
//           "deleteApi: failed to delete API from MongoDB"
//         );
//         // We don't throw here - we prioritize the relational DB as the source of truth
//       }
//     }

//     end({ operation: "delete_api", success: result ? "true" : "false" });
//     return result || null;
//   } catch (error) {
//     end({ operation: "delete_api", success: "false" });
//     logger.error({ error }, "deleteApi: failed to delete API");
//     throw error;
//   }
// }

/**
 * Synchronizes all APIs from the relational database to MongoDB.
 * Useful for initial setup or data recovery.
 */
export async function syncApisToMongoDB(): Promise<void> {
  try {
    // Get all APIs from the relational database
    const apis = await db.selectFrom("apis").selectAll().execute();

    // Clear existing APIs in MongoDB and insert all from relational DB
    await Api.deleteMany({});

    // Insert in batches if there are many APIs
    if (apis.length > 0) {
      const formattedApis = apis.map((api) => ({
        ...api,
        created_at: new Date(api.created_at),
        updated_at: api.updated_at ? new Date(api.updated_at) : undefined,
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
