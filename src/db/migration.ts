import { Kysely, sql } from "kysely";
import { Database } from "./kysely.schema";

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .createTable("users")
    .addColumn("user_id", "serial", (col) => col.primaryKey())
    .addColumn("username", "varchar(100)", (col) => col.unique().notNull())
    .addColumn("email", "varchar(140)", (col) => col.unique().notNull())
    .addColumn("password_hash", "varchar(250)", (col) => col.notNull())
    .addColumn("user_type", "varchar(20)", (col) =>
      col.defaultTo("individual").notNull()
    )
    .addColumn("company_name", "varchar(200)")
    .addColumn("company_email", "varchar(140)")
    .addColumn("plan_type", "varchar(50)", (col) =>
      col.defaultTo("SMAAPI_FREE").notNull()
    )
    .addColumn("plan_expires_at", "timestamp")
    .addColumn("first_name", "varchar(100)")
    .addColumn("last_name", "varchar(100)")
    .addColumn("phone_number", "varchar(20)")
    .addColumn("avatar_url", "varchar(255)")
    .addColumn("bio", "text")
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn("last_login_at", "timestamp")
    .addColumn("is_verified", "boolean", (col) =>
      col.defaultTo(false).notNull()
    )
    .addColumn("is_active", "boolean", (col) => col.defaultTo(true).notNull())
    .addColumn("isDeleted", "boolean", (col) => col.defaultTo(false).notNull())
    .execute();

  await db.schema
    .createTable("sessions")
    .addColumn("session_id", "serial", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.references("users.user_id").onDelete("cascade").notNull()
    )
    .addColumn("refresh_token", "varchar(500)", (col) => col.unique().notNull())
    .addColumn("is_valid", "boolean", (col) => col.defaultTo(true).notNull())
    .addColumn("ip_address", "varchar(45)", (col) => col.notNull())
    .addColumn("user_agent", "varchar(500)")
    .addColumn("login_time", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn("expires_at", "timestamp", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("projects")
    .addColumn("project_id", "serial", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.references("users.user_id").onDelete("cascade").notNull()
    )
    .addColumn("project_name", "varchar(255)", (col) => col.notNull())
    .addColumn("project_description", "text")
    .addColumn("db_type", "varchar(15)", (col) => col.notNull().defaultTo("PG"))
    .addColumn("db_instance_type", "varchar(15)", (col) =>
      col.notNull().defaultTo("SMAAPI_GEN")
    )
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn("subdomain_url", "varchar(255)", (col) => col.unique())
    .addUniqueConstraint("unique_user_project_name", [
      "project_name",
      "user_id",
    ])
    .addColumn("isDeleted", "boolean", (col) => col.defaultTo(false).notNull())
    .execute();

  await db.schema
    .createTable("projects_tables")
    .addColumn("table_id", "serial", (col) => col.primaryKey()) // No DEFAULT; UUID generated by app
    .addColumn("project_id", "integer", (col) =>
      col.references("projects.project_id").onDelete("cascade").notNull()
    )
    .addColumn("table_name", "varchar(255)", (col) => col.notNull())
    .addColumn("table_schema", "json", (col) => col.notNull())
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn("isDeleted", "boolean", (col) => col.defaultTo(false).notNull())
    .addUniqueConstraint("unique_project_id_table_name", [
      "project_id",
      "table_name",
    ]) // Unique on project_id and table_name only
    .execute();

  await db.schema
    .createTable("project_dbs")
    .addColumn("project_db_id", "serial", (col) => col.primaryKey())
    .addColumn("project_id", "integer", (col) =>
      col.references("projects.project_id").onDelete("cascade").notNull()
    )
    .addColumn("user_id", "integer", (col) =>
      col.references("users.user_id").onDelete("cascade").notNull()
    )
    .addColumn("db_creds", "text", (col) => col.notNull()) // Encrypted credentials
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn("isDeleted", "boolean", (col) => col.defaultTo(false).notNull())
    .execute();

  await db.schema
    .createTable("apis")
    .addColumn("api_id", "serial", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.references("users.user_id").onDelete("cascade").notNull()
    )
    .addColumn("project_id", "integer", (col) =>
      col.references("projects.project_id").onDelete("cascade").notNull()
    )
    .addColumn("api_name", "varchar(500)", (col) => col.notNull())
    .addColumn("api_description", "text")
    .addColumn("endpoint_path", "varchar(500)", (col) => col.notNull())
    .addColumn("http_method", "varchar(50)", (col) => col.notNull())
    .addColumn("endpoint_description", "text")
    .addColumn("version_number", "integer", (col) => col.defaultTo(1).notNull())
    .addColumn("api_status", "varchar(50)", (col) => col.defaultTo("draft"))
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn("isDeleted", "boolean", (col) => col.defaultTo(false).notNull())
    .execute();

  await db.schema
    .createTable("api_keys")
    .addColumn("api_key_id", "serial", (col) => col.primaryKey())
    .addColumn("api_id", "integer", (col) =>
      col.references("apis.api_id").onDelete("cascade").notNull()
    )
    .addColumn("api_key", "varchar(250)", (col) => col.unique().notNull())
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn("is_active", "boolean", (col) => col.defaultTo(true))
    .addColumn("isDeleted", "boolean", (col) => col.defaultTo(false).notNull())
    .execute();

  await db.schema
    .createTable("user_roles")
    .addColumn("role_id", "serial", (col) => col.primaryKey())
    .addColumn("role_name", "varchar(100)", (col) => col.unique().notNull())
    .addColumn("role_description", "text")
    .addColumn("isDeleted", "boolean", (col) => col.defaultTo(false).notNull())
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
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn("isDeleted", "boolean", (col) => col.defaultTo(false).notNull())
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
    .createIndex("idx_apis_endpoint_path_method")
    .on("apis")
    .columns(["endpoint_path", "http_method"])
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
    .createIndex("idx_api_keys_api_id")
    .on("api_keys")
    .column("api_id")
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
    .createIndex("idx_project_dbs_project_id")
    .on("project_dbs")
    .column("project_id")
    .execute();
  await db.schema
    .createIndex("idx_project_dbs_user_id")
    .on("project_dbs")
    .column("user_id")
    .execute();
  await db.schema
    .createIndex("idx_project_dbs_isDeleted")
    .on("project_dbs")
    .column("isDeleted")
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

  // Indexes for soft delete
  await db.schema
    .createIndex("idx_users_isDeleted")
    .on("users")
    .column("isDeleted")
    .execute();
  await db.schema
    .createIndex("idx_projects_isDeleted")
    .on("projects")
    .column("isDeleted")
    .execute();
  await db.schema
    .createIndex("idx_apis_isDeleted")
    .on("apis")
    .column("isDeleted")
    .execute();
  await db.schema
    .createIndex("idx_api_keys_isDeleted")
    .on("api_keys")
    .column("isDeleted")
    .execute();
  await db.schema
    .createIndex("idx_user_roles_isDeleted")
    .on("user_roles")
    .column("isDeleted")
    .execute();
  await db.schema
    .createIndex("idx_project_members_isDeleted")
    .on("project_members")
    .column("isDeleted")
    .execute();

  // Composite unique indexes
  await db.schema
    .createIndex("unique_apis_project_path_method_user")
    .on("apis")
    .columns(["project_id", "endpoint_path", "http_method", "user_id"])
    .unique()
    .execute();
}

export async function down(db: Kysely<Database>): Promise<void> {
  // Drop the unique index
  await db.schema
    .dropIndex("unique_apis_project_path_method_user")
    .on("apis")
    .execute();
  await db.schema
    .dropIndex("idx_project_dbs_isDeleted")
    .on("project_dbs")
    .execute();
  await db.schema
    .dropIndex("idx_project_dbs_user_id")
    .on("project_dbs")
    .execute();
  await db.schema
    .dropIndex("idx_project_dbs_project_id")
    .on("project_dbs")
    .execute();
  // Drop soft delete indexes
  await db.schema
    .dropIndex("idx_project_members_isDeleted")
    .on("project_members")
    .execute();
  await db.schema
    .dropIndex("idx_user_roles_isDeleted")
    .on("user_roles")
    .execute();
  await db.schema.dropIndex("idx_api_keys_isDeleted").on("api_keys").execute();
  await db.schema.dropIndex("idx_apis_isDeleted").on("apis").execute();
  await db.schema.dropIndex("idx_projects_isDeleted").on("projects").execute();
  await db.schema.dropIndex("idx_users_isDeleted").on("users").execute();

  // Drop other indexes
  await db.schema
    .dropIndex("idx_project_members_user_id")
    .on("project_members")
    .execute();
  await db.schema
    .dropIndex("idx_project_members_project_id")
    .on("project_members")
    .execute();
  await db.schema.dropIndex("idx_projects_name").on("projects").execute();
  await db.schema.dropIndex("idx_projects_user_id").on("projects").execute();
  await db.schema.dropIndex("idx_api_keys_api_id").on("api_keys").execute();
  await db.schema.dropIndex("idx_sessions_expires_at").on("sessions").execute();
  await db.schema.dropIndex("idx_sessions_is_valid").on("sessions").execute();
  await db.schema
    .dropIndex("idx_sessions_refresh_token")
    .on("sessions")
    .execute();
  await db.schema.dropIndex("idx_sessions_user_id").on("sessions").execute();
  await db.schema
    .dropIndex("idx_apis_endpoint_path_method")
    .on("apis")
    .execute();
  await db.schema.dropIndex("idx_apis_project_id").on("apis").execute();
  await db.schema.dropIndex("idx_apis_user_id").on("apis").execute();
  await db.schema.dropIndex("idx_users_email").on("users").execute();
  await db.schema.dropIndex("idx_users_username").on("users").execute();

  // Drop tables
  await db.schema.dropTable("project_dbs").execute();
  await db.schema.dropTable("project_members").execute();
  await db.schema.dropTable("user_roles").execute();
  await db.schema.dropTable("api_keys").execute();
  await db.schema.dropTable("apis").execute();
  await db.schema.dropTable("projects_tables").execute();
  await db.schema.dropTable("projects").execute();
  await db.schema.dropTable("sessions").execute();
  await db.schema.dropTable("users").execute();
}
