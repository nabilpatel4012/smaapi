export interface IProjectBody {
  project_name: string;
  project_description?: string | null;
  db_type: "PG" | "MQL" | "MNGDB" | "SQLTE";
  db_instance_type: "SMAAPI_GEN" | "CUSTOM";
  db_creds: object; // Flexible object for credentials
}

export interface IProjectReply {
  project_id: number;
  user_id: number;
  project_name: string;
  project_description?: string | null;
  db_type: string;
  db_instance_type: string;
  subdomain_url: string | null;
  created_at: Date | string;
}

export interface IProjectUpdateBody {
  project_name?: string;
  project_description?: string;
  db_type?: string;
  db_instance_type?: string;
}

export interface IProjectQueryParams {
  page?: number;
  size?: number;
  name?: string;
  select?: string | string[] | undefined;
}

// export interface IProjectReply {
//   project_id: number;
//   user_id: number;
//   project_name: string;
//   project_description?: string | null;
//   db_type: string;
//   created_at: Date | string;
// }

export interface IAPIsBody {
  project_id: number;
  api_name: string;
  api_description?: string;
  method: string;
  endpoint: string;
  endpoint_description?: string;
  parameters?: {
    query?: Parameter[];
    body?: SchemaDefinition;
  };
  allowedFilters?: string[];
  responses: Record<number, SchemaDefinition>;
}

export interface Parameter {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
}

export interface SchemaDefinition {
  required?: string[];
  properties: Record<string, PropertyDefinition>;
}

export interface SchemaDefinition {
  required?: string[];
  properties: Record<string, PropertyDefinition>;
}

export interface PropertyDefinition {
  type: "string" | "number" | "boolean" | "array" | "object";
  minLength?: number;
  maxLength?: number;
  allowedChars?: string; // Regex pattern
  minimum?: number; // For numbers
  maximum?: number; // For numbers
  multipleOf?: number; // Ensure divisibility (e.g., steps of 5)
  enum?: any[]; // Allowed values
  format?: "email" | "uuid" | "date" | "date-time" | "url"; // String format validation
  pattern?: string; // Alternative to allowedChars
  items?: PropertyDefinition; // For array types
  required?: string[]; // Only for object types
  properties?: Record<string, PropertyDefinition>; // Nested object validation
}

export interface IProjectTableReply {
  table_id: number; // Auto-incrementing integer
  project_id: number;
  table_name: string;
  table_schema: any;
  created_at: Date | string;
  isDeleted: boolean;
}

export interface IProjectTableBody {
  table_name: string;
  table_schema: any;
}

export interface IProjectTableUpdateBody {
  table_name?: string;
  table_schema?: any;
}

export interface IProjectTableQueryParams {
  page?: number;
  size?: number;
  name?: string;
  project_id?: number;
}
