export interface IApiBody {
  project_id: number;
  api_name: string;
  api_description?: string | null;
  http_method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD";
  endpoint_path: string;
  endpoint_description?: string | null;
  middleware_config?: Record<string, any> | null;
  parameters?: {
    query?: Array<{
      name: string;
      type: "string" | "number" | "boolean";
    }> | null;
    body?: {
      required?: string[];
      properties?: Record<string, any>;
    } | null;
  } | null;
  allowedFilters?: string[] | null;
  responses?: Record<
    string,
    {
      description: string;
      properties?: Record<string, any>;
    }
  > | null;
}

export interface IApiUpdateBody {
  project_id?: number;
  api_name?: string;
  api_description?: string | null;
  http_method?:
    | "GET"
    | "POST"
    | "PUT"
    | "DELETE"
    | "PATCH"
    | "OPTIONS"
    | "HEAD";
  endpoint_path?: string;
  endpoint_description?: string | null;
  middleware_config?: Record<string, any> | null;
  parameters?: {
    query?: Array<{
      name: string;
      type: "string" | "number" | "boolean";
    }> | null;
    body?: {
      required?: string[];
      properties?: Record<string, any>;
    } | null;
  } | null;
  allowedFilters?: string[] | null;
  responses?: Record<
    string,
    {
      description: string;
      properties?: Record<string, any>;
    }
  > | null;
  api_status?: "draft" | "active" | "inactive" | "suspended";
}

export interface IApiReply {
  api_id: number;
  user_id: number;
  project_id: number;
  api_name: string;
  api_description: string | null;
  http_method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD";
  endpoint_path: string;
  endpoint_description: string | null;
  version_number: number;
  api_status: "draft" | "active" | "inactive" | "suspended";
  created_at: string;
  parameters?: any;
  allowedFilters?: string[] | null;
  middleware_config?: Record<string, any> | null;
  responses?: any;
}

export interface IApiQueryParams {
  page?: number;
  size?: number;
  project_id: number;
  name?: string;
}
