import { FastifyPluginCallback } from "fastify";
import { httpError } from "../../../utils/http";
import { StatusCodes } from "http-status-codes";
import {
  createProject,
  deleteProject,
  getProjectById,
  getProjects,
  updateProject,
} from "./project.service";
import {
  IProjectBody,
  IProjectQueryParams,
  IProjectReply,
  IProjectUpdateBody,
} from "../../../common/types/core.types";
import {
  userProjectBodySchema,
  userProjectQuerySchema,
  userProjectResponseSchema,
  userProjectsResponseSchema,
  userProjectUpdateSchema,
} from "./project.schema";
import { errorResponseSchema } from "../../user/user.schema";
import { auth } from "../../../common/helpers/authenticate";
import { IErrorReply, IIdParams } from "../../../common/types/generic.types";
import { QueryError } from "mysql2";
import { logger } from "../../../utils/logger";

export const projectController: FastifyPluginCallback = (server, _, done) => {
  server.post<{ Body: IProjectBody; Reply: IProjectReply }>(
    "/",
    {
      ...auth(server),
      schema: {
        tags: ["Projects", "Core"],
        summary: "Create a new project",
        description:
          "This endpoint creates a new project for the authenticated user.",
        body: userProjectBodySchema,
        response: {
          201: userProjectResponseSchema,
          400: errorResponseSchema,
          409: errorResponseSchema, // Duplicate entry
          500: errorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      try {
        const { project_name, project_description } = req.body;
        const response = await createProject({
          project_name,
          project_description,
          user_id: req.user.user_id,
          isDeleted: false,
        });
        return reply.code(StatusCodes.CREATED).send(response);
      } catch (e) {
        const error = e as QueryError;
        if (error.code === "ER_DUP_ENTRY") {
          return httpError({
            code: StatusCodes.CONFLICT,
            message: "Project name already exists",
            cause: "You have entered a name which already exists",
            reply,
          });
        }
        logger.error({ error }, "createProject: Error creating project");
        return httpError({
          code: StatusCodes.INTERNAL_SERVER_ERROR,
          message: "Internal Server Error",
          reply,
        });
      }
    }
  );

  server.get<{
    Querystring: IProjectQueryParams;
    Reply: IProjectReply[] | IErrorReply;
  }>(
    "/",
    {
      ...auth(server),
      schema: {
        tags: ["Projects", "Core"],
        summary: "Get list of projects",
        description:
          "This endpoint returns list of projects for the authenticated user, it also supports some query params for pagination and filtering.",
        querystring: userProjectQuerySchema,
        response: {
          200: userProjectsResponseSchema,
          400: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      try {
        const { page = 1, size = 10, name } = req.query;
        const pageNumber = Number(page);
        const sizeNumber = Number(size);

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

        const offset = (pageNumber - 1) * sizeNumber;
        const response = await getProjects(
          offset,
          sizeNumber,
          req.user.user_id,
          name
        );
        return reply.code(StatusCodes.OK).send(response);
      } catch (e) {
        logger.error({ error: e }, "getProjects: Error fetching projects");
        return httpError({
          code: StatusCodes.INTERNAL_SERVER_ERROR,
          message: "Internal Server Error",
          reply,
        });
      }
    }
  );

  server.get<{ Params: IIdParams; Reply: IProjectReply | IErrorReply }>(
    "/:id",
    {
      ...auth(server),
      schema: {
        tags: ["Projects", "Core"],
        summary: "Get a project by project Id",
        description:
          "This endpoint returns a project for the authenticated user.",
        response: {
          200: userProjectResponseSchema,
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
            message: "Invalid project Id",
            code: StatusCodes.BAD_REQUEST,
          });
        }

        try {
          const result = await getProjectById(Number(id), req.user.user_id);
          return reply.code(StatusCodes.OK).send(result);
        } catch (error) {
          // Check if it's a "not found" error message
          if (error instanceof Error && error.message.includes("not found")) {
            return httpError({
              reply,
              message: "Project not found",
              code: StatusCodes.NOT_FOUND,
            });
          }
          throw error; // Re-throw for other errors
        }
      } catch (e) {
        logger.error({ error: e }, "getProjectById: Error fetching project");
        return httpError({
          reply,
          message: "Error fetching project",
          code: StatusCodes.INTERNAL_SERVER_ERROR,
          cause: e instanceof Error ? e.message : "Unknown error",
        });
      }
    }
  );

  server.patch<{
    Params: IIdParams;
    Body: IProjectUpdateBody;
    Reply: IProjectReply | IErrorReply;
  }>(
    "/:id",
    {
      ...auth(server),
      schema: {
        tags: ["Projects", "Core"],
        summary: "Update a project",
        description: "This endpoint updates an existing project.",
        body: userProjectUpdateSchema, // Use the update schema
        params: {
          type: "object",
          properties: {
            id: { type: "string", description: "Project ID" },
          },
          required: ["id"],
        },
        response: {
          200: userProjectResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema, // Not found
          500: errorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params;
      const { project_name, project_description } = req.body;

      try {
        if (!id || isNaN(Number(id))) {
          return httpError({
            reply,
            message: "Invalid project Id",
            code: StatusCodes.BAD_REQUEST,
          });
        }

        // Type-safe payload building
        const updatePayload: Record<string, any> = {};
        if (project_name !== undefined)
          updatePayload.project_name = project_name;
        if (project_description !== undefined)
          updatePayload.project_description = project_description;

        const updatedProject = await updateProject(
          Number(id),
          updatePayload,
          req.user.user_id
        );

        if (!updatedProject) {
          return httpError({
            reply,
            message: "Project not found",
            code: StatusCodes.NOT_FOUND,
          });
        }

        return reply.code(StatusCodes.OK).send(updatedProject);
      } catch (e) {
        logger.error({ error: e }, "updateProject: Error updating project");
        return httpError({
          reply,
          message: "Error updating project",
          code: StatusCodes.INTERNAL_SERVER_ERROR,
          cause: e instanceof Error ? e.message : "Unknown error",
        });
      }
    }
  );

  server.delete<{ Params: IIdParams; Reply: IProjectReply | IErrorReply }>(
    "/:id",
    {
      ...auth(server),
      schema: {
        tags: ["Projects", "Core"],
        summary: "Delete a project",
        description: "This endpoint soft-deletes an existing project.",
        params: {
          type: "object",
          properties: {
            id: { type: "string", description: "Project ID" },
          },
          required: ["id"],
        },
        response: {
          200: userProjectResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema, // Not found
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
            message: "Invalid project Id",
            code: StatusCodes.BAD_REQUEST,
          });
        }

        const deletedProject = await deleteProject(
          Number(id),
          req.user.user_id
        );

        if (!deletedProject) {
          return httpError({
            reply,
            message: "Project not found",
            code: StatusCodes.NOT_FOUND,
          });
        }

        return reply.code(StatusCodes.OK).send(deletedProject);
      } catch (e) {
        logger.error({ error: e }, "deleteProject: Error deleting project");
        return httpError({
          reply,
          message: "Error deleting project",
          code: StatusCodes.INTERNAL_SERVER_ERROR,
          cause: e instanceof Error ? e.message : "Unknown error",
        });
      }
    }
  );

  done();
};
