export const apiRequestBodySchema = {
  type: "object",
  properties: {
    project_id: { type: "number", description: "Project ID" },
    api_name: { type: "string", description: "API Name" },
    api_description: {
      type: "string",
      nullable: true,
      description: "API Description",
    },
    http_method: {
      type: "string",
      enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      description: "HTTP Method",
    },
    endpoint_path: { type: "string", description: "API Endpoint Path" },
    endpoint_description: {
      type: "string",
      nullable: true,
      description: "Endpoint Description",
    },
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Query Parameter Name" },
              type: {
                type: "string",
                enum: ["string", "number", "boolean"],
                description: "Query Parameter Type",
              },
            },
            required: ["name", "type"],
          },
          nullable: true,
          description: "Query Parameters",
        },
        body: {
          type: "object",
          properties: {
            required: {
              type: "array",
              items: { type: "string" },
              description: "Required Fields",
            },
            properties: {
              type: "object",
              description: "Body Schema Properties",
            },
          },
          nullable: true,
          description: "Request Body Schema",
        },
      },
      nullable: true,
      description: "Request Parameters",
    },
    allowedFilters: {
      type: "array",
      items: { type: "string" },
      nullable: true,
      description: "Allowed Filters for Querying",
    },
    responses: {
      type: "object",
      additionalProperties: {
        type: "object",
        properties: {
          description: { type: "string", description: "Response Description" },
          properties: {
            type: "object",
            description: "Response Data Structure",
          },
        },
      },
      description: "Possible API Responses with Dynamic Status Codes",
    },
  },
  required: ["project_id", "api_name", "http_method", "endpoint_path"],
} as const;

export const apiUpdateSchema = {
  type: "object",
  properties: {
    project_id: { type: "number", description: "Project ID" },
    api_name: { type: "string", description: "API Name" },
    api_description: {
      type: "string",
      nullable: true,
      description: "API Description",
    },
    http_method: {
      type: "string",
      enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      description: "HTTP Method",
    },
    endpoint_path: { type: "string", description: "API Endpoint Path" },
    endpoint_description: {
      type: "string",
      nullable: true,
      description: "Endpoint Description",
    },
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Query Parameter Name" },
              type: {
                type: "string",
                enum: ["string", "number", "boolean"],
                description: "Query Parameter Type",
              },
            },
            required: ["name", "type"],
          },
          nullable: true,
          description: "Query Parameters",
        },
        body: {
          type: "object",
          properties: {
            required: {
              type: "array",
              items: { type: "string" },
              description: "Required Fields",
            },
            properties: {
              type: "object",
              description: "Body Schema Properties",
            },
          },
          nullable: true,
          description: "Request Body Schema",
        },
      },
      nullable: true,
      description: "Request Parameters",
    },
    allowedFilters: {
      type: "array",
      items: { type: "string" },
      nullable: true,
      description: "Allowed Filters for Querying",
    },
    responses: {
      type: "object",
      additionalProperties: {
        type: "object",
        properties: {
          description: { type: "string", description: "Response Description" },
          properties: {
            type: "object",
            description: "Response Data Structure",
          },
        },
      },
      description: "Possible API Responses with Dynamic Status Codes",
    },
  },
} as const;

export const apiQuerySchema = {
  type: "object",
  properties: {
    page: { type: "number" },
    size: { type: "number" },
    project_id: { type: "number", description: "Project ID to filter APIs" },
    name: { type: "string", description: "Filter APIs by name" },
  },
  required: ["project_id"],
} as const;

export const apisResponseSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      api_id: { type: "number", description: "API ID" },
      project_id: { type: "number", description: "Project ID" },
      user_id: { type: "number", description: "User ID" },
      api_name: { type: "string", description: "API Name" },
      api_description: {
        type: ["string", "null"],
        description: "API Description (optional)",
      },
      http_method: {
        type: "string",
        enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        description: "HTTP Method",
      },
      endpoint_path: { type: "string", description: "API Endpoint Path" },
      endpoint_description: {
        type: ["string", "null"],
        description: "Endpoint Description (optional)",
      },
      parameters: {
        type: ["object", "null"],
        description: "Request Parameters Schema",
      },
      allowedFilters: {
        type: ["array", "null"],
        items: { type: "string" },
        description: "Allowed Filters for Querying",
      },
      responses: {
        type: "object",
        description: "API Response Schemas",
      },
      created_at: { type: "string", format: "date-time" },
    },
  },
} as const;

export const apiResponseSchema = {
  type: "object",
  properties: {
    api_id: { type: "number", description: "API ID" },
    project_id: { type: "number", description: "Project ID" },
    user_id: { type: "number", description: "User ID" },
    api_name: { type: "string", description: "API Name" },
    api_description: {
      type: ["string", "null"],
      description: "API Description (optional)",
    },
    http_method: {
      type: "string",
      enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      description: "HTTP Method",
    },
    endpoint_path: { type: "string", description: "API Endpoint Path" },
    endpoint_description: {
      type: ["string", "null"],
      description: "Endpoint Description (optional)",
    },
    parameters: {
      type: ["object", "null"],
      description: "Request Parameters Schema",
    },
    allowedFilters: {
      type: ["array", "null"],
      items: { type: "string" },
      description: "Allowed Filters for Querying",
    },
    responses: {
      type: "object",
      description: "API Response Schemas",
    },
    created_at: { type: "string", format: "date-time" },
  },
} as const;
