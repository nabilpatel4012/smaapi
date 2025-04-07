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
  api_versions: ApiVersionsTable;
  middleware: MiddlewareTable;
  api_middleware: ApiMiddlewareTable;
  api_endpoints: ApiEndpointsTable;
  api_keys: ApiKeysTable;
  user_roles: UserRolesTable;
  projects: ProjectsTable;
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
  plan_expires_at: ColumnType<Date | null, string | undefined, never>;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: ColumnType<Date, string | undefined, never>;
  last_login_at: ColumnType<Date | null, string | undefined, never>;
  is_verified: boolean;
  is_active: boolean;
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
  login_time: ColumnType<Date, string | undefined, never>;
  expires_at: ColumnType<Date, string | undefined, never>;
}

export type Session = Selectable<SessionsTable>;
export type NewSession = Insertable<SessionsTable>;
export type SessionUpdate = Updateable<SessionsTable>;

export interface UserRolesTable {
  role_id: Generated<number>;
  role_name: string;
  role_description: string | null;
}

export type UserRole = Selectable<UserRolesTable>;
export type NewUserRole = Insertable<UserRolesTable>;
export type UserRoleUpdate = Updateable<UserRolesTable>;

export interface ProjectsTable {
  project_id: Generated<number>;
  user_id: number;
  project_name: string;
  project_description: string | null;
  tags: ColumnType<object | null, object | undefined, never>; // JSON array of tags
  created_at: ColumnType<Date, string | undefined, never>;
}

export type Project = Selectable<ProjectsTable>;
export type NewProject = Insertable<ProjectsTable>;
export type ProjectUpdate = Updateable<ProjectsTable>;

export interface ProjectMembersTable {
  project_member_id: Generated<number>;
  project_id: number;
  user_id: number;
  role_id: number | null; // Can be null if role is removed
  added_at: ColumnType<Date, string | undefined, never>;
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
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date | null, string | undefined, never>;
  api_status: "draft" | "active" | "inactive" | "suspended";
}

export type Api = Selectable<ApisTable>;
export type NewApi = Insertable<ApisTable>;
export type ApiUpdate = Updateable<ApisTable>;

export interface ApiVersionsTable {
  version_id: Generated<number>;
  api_id: number;
  version_number: string;
  created_at: ColumnType<Date, string | undefined, never>;
  is_current: boolean;
}

export type ApiVersion = Selectable<ApiVersionsTable>;
export type NewApiVersion = Insertable<ApiVersionsTable>;
export type ApiVersionUpdate = Updateable<ApiVersionsTable>;

export interface MiddlewareTable {
  middleware_id: Generated<number>;
  middleware_name: string;
  middleware_description: string | null;
  configuration_schema: ColumnType<object | null, object | undefined, never>; // JSON Schema
}

export type Middleware = Selectable<MiddlewareTable>;
export type NewMiddleware = Insertable<MiddlewareTable>;
export type MiddlewareUpdate = Updateable<MiddlewareTable>;

export interface ApiMiddlewareTable {
  api_middleware_id: Generated<number>;
  version_id: number;
  middleware_id: number;
  middleware_order: number | null;
  middleware_config: ColumnType<object | null, object | undefined, never>; // Instance config
}

export type ApiMiddleware = Selectable<ApiMiddlewareTable>;
export type NewApiMiddleware = Insertable<ApiMiddlewareTable>;
export type ApiMiddlewareUpdate = Updateable<ApiMiddlewareTable>;

export interface ApiEndpointsTable {
  endpoint_id: Generated<number>;
  endpoint_path: string;
  http_method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD";
  endpoint_description: string;
  created_at: ColumnType<Date, string | undefined, never>;
}

export type ApiEndpoint = Selectable<ApiEndpointsTable>;
export type NewApiEndpoint = Insertable<ApiEndpointsTable>;
export type ApiEndpointUpdate = Updateable<ApiEndpointsTable>;

export interface ApiKeysTable {
  api_key_id: Generated<number>;
  api_id: number;
  api_key: string;
  created_at: ColumnType<Date, string | undefined, never>;
  is_active: boolean;
}

export type ApiKey = Selectable<ApiKeysTable>;
export type NewApiKey = Insertable<ApiKeysTable>;
export type ApiKeyUpdate = Updateable<ApiKeysTable>;
