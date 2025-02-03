import { Kysely, sql } from "kysely";
import { Database } from "./kysley.schema";

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .createTable("users")
    .addColumn("user_id", "serial", (col) => col.primaryKey())
    .addColumn("username", "varchar(100)", (col) => col.unique().notNull())
    .addColumn("email", "varchar(140)", (col) => col.unique().notNull())
    .addColumn("password_hash", "varchar(250)", (col) => col.notNull())
    // User type (individual or business)
    .addColumn("user_type", "varchar(20)", (col) =>
      col.defaultTo("individual").notNull(),
    )
    // Business-specific fields (only required if user_type = 'business')
    .addColumn("company_name", "varchar(200)")
    .addColumn("company_email", "varchar(140)")
    // Subscription details
    .addColumn("plan_type", "varchar(50)", (col) =>
      col.defaultTo("SMAAPI_FREE").notNull(),
    )
    .addColumn("plan_expires_at", "timestamp")
    // User profile details
    .addColumn("first_name", "varchar(100)")
    .addColumn("last_name", "varchar(100)")
    .addColumn("phone_number", "varchar(20)")
    .addColumn("avatar_url", "varchar(255)")
    .addColumn("bio", "text")
    // Security & logging
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addColumn("last_login_at", "timestamp")
    .addColumn("is_verified", "boolean", (col) =>
      col.defaultTo(false).notNull(),
    )
    .addColumn("is_active", "boolean", (col) => col.defaultTo(true).notNull())
    .execute();

  await db.schema
    .createTable("sessions")
    .addColumn("session_id", "serial", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.references("users.user_id").onDelete("cascade").notNull(),
    )
    .addColumn("auth_token", "varchar(500)", (col) => col.unique().notNull())
    .addColumn("refresh_token", "varchar(500)", (col) => col.unique().notNull())
    .addColumn("ip_address", "varchar(45)", (col) => col.notNull()) // IPv4/IPv6
    .addColumn("user_agent", "varchar(500)")
    .addColumn("login_time", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addColumn("expires_at", "timestamp", (col) => col.notNull()) // Expiration for refresh token
    .execute();

  await db.schema
    .createIndex("idx_sessions_user_id")
    .on("sessions")
    .column("user_id")
    .execute();

  await db.schema
    .createIndex("idx_sessions_auth_token")
    .on("sessions")
    .column("auth_token")
    .execute();

  await db.schema
    .createIndex("idx_sessions_refresh_token")
    .on("sessions")
    .column("refresh_token")
    .execute();

  await db.schema
    .createTable("apis")
    .addColumn("api_id", "serial", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.references("users.user_id").onDelete("cascade").notNull(),
    )
    .addColumn("api_name", "varchar(500)", (col) => col.notNull())
    .addColumn("api_description", "text")
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addColumn("updated_at", "timestamp")
    .addColumn("api_status", "varchar(50)", (col) => col.defaultTo("draft"))
    .execute();

  await db.schema
    .createTable("api_versions")
    .addColumn("version_id", "serial", (col) => col.primaryKey())
    .addColumn("api_id", "integer", (col) =>
      col.references("apis.api_id").onDelete("cascade").notNull(),
    )
    .addColumn("version_number", "varchar(50)", (col) => col.notNull())
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addColumn("is_current", "boolean", (col) => col.defaultTo(true))
    .execute();

  await db.schema
    .createTable("middleware")
    .addColumn("middleware_id", "serial", (col) => col.primaryKey())
    .addColumn("middleware_name", "varchar(250)", (col) =>
      col.unique().notNull(),
    )
    .addColumn("middleware_description", "text")
    .addColumn("configuration_schema", "json")
    .execute();

  await db.schema
    .createTable("api_middleware")
    .addColumn("api_middleware_id", "serial", (col) => col.primaryKey())
    .addColumn("version_id", "integer", (col) =>
      col.references("api_versions.version_id").onDelete("cascade").notNull(),
    )
    .addColumn("middleware_id", "integer", (col) =>
      col.references("middleware.middleware_id").onDelete("cascade").notNull(),
    )
    .addColumn("middleware_order", "integer")
    .addColumn("middleware_config", "json")
    .execute();

  await db.schema
    .createTable("api_endpoints")
    .addColumn("endpoint_id", "serial", (col) => col.primaryKey())
    .addColumn("version_id", "integer", (col) =>
      col.references("api_versions.version_id").onDelete("cascade").notNull(),
    )
    .addColumn("endpoint_path", "varchar(500)", (col) => col.notNull())
    .addColumn("http_method", "varchar(50)", (col) => col.notNull())
    .addColumn("request_schema_id", "varchar(200)")
    .addColumn("response_schema_id", "varchar(200)")
    .execute();

  await db.schema
    .createTable("api_keys")
    .addColumn("api_key_id", "serial", (col) => col.primaryKey())
    .addColumn("api_id", "integer", (col) =>
      col.references("apis.api_id").onDelete("cascade").notNull(),
    )
    .addColumn("api_key", "varchar(250)", (col) => col.unique().notNull())
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addColumn("is_active", "boolean", (col) => col.defaultTo(true))
    .execute();

  // Indexes
  await db.schema
    .createIndex("idx_users_username")
    .on("users")
    .column("username")
    .execute();
  await db.schema
    .createIndex("idx_users_email")
    .on("users")
    .column("email")
    .execute();
  await db.schema
    .createIndex("idx_apis_user_id")
    .on("apis")
    .column("user_id")
    .execute();
  await db.schema
    .createIndex("idx_api_versions_api_id")
    .on("api_versions")
    .column("api_id")
    .execute();
  await db.schema
    .createIndex("idx_api_middleware_version_id")
    .on("api_middleware")
    .column("version_id")
    .execute();
  await db.schema
    .createIndex("idx_api_endpoints_version_id")
    .on("api_endpoints")
    .column("version_id")
    .execute();
  await db.schema
    .createIndex("idx_api_keys_api_id")
    .on("api_keys")
    .column("api_id")
    .execute();
  await db.schema
    .createIndex("idx_api_endpoints_path_method")
    .on("api_endpoints")
    .columns(["endpoint_path", "http_method"])
    .execute();
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema.dropTable("api_keys").execute();
  await db.schema.dropTable("api_endpoints").execute();
  await db.schema.dropTable("api_middleware").execute();
  await db.schema.dropTable("middleware").execute();
  await db.schema.dropTable("api_versions").execute();
  await db.schema.dropTable("apis").execute();
  await db.schema.dropTable("users").execute();
  await db.schema.dropTable("sessions").execute();
}
