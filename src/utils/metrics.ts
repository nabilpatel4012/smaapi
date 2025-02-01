import client from "prom-client";
import { config } from "../config";
import { FastifyReply, FastifyRequest } from "fastify";

const requestResponseTimeHistogram = new client.Histogram({
  name: `${config.METRICS_PREFIX}http_request_duration_seconds`,
  help: "REST API request duration in seconds",
  labelNames: ["method", "route", "status_code", "success"] as const,
});

const httpRequestCounter = new client.Counter({
  name: `${config.METRICS_PREFIX}http_requests_total`,
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code", "success"] as const,
});

/*
 * Should have low cardinality
 */
export const databaseQueryTimeHistogram = new client.Histogram({
  name: `${config.METRICS_PREFIX}database_query_duration_seconds`,
  help: "Database query duration in seconds",
  labelNames: ["operation", "success"] as const,
});

export async function reqReplyTime(
  req: FastifyRequest<object>,
  reply: FastifyReply
) {
  const time = reply.elapsedTime;
  const success = reply.statusCode < 400 ? "true" : "false";

  requestResponseTimeHistogram.observe(
    {
      method: req.method,
      route: req.url,
      status_code: reply.statusCode,
    },
    time / 1000
  );

  httpRequestCounter.inc({
    method: req.method,
    route: req.url,
    status_code: reply.statusCode,
    success,
  });
}

export const prom = client;
