import { FastifySchema } from "fastify";

export const errorResponses: Record<number, FastifySchema["response"]> = {
  400: {
    type: "object",
    properties: {
      statusCode: { type: "number", const: 400 },
      error: { type: "string", const: "Bad Request" },
      message: { type: "string" },
    },
  },
  401: {
    type: "object",
    properties: {
      statusCode: { type: "number", const: 401 },
      error: { type: "string", const: "Unauthorized" },
      message: { type: "string" },
    },
  },
  403: {
    type: "object",
    properties: {
      statusCode: { type: "number", const: 403 },
      error: { type: "string", const: "Forbidden" },
      message: { type: "string" },
    },
  },
  404: {
    type: "object",
    properties: {
      statusCode: { type: "number", const: 404 },
      error: { type: "string", const: "Not Found" },
      message: { type: "string" },
    },
  },
  409: {
    type: "object",
    properties: {
      statusCode: { type: "number", const: 409 },
      error: { type: "string", const: "Conflict" },
      message: { type: "string" },
    },
  },
  // 500: {
  //   type: "object",
  //   properties: {
  //     statusCode: { type: "number", const: 500 },
  //     error: { type: "string", const: "Internal Server Error" },
  //     message: { type: "string" },
  //   },
  // },
};
