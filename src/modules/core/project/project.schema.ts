// export const userProjectBodySchema = {
//   type: "object",
//   required: ["project_name", "project_description", "db_type"],
//   properties: {
//     project_name: { type: "string", minLength: 3, maxLength: 100 },
//     project_description: { type: "string", maxLength: 500, nullable: true },
//     db_type: {
//       type: "string",
//       enum: ["PG", "MQL", "MNGDB", "SQLTE"],
//       default: "PG",
//     },
//   },
// } as const;

export const userProjectUpdateSchema = {
  type: "object",
  properties: {
    project_name: { type: "string", minLength: 3, maxLength: 100 },
    project_description: { type: "string", maxLength: 500, nullable: true },
    db_type: {
      type: "string",
      enum: ["PG", "MQL", "MNGDB", "SQLTE"],
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
    select: {
      anyOf: [
        { type: "string", nullable: true },
        {
          type: "array",
          items: { type: "string" },
          nullable: true,
        },
      ],
    },
  },
} as const;

export const projectDBCredsQuerySchema = {
  type: "object",
  properties: {
    password: { type: "string" },
    project_id: { type: "number", description: "Project ID to filter APIs" },
  },
  required: ["project_id", "password"],
} as const;

// export const userProjectsResponseSchema = {
//   type: "array",
//   items: {
//     type: "object",
//     properties: {
//       project_id: { type: "number", description: "Project Id" },
//       user_id: { type: "number", description: "User Id" },
//       project_name: { type: "string" },
//       project_description: {
//         type: ["string", "null"],
//         description: "Project description (optional)",
//       },
//       db_type: {
//         type: "string",
//       },
//       created_at: { type: "string", format: "date-time" },
//     },
//   },
// } as const;

// export const userProjectResponseSchema = {
//   type: "object",
//   properties: {
//     project_id: { type: "number", description: "Project Id" },
//     user_id: { type: "number", description: "User Id" },
//     project_name: { type: "string" },
//     project_description: {
//       type: ["string", "null"],
//       description: "Project description (optional)",
//     },
//     db_type: {
//       type: "string",
//     },
//     created_at: { type: "string", format: "date-time" },
//   },
// } as const;

// project.schema.ts
export const userProjectBodySchema = {
  type: "object",
  required: ["project_name", "project_description", "db_type", "db_creds"],
  properties: {
    project_name: { type: "string", minLength: 3, maxLength: 100 },
    project_description: { type: "string", maxLength: 500, nullable: true },
    db_type: {
      type: "string",
      enum: ["PG", "MQL", "MNGDB", "SQLTE"],
      default: "PG",
    },
    db_creds: {
      type: "object",
      additionalProperties: true, // Allow any key-value pairs
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
    db_type: {
      type: "string",
    },
    subdomain_url: {
      type: ["string", "null"],
      description: "Subdomain URL for the project",
    },
    created_at: { type: "string", format: "date-time" },
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
      db_type: {
        type: "string",
      },
      subdomain_url: {
        type: ["string", "null"],
        description: "Subdomain URL for the project",
      },
      created_at: { type: "string", format: "date-time" },
    },
  },
} as const;

// userProjectUpdateSchema and userProjectQuerySchema remain unchanged
