import { FastifyPluginCallback } from "fastify";
import { httpError } from "../../../utils/http";
import { StatusCodes } from "http-status-codes";
import {
  createTable,
  deleteTable,
  getTableById,
  getTables,
  updateTable,
} from "./tables.service";
import {
  IProjectTableBody,
  IProjectTableQueryParams,
  IProjectTableReply,
  IProjectTableUpdateBody,
} from "../../../common/types/core.types";
import {
  projectTableBodySchema,
  projectTableQuerySchema,
  projectTableResponseSchema,
  projectTablesResponseSchema,
  projectTableUpdateSchema,
} from "./tables.schema";
import { errorResponseSchema } from "../../user/user.schema";
import { auth } from "../../../common/helpers/authenticate";
import { IErrorReply } from "../../../common/types/generic.types";
import { QueryError } from "mysql2";
import { logger } from "../../../utils/logger";

export const tableController: FastifyPluginCallback = (server, _, done) => {
  server.post<{
    Body: IProjectTableBody;
    Reply: IProjectTableReply;
    Params: { project_id: string };
  }>(
    "/:project_id/tables",
    {
      ...auth(server),
      schema: {
        tags: ["Tables", "Core"],
        summary: "Create a new table",
        description:
          "This endpoint creates a new table for the specified project.",
        params: {
          type: "object",
          properties: {
            project_id: { type: "string", description: "Project ID" },
          },
          required: ["project_id"],
        },
        body: projectTableBodySchema,
        response: {
          201: projectTableResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema, // Project not found
          409: errorResponseSchema, // Duplicate entry
          500: errorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      try {
        const { project_id } = req.params;
        const { table_name, table_schema } = req.body;
        if (!project_id || isNaN(Number(project_id))) {
          return httpError({
            reply,
            message: "Invalid project ID",
            code: StatusCodes.BAD_REQUEST,
          });
        }
        if (
          table_schema &&
          (typeof table_schema !== "object" || Array.isArray(table_schema))
        ) {
          return httpError({
            reply,
            message: "table_schema must be a valid JSON object",
            code: StatusCodes.BAD_REQUEST,
          });
        }
        const response = await createTable({
          project_id: Number(project_id),
          table_name,
          table_schema,
          isDeleted: false,
        });
        return reply.code(StatusCodes.CREATED).send(response);
      } catch (e) {
        const error = e as QueryError;
        if (error.errno === 1062) {
          return httpError({
            code: StatusCodes.CONFLICT,
            message: "Table name already exists in this project",
            cause: "You have entered a name which already exists",
            reply,
          });
        }
        if (e instanceof Error && e.message.includes("Project")) {
          return httpError({
            code: StatusCodes.NOT_FOUND,
            message: "Project not found",
            reply,
          });
        }
        logger.error({ error }, "createTable: Error creating table");
        return httpError({
          code: StatusCodes.INTERNAL_SERVER_ERROR,
          message: "Internal Server Error",
          reply,
        });
      }
    }
  );

  server.get<{
    Querystring: IProjectTableQueryParams;
    Reply: IProjectTableReply[] | IErrorReply;
  }>(
    "/tables",
    {
      ...auth(server),
      schema: {
        tags: ["Tables", "Core"],
        summary: "Get list of tables",
        description:
          "This endpoint returns a list of tables for the specified project (if provided) or all projects for the user, with support for pagination and filtering.",
        querystring: projectTableQuerySchema,
        response: {
          200: projectTablesResponseSchema,
          400: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      try {
        const { page = 1, size = 10, name, project_id } = req.query;
        const pageNumber = Number(page);
        const sizeNumber = Number(size);

        // Validate pagination parameters
        if (
          isNaN(pageNumber) ||
          isNaN(sizeNumber) ||
          pageNumber < 1 ||
          sizeNumber < 1
        ) {
          return httpError({
            reply,
            message: "Invalid page or size parameters",
            code: StatusCodes.BAD_REQUEST,
          });
        }

        // Validate project_id if provided
        if (project_id !== undefined && isNaN(Number(project_id))) {
          return httpError({
            reply,
            message: "Invalid project ID",
            code: StatusCodes.BAD_REQUEST,
          });
        }

        const offset = (pageNumber - 1) * sizeNumber;
        const filters = {
          limit: sizeNumber,
          offset: offset,
          ...(project_id !== undefined && { project_id: Number(project_id) }),
          ...(name && { name }),
        };

        const response = await getTables(req.user.user_id, filters);
        return reply.code(StatusCodes.OK).send(response);
      } catch (e) {
        logger.error({ error: e }, "getTables: Error fetching tables");
        return httpError({
          code: StatusCodes.INTERNAL_SERVER_ERROR,
          message: "Internal Server Error",
          reply,
        });
      }
    }
  );

  server.get<{
    Params: { id: string };
    Querystring: { project_id?: string }; // Make project_id optional
    Reply: IProjectTableReply | IErrorReply;
  }>(
    "/tables/:id",
    {
      ...auth(server),
      schema: {
        tags: ["Tables", "Core"],
        summary: "Get a table by ID",
        description: "This endpoint returns a table for the specified project.",
        params: {
          type: "object",
          properties: {
            id: { type: "string", description: "Table ID" },
          },
          required: ["id"],
        },
        querystring: {
          type: "object",
          properties: {
            project_id: { type: "string", description: "Project ID" },
          },
        },
        response: {
          200: projectTableResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema, // Add for unauthorized
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { project_id } = req.query as { project_id?: string };

      try {
        // Validate table_id
        if (!id || isNaN(Number(id))) {
          return httpError({
            reply,
            message: "Invalid table ID",
            code: StatusCodes.BAD_REQUEST,
          });
        }

        // Validate user_id from authentication
        if (!req.user?.user_id || isNaN(Number(req.user.user_id))) {
          return httpError({
            reply,
            message: "Unauthorized: Invalid user ID",
            code: StatusCodes.UNAUTHORIZED,
          });
        }

        // Validate project_id if provided
        let projectIdNumber: number | undefined;
        if (project_id !== undefined && project_id !== "") {
          projectIdNumber = Number(project_id);
          if (isNaN(projectIdNumber)) {
            return httpError({
              reply,
              message: "Invalid project ID",
              code: StatusCodes.BAD_REQUEST,
            });
          }
        }

        const result = await getTableById(
          Number(id), // table_id
          Number(req.user.user_id), // user_id
          projectIdNumber // project_id (undefined if not provided)
        );

        return reply.code(StatusCodes.OK).send(result);
      } catch (e) {
        if (e instanceof Error && e.message.includes("not found")) {
          return httpError({
            reply,
            message: "Table not found",
            code: StatusCodes.NOT_FOUND,
          });
        }
        logger.error({ error: e }, "getTableById: Error fetching table");
        return httpError({
          reply,
          message: "Error fetching table",
          code: StatusCodes.INTERNAL_SERVER_ERROR,
          cause: e instanceof Error ? e.message : "Unknown error",
        });
      }
    }
  );

  server.patch<{
    Params: { project_id: string; id: string };
    Body: IProjectTableUpdateBody;
    Reply: IProjectTableReply | IErrorReply;
  }>(
    "/:project_id/tables/:id",
    {
      ...auth(server),
      schema: {
        tags: ["Tables", "Core"],
        summary: "Update a table",
        description: "This endpoint updates an existing table.",
        params: {
          type: "object",
          properties: {
            project_id: { type: "string", description: "Project ID" },
            id: { type: "string", description: "Table ID" },
          },
          required: ["project_id", "id"],
        },
        body: projectTableUpdateSchema,
        response: {
          200: projectTableResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const { project_id, id } = req.params;
      const { table_name, table_schema } = req.body;

      try {
        if (!project_id || isNaN(Number(project_id))) {
          return httpError({
            reply,
            message: "Invalid project ID",
            code: StatusCodes.BAD_REQUEST,
          });
        }
        if (!id || isNaN(Number(id))) {
          return httpError({
            reply,
            message: "Invalid table ID",
            code: StatusCodes.BAD_REQUEST,
          });
        }

        if (
          table_schema &&
          (typeof table_schema !== "object" || Array.isArray(table_schema))
        ) {
          return httpError({
            reply,
            message: "table_schema must be a valid JSON object",
            code: StatusCodes.BAD_REQUEST,
          });
        }

        const updatePayload: Record<string, any> = {};
        if (table_name !== undefined) updatePayload.table_name = table_name;
        if (table_schema !== undefined)
          updatePayload.table_schema = table_schema;

        const updatedTable = await updateTable(
          Number(id),
          updatePayload,
          Number(project_id),
          req.user.user_id
        );

        if (!updatedTable) {
          return httpError({
            reply,
            message: "Table not found",
            code: StatusCodes.NOT_FOUND,
          });
        }

        return reply.code(StatusCodes.OK).send(updatedTable);
      } catch (e) {
        const error = e as QueryError;
        if (error.errno === 1062) {
          return httpError({
            code: StatusCodes.CONFLICT,
            message: "Table name already exists in this project",
            cause: "A table with this name already exists",
            reply,
          });
        }
        logger.error({ error }, "updateTable: Error updating table");
        return httpError({
          reply,
          message: "Error updating table",
          code: StatusCodes.INTERNAL_SERVER_ERROR,
          cause: e instanceof Error ? e.message : "Unknown error",
        });
      }
    }
  );

  server.delete<{
    Params: { project_id: string; id: string };
    Reply: IProjectTableReply | IErrorReply;
  }>(
    "/:project_id/tables/:id",
    {
      ...auth(server),
      schema: {
        tags: ["Tables", "Core"],
        summary: "Delete a table",
        description: "This endpoint soft-deletes an existing table.",
        params: {
          type: "object",
          properties: {
            project_id: { type: "string", description: "Project ID" },
            id: { type: "string", description: "Table ID" },
          },
          required: ["project_id", "id"],
        },
        response: {
          200: projectTableResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const { project_id, id } = req.params;

      try {
        if (!project_id || isNaN(Number(project_id))) {
          return httpError({
            reply,
            message: "Invalid project ID",
            code: StatusCodes.BAD_REQUEST,
          });
        }
        if (!id || isNaN(Number(id))) {
          return httpError({
            reply,
            message: "Invalid table ID",
            code: StatusCodes.BAD_REQUEST,
          });
        }

        const deletedTable = await deleteTable(
          Number(id),
          Number(project_id),
          req.user.user_id
        );

        if (!deletedTable) {
          return httpError({
            reply,
            message: "Table not found",
            code: StatusCodes.NOT_FOUND,
          });
        }

        return reply.code(StatusCodes.OK).send(deletedTable);
      } catch (e) {
        logger.error({ error: e }, "deleteTable: Error deleting table");
        return httpError({
          reply,
          message: "Error deleting table",
          code: StatusCodes.INTERNAL_SERVER_ERROR,
          cause: e instanceof Error ? e.message : "Unknown error",
        });
      }
    }
  );

  done();
};
