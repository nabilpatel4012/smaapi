import { FastifyInstance } from "fastify";
import { prom, reqReplyTime } from "../../utils/metrics";
// import { config } from "../../config";

export async function registerMetrics(server: FastifyInstance) {
  server.get("/metrics", async (_, reply) => {
    reply.header("Content-Type", prom.register.contentType);
    return prom.register.metrics();
  });
  server.addHook("onResponse", reqReplyTime);

  // prom.collectDefaultMetrics({ prefix: `${config.METRICS_PREFIX}` });
}
