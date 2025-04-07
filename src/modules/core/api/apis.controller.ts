import { FastifyPluginCallback } from "fastify";
import { PostgresError } from "postgres";
import { httpError } from "../../../utils/http";
import { StatusCodes } from "http-status-codes";
import {
  createApi,
  deleteApi,
  getApiById,
  getApis,
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
        tags: ["Core"],
        summary: "Create a new API",
        description: "This endpoint creates a new API for a specific project.",
        body: apiRequestBodySchema,
        response: {
          201: apiResponseSchema,
          400: errorResponseSchema,
          409: errorResponseSchema, // Duplicate entry
          500: errorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      try {
        const {
          project_id,
          api_name,
          api_description,
          method,
          endpoint,
          endpoint_description,
          parameters,
          allowedFilters,
          responses,
        } = req.body;

        const response = await createApi(
          {
            project_id,
            api_name,
            api_description,
            method,
            endpoint,
            endpoint_description,
            parameters,
            allowedFilters,
            responses,
          },
          req.user.user_id
        ); // Corrected call

        return reply.code(StatusCodes.CREATED).send(response);
      } catch (e) {
        const error = e as PostgresError;
        if (error.code === "23505") {
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
        tags: ["Core"],
        summary: "Get list of APIs",
        description:
          "This endpoint returns a list of APIs for a specific project, with support for pagination and filtering.",
        querystring: apiQuerySchema,
        response: {
          200: apisResponseSchema,
          400: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      try {
        const { page, size, project_id, name } = req.query;
        const pageNumber = Number(page);
        const sizeNumber = Number(size);
        const projectIdNumber = Number(project_id);

        if (
          (page && isNaN(pageNumber)) ||
          (size && isNaN(sizeNumber)) ||
          pageNumber < 1 ||
          sizeNumber < 1 ||
          isNaN(projectIdNumber) ||
          projectIdNumber < 1
        ) {
          return reply.code(400).send({ message: "Invalid query parameters." });
        }

        const response = await getApis(
          (pageNumber - 1) * sizeNumber,
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
        tags: ["Core"],
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

        const result = await getApiById(Number(id), req.user.user_id);
        if (!result) {
          return httpError({
            reply,
            message: "API not found",
            code: StatusCodes.NOT_FOUND,
          });
        }

        return reply.code(StatusCodes.OK).send(result);
      } catch (e) {
        const error = e as QueryError;
        logger.error({ error }, "getApiById: Error fetching API");

        return httpError({
          reply,
          message: "Error fetching API",
          code: StatusCodes.INTERNAL_SERVER_ERROR,
          cause: error.message,
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
        tags: ["Core"],
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
        const error = e as PostgresError;
        logger.error({ error }, "updateApi: Error updating API");

        if (error.code === "23505") {
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
        tags: ["Core"],
        summary: "Delete an API",
        description: "This endpoint deletes an existing API.",
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
        const error = e as PostgresError;
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

  done();
};
