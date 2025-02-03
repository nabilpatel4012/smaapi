import { FastifySchema } from "fastify";
import { errorResponses } from "../../common/schemas/error-response.schema";
// import { JSONSchemaType } from "fastify/types/schema";

const userBaseProps = {
  username: { type: "string", maxLength: 100 },
  email: { type: "string", format: "email" },
};

export const createUserSchema: FastifySchema = {
  tags: ["users"],
  body: {
    type: "object",
    required: ["username", "email", "password"], // Make password required
    properties: {
      ...userBaseProps,
      password: { type: "string", minLength: 8 },
    },
  },
  response: {
    201: {
      // Use 201 Created for successful creation
      type: "object",
      properties: {
        user_id: { type: "number" }, // Assuming user_id is returned
        email: { type: "string" },
      },
    },
    ...errorResponses, // Import your error responses
  },
} as const;

export const loginUserSchema: FastifySchema = {
  tags: ["users", "auth"],
  body: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string", minLength: 8 },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        message: { type: "string" }, // Or a token if you're using JWTs
        // Add user info if needed like below
        // user: {
        //   type: 'object',
        //   properties: {
        //     user_id: { type: 'number' },
        //     username: { type: 'string' },
        //     email: { type: 'string' },
        //     // ... other user properties
        //   },
        // },
      },
    },
    ...errorResponses,
  },
} as const;

export const logoutUserSchema: FastifySchema = {
  tags: ["users", "auth"],
  response: {
    200: {
      type: "object",
      properties: {
        message: { type: "string" },
      },
    },
    ...errorResponses,
  },
} as const;

export const getCurrentUserSchema: FastifySchema = {
  tags: ["users"],
  response: {
    200: {
      type: "object",
      properties: {
        user_id: { type: "number" },
        username: { type: "string" },
        email: { type: "string" },
        // ... other user properties you want to expose
      },
    },
    ...errorResponses,
  },
} as const;

/**
 * Schema for creating a user (Request Body)
 */
export const userBodySchema = {
  type: "object",
  required: ["username", "email", "password", "user_type"],
  properties: {
    username: { type: "string", minLength: 3, maxLength: 100 },
    email: { type: "string", format: "email" },
    password: {
      type: "string",
      minLength: 8,
      pattern: "^(?=.*[a-zA-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]+$",
    },
    user_type: {
      type: "string",
      enum: ["individual", "business"],
    },
    company_name: {
      type: "string",
      minLength: 3,
      maxLength: 200,
      nullable: true,
    },
    company_email: { type: "string", format: "email", nullable: true },
    plan_type: {
      type: "string",
      enum: ["SMAAPI_FREE", "SMAAPI_PRO", "SMAAPI_ENTERPRISE"],
      default: "SMAAPI_FREE",
    },
    first_name: {
      type: "string",
      minLength: 1,
      maxLength: 100,
      nullable: true,
    },
    last_name: { type: "string", minLength: 1, maxLength: 100, nullable: true },
    phone_number: {
      type: "string",
      pattern: "^[+]?\\d{7,15}$", // Allows international format
      nullable: true,
    },
    avatar_url: { type: "string", format: "uri", nullable: true },
    bio: { type: "string", maxLength: 500, nullable: true },
  },
  if: {
    properties: { user_type: { const: "business" } },
  },
  then: {
    required: ["company_name", "company_email"],
  },
} as const;

/**
 * Schema for user response (Successful Response)
 */
export const userResponseSchema = {
  type: "object",
  properties: {
    user_id: { type: "number", description: "User ID" },
    username: { type: "string" },
    email: { type: "string", format: "email" },
    user_type: { type: "string", enum: ["individual", "business"] },
    company_name: { type: "string", nullable: true },
    company_email: { type: "string", format: "email", nullable: true },
    plan_type: {
      type: "string",
      enum: ["SMAAPI_FREE", "SMAAPI_PRO", "SMAAPI_ENTERPRISE"],
    },
    plan_expires_at: { type: "string", format: "date-time", nullable: true },
    first_name: { type: "string", nullable: true },
    last_name: { type: "string", nullable: true },
    phone_number: { type: "string", nullable: true },
    avatar_url: { type: "string", format: "uri", nullable: true },
    bio: { type: "string", nullable: true },
    is_verified: { type: "boolean" },
    is_active: { type: "boolean" },
    created_at: { type: "string", format: "date-time" },
    last_login_at: { type: "string", format: "date-time", nullable: true },
  },
} as const;

/**
 * Generic Error Response Schema
 */
export const errorResponseSchema = {
  type: "object",
  properties: {
    statusCode: { type: "number" },
    message: { type: "string" },
    error: { type: "string" },
    cause: { type: "string" },
  },
} as const;

export const userUpdateSchema = {
  type: "object",
  properties: {
    username: { type: "string", minLength: 3, maxLength: 100 },
    email: { type: "string", format: "email" },
    password: { type: "string", minLength: 8 },
  },
} as const;

export const successResponseSchema = {
  type: "object",
  properties: {
    message: { type: "string" },
  },
} as const;
