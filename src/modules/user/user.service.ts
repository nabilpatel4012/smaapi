import argon2 from "argon2";
import { Insertable, sql, Updateable } from "kysely"; // Import Kysely types
import { db } from "../../db/db"; // Your Kysely instance
import { UsersTable } from "../../db/kysely.schema"; // Import the Kysely table interface
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
    const hashedPassword = await argon2.hash(values.password_hash);

    const payload: Insertable<UsersTable> = {
      ...values,
      email: values.email.toLowerCase(),
      password_hash: hashedPassword,
    };

    const insertResult = await db
      .insertInto("users")
      .values(payload)
      .executeTakeFirst();

    const insertedId = Number(insertResult.insertId);

    const result = await db
      .selectFrom("users")
      .select([
        "user_id",
        "username",
        "email",
        "user_type",
        "company_name",
        "company_email",
        "plan_type",
        "plan_expires_at",
        "first_name",
        "last_name",
        "phone_number",
        "avatar_url",
        "bio",
        "created_at",
        "is_active",
        "is_verified",
      ])
      .where("user_id", "=", insertedId)
      .executeTakeFirst();

    end({ operation: "create_user", success: "true" });
    return result!;
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
        "user_type",
        "company_name",
        "company_email",
        "plan_type",
        "plan_expires_at",
        "first_name",
        "last_name",
        "phone_number",
        "avatar_url",
        "bio",
        "created_at",
        "is_active",
        "is_verified",
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
    const payload = { isDeleted: true, deletedAt: new Date() };
    const result = await db
      .updateTable("users")
      .set(payload)
      .where("user_id", "=", userId)
      .executeTakeFirst();

    end({ operation: "delete_user", success: "true" });

    return result.numUpdatedRows > 0;
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

/**
 * Store user session
 */

export async function storeUserSession(
  userId: number,
  refreshToken: string,
  ipAddress: string,
  userAgent: string,
  expiresAt: Date
) {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    // Invalidate existing refresh tokens for the user
    await db
      .updateTable("sessions")
      .set({ is_valid: false }) // Mark existing refresh tokens as invalid
      .where("user_id", "=", userId)
      .execute();

    // Insert new session
    await db
      .insertInto("sessions")
      .values({
        user_id: userId,
        refresh_token: refreshToken,
        ip_address: ipAddress,
        user_agent: userAgent,
        is_valid: true,
        expires_at: expiresAt.toISOString().slice(0, 19).replace("T", " "),
      })
      .executeTakeFirst();
    await db
      .updateTable("users")
      .set("last_login_at", sql`NOW()`)
      .execute();

    end({ operation: "store_user_session", success: "true" });
  } catch (error) {
    end({ operation: "store_user_session", success: "false" });

    logger.error(
      { error, userId },
      "storeUserSession: failed to store session"
    );
    throw error;
  }
}

export async function getUserSessionByRefreshToken(
  refreshToken: string,
  user_id: number
): Promise<any> {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    const result = await db
      .selectFrom("sessions")
      .select(["session_id", "user_id", "refresh_token", "expires_at"])
      .where("user_id", "=", user_id)
      .where("refresh_token", "=", refreshToken)
      .where("is_valid", "=", true)
      // .where("expires_at", ">", new Date())
      .execute();
    end({ operation: "get_user_session", success: "true" });
    if (result.length > 1) {
      logger.error({ user_id }, "userSessions: More than one session found");
      invalidateUserSession(user_id);
      end({ operation: "update_user_session_validity", success: "true" });
      throw new Error("More than one session found");
    } else if (result.length === 1) {
      if (result[0].expires_at < new Date()) {
        await db
          .updateTable("sessions")
          .set({ is_valid: false })
          .where("user_id", "=", user_id)
          .execute();
        end({ operation: "update_user_session_validity", success: "true" });
        logger.error(
          { user_id },
          "userSessions: Session expired (refresh_token expired)"
        );
        throw new Error("Session expired");
      }

      return result;
    } else if (result.length === 0) {
      logger.error({ user_id }, "userSessions: No session found");
      throw new Error("No session found");
    }
    return result;
  } catch (error) {
    end({ operation: "get_user_session", success: "false" });
    return error;
  }
}

export async function invalidateUserSession(user_id: number) {
  await db
    .updateTable("sessions")
    .set({ is_valid: false })
    .where("user_id", "=", user_id)
    .execute();
}
