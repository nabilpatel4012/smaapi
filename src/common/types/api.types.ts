// Add these to your core.types.ts file

export interface IApiBody {
  project_id: number;
  api_name: string;
  api_description?: string | null;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  endpoint: string;
  endpoint_description?: string | null;
  parameters?: {
    query?: Array<{
      name: string;
      type: "string" | "number" | "boolean";
    }>;
    body?: {
      required: string[];
      properties: Record<string, any>;
    };
  } | null;
  allowedFilters?: string[] | null;
  responses: Record<
    string,
    {
      description: string;
      properties: Record<string, any>;
    }
  >;
}

export interface IApiUpdateBody {
  project_id?: number;
  api_name?: string;
  api_description?: string | null;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  endpoint?: string;
  endpoint_description?: string | null;
  parameters?: {
    query?: Array<{
      name: string;
      type: "string" | "number" | "boolean";
    }>;
    body?: {
      required: string[];
      properties: Record<string, any>;
    };
  } | null;
  allowedFilters?: string[] | null;
  responses?: Record<
    string,
    {
      description: string;
      properties: Record<string, any>;
    }
  >;
}

export interface IApiReply {
  api_id: number;
  project_id: number;
  user_id: number;
  api_name: string;
  api_description: string | null;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  endpoint: string;
  endpoint_description: string | null;
  parameters: {
    query?: Array<{
      name: string;
      type: "string" | "number" | "boolean";
    }>;
    body?: {
      required: string[];
      properties: Record<string, any>;
    };
  } | null;
  allowedFilters: string[] | null;
  responses: Record<
    string,
    {
      description: string;
      properties: Record<string, any>;
    }
  >;
  created_at: string;
}

export interface IApiQueryParams {
  page?: number;
  size?: number;
  project_id: number;
  name?: string;
}
