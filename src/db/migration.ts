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
      col.defaultTo("individual").notNull()
    )
    // Business-specific fields (only required if user_type = 'business')
    .addColumn("company_name", "varchar(200)")
    .addColumn("company_email", "varchar(140)")
    // Subscription details
    .addColumn("plan_type", "varchar(50)", (col) =>
      col.defaultTo("SMAAPI_FREE").notNull()
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
      col.defaultTo(sql`now()`).notNull()
    )
    .addColumn("last_login_at", "timestamp")
    .addColumn("is_verified", "boolean", (col) =>
      col.defaultTo(false).notNull()
    )
    .addColumn("is_active", "boolean", (col) => col.defaultTo(true).notNull())
    .execute();

  await db.schema
    .createTable("sessions")
    .addColumn("session_id", "serial", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.references("users.user_id").onDelete("cascade").notNull()
    )
    .addColumn("refresh_token", "varchar(500)", (col) => col.unique().notNull())
    .addColumn("is_valid", "boolean", (col) => col.defaultTo(true).notNull())
    .addColumn("ip_address", "varchar(45)", (col) => col.notNull()) // IPv4/IPv6
    .addColumn("user_agent", "varchar(500)")
    .addColumn("login_time", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .addColumn("expires_at", "timestamp", (col) => col.notNull()) // Expiration for refresh token
    .execute();

  await db.schema
    .createTable("projects")
    .addColumn("project_id", "serial", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.references("users.user_id").onDelete("cascade").notNull()
    )
    .addColumn("project_name", "varchar(255)", (col) => col.notNull())
    .addColumn("project_description", "text")
    .addColumn("tags", "json")
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .addUniqueConstraint("unique_user_project_name", [
      "project_name",
      "user_id",
    ])
    .execute();

  await db.schema
    .createTable("apis")
    .addColumn("api_id", "serial", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.references("users.user_id").onDelete("cascade").notNull()
    )
    .addColumn(
      "project_id",
      "integer",
      (
        col // Add project_id column
      ) => col.references("projects.project_id").onDelete("cascade").notNull() // Foreign key to projects
    )
    .addColumn("api_name", "varchar(500)", (col) => col.notNull())
    .addColumn("api_description", "text")
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .addColumn("updated_at", "timestamp")
    .addColumn("api_status", "varchar(50)", (col) => col.defaultTo("draft"))
    .execute();

  await db.schema
    .createTable("api_versions")
    .addColumn("version_id", "serial", (col) => col.primaryKey())
    .addColumn("api_id", "integer", (col) =>
      col.references("apis.api_id").onDelete("cascade").notNull()
    )
    .addColumn("version_number", "varchar(50)", (col) => col.notNull())
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .addColumn("is_current", "boolean", (col) => col.defaultTo(true))
    .execute();

  await db.schema
    .createTable("middleware")
    .addColumn("middleware_id", "serial", (col) => col.primaryKey())
    .addColumn("middleware_name", "varchar(250)", (col) => col.notNull())
    .addColumn("middleware_description", "text")
    .addColumn("configuration_schema", "json")
    .execute();

  await db.schema
    .createTable("api_middleware")
    .addColumn("api_middleware_id", "serial", (col) => col.primaryKey())
    .addColumn("version_id", "integer", (col) =>
      col.references("api_versions.version_id").onDelete("cascade").notNull()
    )
    .addColumn("middleware_id", "integer", (col) =>
      col.references("middleware.middleware_id").onDelete("cascade").notNull()
    )
    .addColumn("middleware_order", "integer")
    .addColumn("middleware_config", "json")
    .execute();

  await db.schema
    .createTable("api_endpoints")
    .addColumn("endpoint_id", "serial", (col) => col.primaryKey())
    .addColumn(
      "api_id",
      "integer",
      (
        col // Changed to api_id
      ) => col.references("apis.api_id").onDelete("cascade").notNull() // Directly references apis
    )
    .addColumn("endpoint_path", "varchar(500)", (col) => col.notNull())
    .addColumn("http_method", "varchar(50)", (col) => col.notNull())
    .addColumn("endpoint_description", "varchar(500)")
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .execute();

  await db.schema
    .createTable("api_keys")
    .addColumn("api_key_id", "serial", (col) => col.primaryKey())
    .addColumn("api_id", "integer", (col) =>
      col.references("apis.api_id").onDelete("cascade").notNull()
    )
    .addColumn("api_key", "varchar(250)", (col) => col.unique().notNull())
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .addColumn("is_active", "boolean", (col) => col.defaultTo(true))
    .execute();

  await db.schema
    .createTable("user_roles")
    .addColumn("role_id", "serial", (col) => col.primaryKey())
    .addColumn("role_name", "varchar(100)", (col) => col.unique().notNull())
    .addColumn("role_description", "text")
    .execute();

  await db.schema
    .createTable("project_members")
    .addColumn("project_member_id", "serial", (col) => col.primaryKey())
    .addColumn("project_id", "integer", (col) =>
      col.references("projects.project_id").onDelete("cascade").notNull()
    )
    .addColumn("user_id", "integer", (col) =>
      col.references("users.user_id").onDelete("cascade").notNull()
    )
    .addColumn("role_id", "integer", (col) =>
      col.references("user_roles.role_id").onDelete("set null")
    )
    .addColumn("added_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
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
    .createIndex("idx_apis_project_id")
    .on("apis")
    .column("project_id")
    .execute();
  await db.schema
    .createIndex("idx_sessions_user_id")
    .on("sessions")
    .column("user_id")
    .execute();

  await db.schema
    .createIndex("idx_sessions_refresh_token")
    .on("sessions")
    .column("refresh_token")
    .execute();

  await db.schema
    .createIndex("idx_sessions_is_valid")
    .on("sessions")
    .column("is_valid")
    .execute();

  await db.schema
    .createIndex("idx_sessions_expires_at")
    .on("sessions")
    .column("expires_at")
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
  // await db.schema
  //   .createIndex("idx_api_endpoints_version_id")
  //   .on("api_endpoints")
  //   .column("version_id")
  //   .execute();
  await db.schema
    .createIndex("idx_api_keys_api_id")
    .on("api_keys")
    .column("api_id")
    .execute();
  await db.schema
    .createIndex("idx_api_endpoints_api_id") // New index
    .on("api_endpoints")
    .column("api_id")
    .execute();

  await db.schema
    .createIndex("idx_api_endpoints_path_method")
    .on("api_endpoints")
    .columns(["endpoint_path", "http_method"])
    .execute();
  await db.schema
    .createIndex("idx_projects_user_id")
    .on("projects")
    .column("user_id")
    .execute();
  await db.schema
    .createIndex("idx_projects_name")
    .on("projects")
    .column("project_name")
    .execute();
  await db.schema
    .createIndex("idx_project_members_project_id")
    .on("project_members")
    .column("project_id")
    .execute();

  await db.schema
    .createIndex("idx_project_members_user_id")
    .on("project_members")
    .column("user_id")
    .execute();
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema.dropTable("project_members").execute();
  await db.schema.dropTable("user_roles").execute();
  await db.schema.dropTable("api_keys").execute();
  await db.schema.dropTable("api_endpoints").execute();
  await db.schema.dropTable("api_middleware").execute();
  await db.schema.dropTable("middleware").execute();
  await db.schema.dropTable("api_versions").execute();
  await db.schema.dropTable("apis").execute();
  await db.schema.dropTable("projects").execute();
  await db.schema.dropTable("sessions").execute();
  await db.schema.dropTable("users").execute();
}
