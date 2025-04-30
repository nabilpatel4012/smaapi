import { nullable, optional } from "zod";

export const projectTableBodySchema = {
  type: "object",
  required: ["table_name", "table_schema"],
  properties: {
    table_name: { type: "string", minLength: 3, maxLength: 100 },
    table_schema: {
      type: "object",
      additionalProperties: true,
    },
  },
} as const;

export const projectTableUpdateSchema = {
  type: "object",
  properties: {
    table_name: { type: "string", minLength: 3, maxLength: 100 },
    table_schema: {
      type: "object",
      additionalProperties: true,
    },
  },
} as const;

export const projectTableQuerySchema = {
  type: "object",
  properties: {
    page: { type: "number" },
    size: { type: "number" },
    name: {
      type: "string",
    },
    project_id: { type: "number", nullable: true },
  },
} as const;

export const projectTablesResponseSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      table_id: { type: "number", description: "Table Id" },
      table_name: { type: "string" },
      project_id: { type: "number" },
      table_schema: {
        type: "object",
        additionalProperties: true,
      },
      created_at: { type: "string", format: "date-time" },
    },
  },
} as const;

export const projectTableResponseSchema = {
  type: "object",
  properties: {
    table_id: { type: "number", description: "Table Id" },
    table_name: { type: "string" },
    project_id: { type: "number" },
    table_schema: {
      type: "object",
      additionalProperties: true,
    },
    created_at: { type: "string", format: "date-time" },
  },
} as const;
