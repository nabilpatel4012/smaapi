import {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from "kysely";

export interface Database {
  users: UsersTable;
  sessions: SessionsTable;
  apis: ApisTable;
  api_keys: ApiKeysTable;
  user_roles: UserRolesTable;
  projects: ProjectsTable;
  projects_tables: ProjectsTablesTable;
  project_dbs: ProjectDbsTable;
  project_members: ProjectMembersTable;
}

export interface UsersTable {
  user_id: Generated<number>;
  username: string;
  email: string;
  password_hash: string;
  user_type: "individual" | "business";
  company_name: string | null;
  company_email: string | null;
  plan_type: "SMAAPI_FREE" | "SMAAPI_PRO" | "SMAAPI_ENTERPRISE";
  plan_expires_at: ColumnType<Date | null, Date | string | undefined, never>;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: ColumnType<Date, Date | string | undefined, never>;
  last_login_at: ColumnType<Date | null, Date | string | undefined, never>;
  is_verified: boolean;
  is_active: boolean;
  isDeleted: boolean;
}

export type User = Selectable<UsersTable>;
export type NewUser = Insertable<UsersTable>;
export type UserUpdate = Updateable<UsersTable>;

export interface SessionsTable {
  session_id: Generated<number>;
  user_id: number;
  refresh_token: string;
  ip_address: string;
  is_valid: boolean;
  user_agent: string | null;
  login_time: ColumnType<Date, Date | string | undefined, never>;
  expires_at: ColumnType<Date, Date | string | undefined, never>;
}

export type Session = Selectable<SessionsTable>;
export type NewSession = Insertable<SessionsTable>;
export type SessionUpdate = Updateable<SessionsTable>;

export interface UserRolesTable {
  role_id: Generated<number>;
  role_name: string;
  role_description: string | null;
  isDeleted: boolean;
}

export type UserRole = Selectable<UserRolesTable>;
export type NewUserRole = Insertable<UserRolesTable>;
export type UserRoleUpdate = Updateable<UserRolesTable>;

export interface ProjectsTable {
  project_id: Generated<number>;
  user_id: number;
  project_name: string;
  project_description: string | null;
  db_type: string;
  db_instance_type: "SMAAPI_GEN" | "CUSTOM";
  subdomain_url: string | null;
  created_at: ColumnType<Date, Date | string | undefined, never>;
  isDeleted: boolean;
}

export type Project = Selectable<ProjectsTable>;
export type NewProject = Insertable<ProjectsTable>;
export type ProjectUpdate = Updateable<ProjectsTable>;

export interface ProjectsTablesTable {
  table_id: Generated<number>;
  project_id: number;
  table_name: string;
  table_schema: string;
  created_at: ColumnType<Date, Date | string | undefined, never>;
  isDeleted: boolean;
}

export type SelectProjectsTables = Selectable<ProjectsTablesTable>;
export type NewProjectsTable = Insertable<ProjectsTablesTable>;
export type ProjectsTableUpdate = Updateable<ProjectsTablesTable>;

export interface ProjectDbsTable {
  project_db_id: Generated<number>;
  project_id: number;
  user_id: number;
  db_creds: string; // Encrypted database credentials
  created_at: ColumnType<Date, Date | string | undefined, never>;
  isDeleted: boolean;
}

export type ProjectDb = Selectable<ProjectDbsTable>;
export type NewProjectDb = Insertable<ProjectDbsTable>;
export type ProjectDbUpdate = Updateable<ProjectDbsTable>;

export interface ProjectMembersTable {
  project_member_id: Generated<number>;
  project_id: number;
  user_id: number;
  role_id: number | null;
  added_at: ColumnType<Date, Date | string | undefined, never>;
  isDeleted: boolean;
}

export type ProjectMember = Selectable<ProjectMembersTable>;
export type NewProjectMember = Insertable<ProjectMembersTable>;
export type ProjectMemberUpdate = Updateable<ProjectMembersTable>;

export interface ApisTable {
  api_id: Generated<number>;
  user_id: number;
  project_id: number;
  api_name: string;
  api_description: string | null;
  endpoint_path: string;
  http_method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD";
  endpoint_description: string | null;
  version_number: number;
  api_status: "draft" | "active" | "inactive" | "suspended";
  created_at: ColumnType<Date, Date | string | undefined, never>;
  isDeleted: boolean;
}

export type Api = Selectable<ApisTable>;
export type NewApi = Insertable<ApisTable>;
export type ApiUpdate = Updateable<ApisTable>;

export interface ApiKeysTable {
  api_key_id: Generated<number>;
  api_id: number;
  api_key: string;
  created_at: ColumnType<Date, Date | string | undefined, never>;
  is_active: boolean;
  isDeleted: boolean;
}

export type ApiKey = Selectable<ApiKeysTable>;
export type NewApiKey = Insertable<ApiKeysTable>;
export type ApiKeyUpdate = Updateable<ApiKeysTable>;
