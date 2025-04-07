export const userProjectBodySchema = {
  type: "object",
  required: ["project_name", "project_description"],
  properties: {
    project_name: { type: "string", minLength: 3, maxLength: 100 },
    project_description: { type: "string", maxLength: 500, nullable: true },
    tags: {
      type: "object",
      nullable: true,
    },
  },
} as const;

export const userProjectUpdateSchema = {
  type: "object",
  properties: {
    project_name: { type: "string", minLength: 3, maxLength: 100 },
    project_description: { type: "string", maxLength: 500, nullable: true },
    tags: {
      type: "object",
      nullable: true,
    },
  },
} as const;

export const userProjectQuerySchema = {
  type: "object",
  properties: {
    page: { type: "number" },
    size: { type: "number" },
    name: {
      type: "string",
    },
  },
} as const;

export const userProjectsResponseSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      project_id: { type: "number", description: "Project Id" },
      user_id: { type: "number", description: "User Id" },
      project_name: { type: "string" },
      project_description: {
        type: ["string", "null"],
        description: "Project description (optional)",
      },
      tags: {
        type: ["object", "null"],
        additionalProperties: { type: "string" },
        description: "An object containing tag key-value pairs",
      },
      created_at: { type: "string", format: "date-time" },
    },
  },
} as const;

export const userProjectResponseSchema = {
  type: "object",
  properties: {
    project_id: { type: "number", description: "Project Id" },
    user_id: { type: "number", description: "User Id" },
    project_name: { type: "string" },
    project_description: {
      type: ["string", "null"],
      description: "Project description (optional)",
    },
    tags: {
      type: ["object", "null"],
      additionalProperties: { type: "string" },
      description: "An object containing tag key-value pairs",
    },
    created_at: { type: "string", format: "date-time" },
  },
} as const;
