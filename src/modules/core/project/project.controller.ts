import { FastifyPluginCallback } from "fastify";
import { PostgresError } from "postgres";
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
        tags: ["Core"],
        summary: "Create a new project",
        description:
          "This endpoint creates a new project for the authenticated user.",
        body: userProjectBodySchema,
        response: {
          201: userProjectBodySchema,
          400: errorResponseSchema,
          409: errorResponseSchema, // Duplicate entry
          500: errorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      try {
        const { project_name, project_description, tags } = req.body;
        const response = await createProject({
          project_name,
          project_description,
          tags,
          user_id: req.user.user_id,
        });
        return reply.code(StatusCodes.OK).send(response);
      } catch (e) {
        const error = e as PostgresError;
        if (error.code === "23505") {
          return httpError({
            code: StatusCodes.CONFLICT,
            message: "Project name already exist",
            cause: "You have entered a name which already exist",
            reply,
          });
        }
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
        tags: ["Core"],
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
        const { page, size, name } = req.query;
        const pageNumber = Number(page);
        const sizeNumber = Number(size);

        if (
          (page && isNaN(pageNumber)) ||
          (size && isNaN(sizeNumber)) ||
          pageNumber < 1 ||
          sizeNumber < 1
        ) {
          return reply
            .code(400)
            .send({ message: "Invalid page or size parameters." });
        }
        const response = await getProjects(
          (pageNumber - 1) * sizeNumber,
          sizeNumber,
          req.user.user_id,
          name
        );
        return reply.code(StatusCodes.OK).send(response);
      } catch (e) {
        return httpError({
          code: StatusCodes.INTERNAL_SERVER_ERROR,
          message: "Internal Server Error",
          reply,
        });
      }
    }
  );

  server.get<{ Params: IIdParams; Reply: IProjectReply }>(
    "/:id",
    {
      ...auth(server),
      schema: {
        tags: ["Core"],
        summary: "Get a project by project Id",
        description:
          "This endpoint returns a project for the authenticated user.",
        response: {
          200: userProjectResponseSchema,
          400: errorResponseSchema,
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
        const result = await getProjectById(Number(id), req.user.user_id);
        if (!result) {
          return httpError({
            reply,
            message: "Project not found",
            code: StatusCodes.NOT_FOUND,
          });
        }

        return reply.code(StatusCodes.OK).send(result);
      } catch (e) {
        const error = e as QueryError;

        logger.error({ error }, "getProjectById: Error fetching project");

        return httpError({
          reply,
          message: "Error fetching project",
          code: StatusCodes.INTERNAL_SERVER_ERROR,
          cause: error.message,
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
        tags: ["Core"],
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
      const { project_name, project_description, tags } = req.body; // Destructure the update fields

      try {
        if (!id || isNaN(Number(id))) {
          return httpError({
            reply,
            message: "Invalid project Id",
            code: StatusCodes.BAD_REQUEST,
          });
        }

        const updatedProject = await updateProject(
          Number(id),
          //TODO: FIND BETTER SOLUTOION INSTEAD OF TS IGNORE
          //@ts-ignore
          { project_name, project_description, tags },
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
        const error = e as PostgresError;
        logger.error({ error }, "updateProject: Error updating project");
        return httpError({
          reply,
          message: "Error updating project",
          code: StatusCodes.INTERNAL_SERVER_ERROR,
          cause: error.message,
        });
      }
    }
  );

  server.delete<{ Params: IIdParams; Reply: IProjectReply | IErrorReply }>(
    "/:id",
    {
      ...auth(server),
      schema: {
        tags: ["Core"],
        summary: "Delete a project",
        description: "This endpoint deletes an existing project.",
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
        const error = e as PostgresError;
        logger.error({ error }, "deleteProject: Error deleting project");

        return httpError({
          reply,
          message: "Error deleting project",
          code: StatusCodes.INTERNAL_SERVER_ERROR,
          cause: error.message,
        });
      }
    }
  );

  done();
};
