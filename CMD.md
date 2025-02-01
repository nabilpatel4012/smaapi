## Initalise project
pnpm init

npx tsc --init

## Install dependencies
pnpm add drizzle-orm postgres pino pino-pretty http-status-codes argon2 @fastify/secure-session @fastify/cookie fastify prom-client env-schema @fastify/swagger @fastify/swagger-ui pg-error-enum slugify fastify-type-provider-zod zod drizzle-zod



pnpm add -D drizzle-kit

## Install dev dependencies
pnpm add drizzle-kit typescript tsx json-schema-to-ts @types/node vitest testcontainers @testcontainers/postgresql vitest @faker-js/faker -D

## Generate session key file
npx --yes @fastify/secure-session > session-key
