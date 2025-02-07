import { FastifyPluginCallback } from "fastify";
import { PostgresError } from "postgres";
import { httpError } from "../../../utils/http";
import { StatusCodes } from "http-status-codes";
import { createProject, getProjectById, getProjects } from "./project.service";
import {
  IProjectBody,
  IProjectQueryParams,
  IProjectReply,
} from "../../../common/types/core.types";
import {
  userProjectBodySchema,
  userProjectQuerySchema,
  userProjectResponseSchema,
  userProjectsResponseSchema,
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

  done();
};
