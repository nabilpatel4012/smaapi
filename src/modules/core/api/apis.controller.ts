import { FastifyPluginCallback } from "fastify";
import { httpError } from "../../../utils/http";
import { StatusCodes } from "http-status-codes";
import {
  createApi,
  deleteApi,
  getApiById,
  getApis,
  getAPIStats,
  updateApi,
} from "./apis.service";
import {
  IApiBody,
  IApiQueryParams,
  IApiReply,
  IApiUpdateBody,
} from "../../../common/types/api.types";
import {
  apiRequestBodySchema,
  apiResponseSchema,
  apisResponseSchema,
  apiUpdateSchema,
  apiQuerySchema,
} from "./apis.schema";
import { errorResponseSchema } from "../../user/user.schema";
import { auth } from "../../../common/helpers/authenticate";
import { IErrorReply, IIdParams } from "../../../common/types/generic.types";
import { QueryError } from "mysql2";
import { logger } from "../../../utils/logger";

export const apiController: FastifyPluginCallback = (server, _, done) => {
  server.post<{ Body: IApiBody; Reply: IApiReply }>(
    "/",
    {
      ...auth(server),
      schema: {
        tags: ["APIs", "Core"],
        summary: "Create a new API",
        description: "This endpoint creates a new API for a specific project.",
        body: apiRequestBodySchema,
        response: {
          201: apiResponseSchema,
          400: errorResponseSchema,
          409: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      try {
        const response = await createApi(req.body, req.user.user_id);
        return reply.code(StatusCodes.CREATED).send(response);
      } catch (e) {
        if (e instanceof Error && !e.hasOwnProperty("code")) {
          return httpError({
            code: StatusCodes.BAD_REQUEST,
            message: e.message,
            cause: "Invalid API data provided",
            reply,
          });
        }
        const error = e as QueryError;
        if (error.errno === 1062) {
          return httpError({
            code: StatusCodes.CONFLICT,
            message:
              "API with this name and endpoint already exists for this project",
            cause:
              "API name and endpoint combination must be unique within a project",
            reply,
          });
        }

        logger.error({ error }, "createApi: Error creating API");

        return httpError({
          code: StatusCodes.INTERNAL_SERVER_ERROR,
          message: "Internal Server Error",
          reply,
        });
      }
    }
  );

  server.get<{
    Querystring: IApiQueryParams;
    Reply: IApiReply[] | IErrorReply;
  }>(
    "/",
    {
      ...auth(server),
      schema: {
        tags: ["APIs", "Core"],
        summary: "Get list of APIs",
        description:
          "This endpoint returns a list of APIs for a specific project, with support for pagination and filtering.",
        querystring: apiQuerySchema,
        response: {
          // 200: apisResponseSchema,
          400: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      try {
        const { page = 1, size = 10, project_id, name } = req.query;
        const pageNumber = Number(page);
        const sizeNumber = Number(size);
        const projectIdNumber = Number(project_id);

        if (
          isNaN(pageNumber) ||
          isNaN(sizeNumber) ||
          pageNumber < 1 ||
          sizeNumber < 1 ||
          isNaN(projectIdNumber) ||
          projectIdNumber < 1
        ) {
          return httpError({
            code: StatusCodes.BAD_REQUEST,
            message: "Invalid query parameters",
            cause: "Page, size, and project_id must be positive numbers",
            reply,
          });
        }

        const offset = (pageNumber - 1) * sizeNumber;
        const response = await getApis(
          offset,
          sizeNumber,
          projectIdNumber,
          req.user.user_id,
          name
        );

        return reply.code(StatusCodes.OK).send(response);
      } catch (e) {
        logger.error({ error: e }, "getApis: Error fetching APIs");

        return httpError({
          code: StatusCodes.INTERNAL_SERVER_ERROR,
          message: "Internal Server Error",
          reply,
        });
      }
    }
  );

  server.get<{ Params: IIdParams; Reply: IApiReply }>(
    "/:id",
    {
      ...auth(server),
      schema: {
        tags: ["APIs", "Core"],
        summary: "Get an API by ID",
        description:
          "This endpoint returns an API by its ID for the authenticated user.",
        response: {
          200: apiResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params;
      try {
        if (!id || isNaN(Number(id))) {
          return httpError({
            reply,
            message: "Invalid API ID",
            code: StatusCodes.BAD_REQUEST,
          });
        }

        try {
          const result = await getApiById(Number(id), req.user.user_id);
          return reply.code(StatusCodes.OK).send(result);
        } catch (error) {
          // Check if it's a "not found" error message
          if (error instanceof Error && error.message.includes("not found")) {
            return httpError({
              reply,
              message: "API not found",
              code: StatusCodes.NOT_FOUND,
            });
          }
          throw error; // Re-throw for other errors
        }
      } catch (e) {
        logger.error({ error: e }, "getApiById: Error fetching API");
        return httpError({
          reply,
          message: "Error fetching API",
          code: StatusCodes.INTERNAL_SERVER_ERROR,
          cause: e instanceof Error ? e.message : "Unknown error",
        });
      }
    }
  );

  server.patch<{
    Params: IIdParams;
    Body: IApiUpdateBody;
    Reply: IApiReply | IErrorReply;
  }>(
    "/:id",
    {
      ...auth(server),
      schema: {
        tags: ["APIs", "Core"],
        summary: "Update an API",
        description: "This endpoint updates an existing API.",
        body: apiUpdateSchema,
        params: {
          type: "object",
          properties: {
            id: { type: "string", description: "API ID" },
          },
          required: ["id"],
        },
        response: {
          200: apiResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params;
      const updateData = req.body;

      try {
        if (!id || isNaN(Number(id))) {
          return httpError({
            reply,
            message: "Invalid API ID",
            code: StatusCodes.BAD_REQUEST,
          });
        }

        const updatedApi = await updateApi(
          Number(id),
          updateData,
          req.user.user_id
        );

        if (!updatedApi) {
          return httpError({
            reply,
            message: "API not found",
            code: StatusCodes.NOT_FOUND,
          });
        }

        return reply.code(StatusCodes.OK).send(updatedApi);
      } catch (e) {
        // Handle validation errors
        if (e instanceof Error && !e.hasOwnProperty("code")) {
          return httpError({
            code: StatusCodes.BAD_REQUEST,
            message: e.message,
            cause: "Invalid API data provided",
            reply,
          });
        }

        const error = e as QueryError;
        logger.error({ error }, "updateApi: Error updating API");

        if (error.errno === 1452) {
          return httpError({
            code: StatusCodes.CONFLICT,
            message:
              "API with this name and endpoint already exists for this project",
            cause:
              "API name and endpoint combination must be unique within a project",
            reply,
          });
        }

        return httpError({
          reply,
          message: "Error updating API",
          code: StatusCodes.INTERNAL_SERVER_ERROR,
          cause: error.message,
        });
      }
    }
  );

  server.delete<{ Params: IIdParams; Reply: IApiReply | IErrorReply }>(
    "/:id",
    {
      ...auth(server),
      schema: {
        tags: ["APIs", "Core"],
        summary: "Delete an API",
        description: "This endpoint soft-deletes an existing API.",
        params: {
          type: "object",
          properties: {
            id: { type: "string", description: "API ID" },
          },
          required: ["id"],
        },
        response: {
          200: apiResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params;

      try {
        if (!id || isNaN(Number(id))) {
          return httpError({
            reply,
            message: "Invalid API ID",
            code: StatusCodes.BAD_REQUEST,
          });
        }

        const deletedApi = await deleteApi(Number(id), req.user.user_id);

        if (!deletedApi) {
          return httpError({
            reply,
            message: "API not found",
            code: StatusCodes.NOT_FOUND,
          });
        }

        return reply.code(StatusCodes.OK).send(deletedApi);
      } catch (e) {
        const error = e as QueryError;
        logger.error({ error }, "deleteApi: Error deleting API");

        return httpError({
          reply,
          message: "Error deleting API",
          code: StatusCodes.INTERNAL_SERVER_ERROR,
          cause: error.message,
        });
      }
    }
  );

  server.get<{ Reply: any }>(
    "/stats",
    {
      ...auth(server),
      schema: {
        tags: ["APIs", "Core"],
        summary: "Get all API stats (API count, API status counts)",
        description:
          "This endpoint returns an API stats for the authenticated user.",
        response: {
          400: errorResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      try {
        const result = await getAPIStats(req.user.user_id);
        return reply
          .code(StatusCodes.OK)
          .send(...result, (result._id = req.user.user_id));
      } catch (e) {
        logger.error({ error: e }, "getApiStats: Error fetching API stats");
        return httpError({
          reply,
          message: "Error fetching API stats",
          code: StatusCodes.INTERNAL_SERVER_ERROR,
          cause: e instanceof Error ? e.message : "Unknown error",
        });
      }
    }
  );

  done();
};
