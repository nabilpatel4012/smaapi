import { FastifyPluginCallback } from "fastify";
import {
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  findUserByEmail,
  verifyPassword,
} from "./user.service";
import { httpError } from "../../utils/http";
import { StatusCodes } from "http-status-codes";
import { logger } from "../../utils/logger";
import { QueryError } from "mysql2";
import {
  ILoginReply,
  IUserBody,
  IUserReply,
  IUserUpdateBody,
} from "../../common/types/user.types";
import { IIdParams, ISuccessfulReply } from "../../common/types/generic.types";
import {
  userBodySchema,
  userResponseSchema,
  errorResponseSchema,
  userUpdateSchema,
  successResponseSchema,
} from "./user.schema";
import { auth } from "../../common/helpers/authenticate";

export const usersController: FastifyPluginCallback = (server, _, done) => {
  /**
   * Create a new user
   */
  server.post<{ Body: IUserBody; Reply: IUserReply }>(
    "/",
    {
      schema: {
        tags: ["Users"],
        summary: "Create a new user",
        description:
          "This endpoint creates a new user and returns the created user details.",
        body: userBodySchema,
        response: {
          201: userResponseSchema,
          400: errorResponseSchema,
          409: errorResponseSchema, // Duplicate entry
          500: errorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const {
        username,
        email,
        password,
        user_type,
        company_name,
        company_email,
        plan_type,
        first_name,
        last_name,
        phone_number,
        avatar_url,
        bio,
      } = req.body;

      try {
        // Validate business fields if user_type = "business"
        if (user_type === "business" && (!company_name || !company_email)) {
          return httpError({
            reply,
            message: "Business users must provide company name and email",
            code: StatusCodes.BAD_REQUEST,
          });
        }

        // Hash the password before storing it
        const password_hash = password;
        const user = await createUser({
          username,
          email,
          password_hash,
          user_type,
          company_name: user_type === "business" ? company_name : null,
          company_email: user_type === "business" ? company_email : null,
          plan_type: (plan_type || "SMAAPI_FREE") as
            | "SMAAPI_FREE"
            | "SMAAPI_PRO"
            | "SMAAPI_ENTERPRISE",
          first_name: first_name || null,
          last_name: last_name || null,
          phone_number: phone_number || null,
          avatar_url: avatar_url || null,
          bio: bio || null,
          is_active: true,
          is_verified: false,
        });

        return reply.code(StatusCodes.CREATED).send(user);
      } catch (e) {
        const error = e as QueryError;

        if (error.code === "ER_DUP_ENTRY") {
          return httpError({
            reply,
            message: "User already exists",
            cause: "Username or email should be unique",
            code: StatusCodes.CONFLICT,
          });
        }

        logger.error({ error }, "createUser: error creating user");
        return httpError({
          reply,
          message: "Error creating user",
          code: StatusCodes.BAD_REQUEST,
          cause: error.message,
        });
      }
    },
  );

  /**
   * Get user by ID
   */
  server.get<{ Params: IIdParams; Reply: IUserReply }>(
    "/:id",
    {
      ...auth(server),
      schema: {
        tags: ["Users"],
        summary: "Get a user by ID",
        description: "Fetches a user from the database using their unique ID.",
        params: {
          type: "object",
          properties: {
            id: { type: "number", description: "User ID" },
          },
          required: ["id"],
        },
        response: {
          200: userResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params;
      if (id !== req.user.user_id) {
        return httpError({
          reply,
          message: "You don't have permission",
          code: StatusCodes.FORBIDDEN,
        });
      }
      try {
        if (!id || isNaN(Number(id))) {
          return httpError({
            reply,
            message: "Invalid user ID",
            code: StatusCodes.BAD_REQUEST,
          });
        }

        const user = await getUserById(Number(id));

        if (!user) {
          return httpError({
            reply,
            message: "User not found",
            code: StatusCodes.NOT_FOUND,
          });
        }

        return reply.code(StatusCodes.OK).send(user);
      } catch (e) {
        const error = e as QueryError;

        logger.error({ error }, "getUserById: Error fetching user");

        return httpError({
          reply,
          message: "Error fetching user",
          code: StatusCodes.INTERNAL_SERVER_ERROR,
          cause: error.message,
        });
      }
    },
  );

  /**
   * Update user by ID
   */
  server.put<{
    Params: IIdParams;
    Body: IUserUpdateBody;
    Reply: ISuccessfulReply;
  }>(
    "/:id",
    {
      ...auth(server),
      schema: {
        tags: ["Users"],
        summary: "Update a user",
        description: "Updates a user's information.",
        params: {
          type: "object",
          properties: {
            id: { type: "number", description: "User ID" },
          },
          required: ["id"],
        },
        body: userUpdateSchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params;
      if (id !== req.user.user_id) {
        return httpError({
          reply,
          message: "You don't have permission",
          code: StatusCodes.FORBIDDEN,
        });
      }
      const updateData = req.body;

      try {
        if (!id || isNaN(Number(id))) {
          return httpError({
            reply,
            message: "Invalid user ID",
            code: StatusCodes.BAD_REQUEST,
          });
        }

        const updatedUser = await updateUser(Number(id), updateData);

        if (!updatedUser) {
          return httpError({
            reply,
            message: "User not found",
            code: StatusCodes.NOT_FOUND,
          });
        }

        return reply.code(StatusCodes.OK).send({
          message: "User updated successfully",
        });
      } catch (e) {
        const error = e as QueryError;

        logger.error({ error }, "updateUser: Error updating user");

        return httpError({
          reply,
          message: "Error updating user",
          code: StatusCodes.INTERNAL_SERVER_ERROR,
          cause: error.message,
        });
      }
    },
  );

  /**
   * Delete user by ID
   */
  server.delete<{ Params: IIdParams; Reply: ISuccessfulReply }>(
    "/:id",
    {
      ...auth(server),
      schema: {
        tags: ["Users"],
        summary: "Delete a user",
        description: "Deletes a user from the database.",
        params: {
          type: "object",
          properties: {
            id: { type: "number", description: "User ID" },
          },
          required: ["id"],
        },
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params;
      if (id !== req.user.user_id) {
        return httpError({
          reply,
          message: "You don't have permission",
          code: StatusCodes.FORBIDDEN,
        });
      }
      try {
        if (!id || isNaN(Number(id))) {
          return httpError({
            reply,
            message: "Invalid user ID",
            code: StatusCodes.BAD_REQUEST,
          });
        }

        const deletedUser = await deleteUser(Number(id));

        if (!deletedUser) {
          return httpError({
            reply,
            message: "User not found",
            code: StatusCodes.NOT_FOUND,
          });
        }

        return reply.code(StatusCodes.OK).send({
          message: "User deleted successfully",
        });
      } catch (e) {
        const error = e as QueryError;

        logger.error({ error }, "deleteUser: Error deleting user");

        return httpError({
          reply,
          message: "Error deleting user",
          code: StatusCodes.INTERNAL_SERVER_ERROR,
          cause: error.message,
        });
      }
    },
  );

  server.post<{
    Body: IUserBody;
    Reply: ILoginReply;
  }>(
    "/login",
    // { schema: { ...userBodySchema, ...loginResponseSchema } },
    async (req, reply) => {
      const { email, password } = req.body;
      const user = await findUserByEmail({ email });
      if (!user) {
        return httpError({
          reply,
          message: "Invalid credentials or user does not exist",
          code: StatusCodes.NOT_FOUND,
        });
      }

      const isPasswordValid = await verifyPassword({
        candidatePassword: password,
        hashedPassword: user.password_hash,
      });
      if (!isPasswordValid) {
        return httpError({
          reply,
          message: "Invalid credentials",
          code: StatusCodes.BAD_REQUEST,
        });
      }

      const token = server.jwt.sign(
        {
          user_id: user.user_id,
          username: user.username,
          email: user.email,
        },
        {
          algorithm: "HS512",
          expiresIn: "1h",
        },
      );
      reply.code(200).send({
        token: token,
        user_id: Number(user.user_id),
        username: user.username,
        email: user.email,
      });
    },
  );

  done();
};
