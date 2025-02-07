import { FastifyPluginCallback } from "fastify";
import { httpError } from "../../utils/http";
import { StatusCodes } from "http-status-codes";
import { getSmaapiStructure } from "./core.service";

export const coreController: FastifyPluginCallback = (server, _, done) => {
  server.get<{ Reply: any }>("/", async (req, reply) => {
    try {
      const response = await getSmaapiStructure();
      return reply.code(StatusCodes.OK).send({ response });
    } catch (e) {
      return httpError({
        code: StatusCodes.INTERNAL_SERVER_ERROR,
        message: "Internal Server Error",
        reply,
      });
    }
  });

  done();
};
