import argon2 from "argon2";
import { Insertable, Updateable } from "kysely"; // Import Kysely types
import { db } from "../../db/db"; // Your Kysely instance
import { UsersTable } from "../../db/kysley.schema"; // Import the Kysely table interface
import { databaseQueryTimeHistogram } from "../../utils/metrics";
import { logger } from "../../utils/logger";
import { IUserReply } from "../../common/types/user.types";

/**
 * Create a new user (Register)
 */
export async function createUser(
  values: Insertable<UsersTable>
): Promise<IUserReply> {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    const hashedPassword = await argon2.hash(values.password_hash); // Hash the password
    const payload: Insertable<UsersTable> = {
      ...values,
      username: values.username,
      email: values.email.toLowerCase(),
      password_hash: hashedPassword,
    };

    const result = await db
      .insertInto("users")
      .values(payload)
      .executeTakeFirst();
    end({ operation: "create_user", success: "true" });

    const insertedID = Number(result.insertId!);
    return db
      .selectFrom("users")
      .select([
        "user_id",
        "username",
        "email",
        "user_type",
        "first_name",
        "last_name",
        "phone_number",
        "is_verified",
        "is_active",
        "created_at",
        "plan_type",
        "plan_expires_at",
      ])
      .where("user_id", "=", insertedID)
      .executeTakeFirstOrThrow();
  } catch (error) {
    end({ operation: "create_user", success: "false" });
    logger.error({ error }, "createUser: failed to create user");
    throw error;
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: number) {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    const result = await db
      .selectFrom("users")
      .where("user_id", "=", userId)
      .select([
        "user_id",
        "username",
        "email",
        "bio",
        "is_active",
        "is_verified",
        "user_type",
        "first_name",
        "last_name",
        "phone_number",
        "plan_type",
        "plan_expires_at",
        "created_at",
      ])
      .execute();

    end({ operation: "get_user_by_id", success: "true" });

    return result[0];
  } catch (error) {
    end({ operation: "get_user_by_id", success: "false" });

    logger.error({ error, userId }, "getUserById: failed to get user");
    throw error;
  }
}

/**
 * Find user by email
 */
export async function findUserByEmail({ email }: { email: string }): Promise<{
  user_id: number;
  email: string;
  password_hash: string;
  username: string;
}> {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    const result = await db
      .selectFrom("users")
      .select(["user_id", "username", "email", "password_hash"])
      .where("email", "=", email)
      .execute();

    end({ operation: "find_user_by_email", success: "true" });

    return { ...result[0] };
  } catch (error) {
    end({ operation: "find_user_by_email", success: "false" });

    logger.error({ error, email }, "findUserByEmail: failed to find user");
    throw error;
  }
}

/**
 * Update user details
 */
export async function updateUser(
  userId: number,
  values: Updateable<UsersTable>
) {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    // If password is being updated, hash it
    if (values.password_hash) {
      values.password_hash = await argon2.hash(values.password_hash);
    }

    const result = await db
      .updateTable("users")
      .set(values)
      .where("user_id", "=", userId)
      .executeTakeFirst();

    end({ operation: "update_user", success: "true" });

    return result.numUpdatedRows > 0;
  } catch (error) {
    end({ operation: "update_user", success: "false" });

    logger.error({ error, userId }, "updateUser: failed to update user");
    throw error;
  }
}

/**
 * Delete user by ID
 */
export async function deleteUser(userId: number) {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    const result = await db
      .deleteFrom("users")
      .where("user_id", "=", userId)
      .executeTakeFirst();

    end({ operation: "delete_user", success: "true" });

    return result.numDeletedRows > 0;
  } catch (error) {
    end({ operation: "delete_user", success: "false" });

    logger.error({ error, userId }, "deleteUser: failed to delete user");
    throw error;
  }
}

/**
 * Verify user password
 */
export async function verifyPassword({
  candidatePassword,
  hashedPassword,
}: {
  candidatePassword: string;
  hashedPassword: string;
}) {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    const result = await argon2.verify(hashedPassword, candidatePassword);

    end({ operation: "verify_password", success: "true" });

    return result;
  } catch (error) {
    end({ operation: "verify_password", success: "false" });

    logger.error({ error }, "verifyPassword: failed to verify password");
    throw error;
  }
}
