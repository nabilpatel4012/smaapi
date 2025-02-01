import argon2 from "argon2";
import { eq, InferInsertModel } from "drizzle-orm";
import { type DB } from "../../db";
import { users } from "../../db/schema";
import { databaseQueryTimeHistogram } from "../../utils/metrics";
import { logger } from "../../utils/logger";

export async function createUser(
  values: InferInsertModel<typeof users>,
  db: DB
) {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    const hashedPassword = await argon2.hash(values.password);

    const payload = {
      ...values,
      email: values.email.toLowerCase(),
      password: hashedPassword,
    };

    const result = await db.insert(users).values(payload).returning({
      id: users.id,
      email: users.email,
    });

    end({
      operation: "create_user",
      success: "true",
    });

    return result[0];
  } catch (error) {
    end({
      operation: "create_user",
      success: "false",
    });

    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ message }, "createUser: failed to create user");
    throw error;
  }
}

export async function getUserById(userId: string, db: DB) {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    const result = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        password: false,
      },
    });

    end({
      operation: "get_user_by_id",
      success: "true",
    });

    return result;
  } catch (error) {
    end({
      operation: "get_user_by_id",
      success: "false",
    });

    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ message, userId }, "getUserById: failed to get user");
    throw error;
  }
}

export async function findUserByEmail({ email }: { email: string }, db: DB) {
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    const result = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    end({
      operation: "find_user_by_email",
      success: "true",
    });

    return result;
  } catch (error) {
    end({
      operation: "find_user_by_email",
      success: "false",
    });

    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ message, email }, "findUserByEmail: failed to find user");
    throw error;
  }
}

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

    end({
      operation: "verify_password",
      success: "true",
    });

    return result;
  } catch (error) {
    end({
      operation: "verify_password",
      success: "false",
    });

    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ message }, "verifyPassword: failed to verify password");
    throw error;
  }
}
