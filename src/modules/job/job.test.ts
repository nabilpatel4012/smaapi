import { describe, test, expect } from "vitest";
import { faker } from "@faker-js/faker";
import { buildServer } from "../../utils/server";
import { createUser } from "../user/user.service";
import { db } from "../../test/setup";
import { FastifyInstance } from "fastify";

async function getCookie(app: FastifyInstance) {
  const email = faker.internet.email();
  const password = faker.internet.password();
  await createUser({ email, password }, db);

  const loginResponse = await app.inject({
    method: "POST",
    url: "/v1/users/sessions",
    payload: { email, password },
  });

  return loginResponse.headers["set-cookie"];
}

describe("POST /api/jobs", () => {
  test("success - create a job", async () => {
    const app = await buildServer({ db });

    const jobData = {
      title: "Software Engineer",
      description: "A great job opportunity",
      status: "active",
    };

    const res = await app.inject({
      method: "POST",
      url: "/v1/jobs",
      headers: {
        cookie: await getCookie(app),
      },
      payload: jobData,
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      title: jobData.title,
      description: jobData.description,
      status: jobData.status,
    });
  });

  test("fail - create job without authentication", async () => {
    const app = await buildServer({ db });

    const res = await app.inject({
      method: "POST",
      url: "/v1/jobs",
      payload: {
        title: "Software Engineer",
        description: "A great job opportunity",
        status: "active",
      },
    });

    expect(res.statusCode).toBe(401);
  });
});

describe("GET /api/jobs", () => {
  test("success - get jobs", async () => {
    const app = await buildServer({ db });

    const res = await app.inject({
      method: "GET",
      url: "/v1/jobs",
    });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json().items)).toBe(true);
  });

  test("success - get jobs with search", async () => {
    const app = await buildServer({ db });

    // Create a job first to search for
    const email = "test@example.com";
    const password = "password123";
    await createUser({ email, password }, db);

    const loginResponse = await app.inject({
      method: "POST",
      url: "/v1/users/login",
      payload: { email, password },
    });
    const token = loginResponse.json().token;

    await app.inject({
      method: "POST",
      url: "/v1/jobs",
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        title: "Senior Engineer",
        description: "Senior role",
        status: "active",
      },
    });

    const res = await app.inject({
      method: "GET",
      url: "/v1/jobs?search=engineer",
    });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json().items)).toBe(true);
  });
});

describe("GET /api/jobs/:slug", () => {
  test("success - get job by slug", async () => {
    const app = await buildServer({ db });

    const jobData = {
      title: "Senior Developer",
      description: "Senior role",
      status: "active",
    };

    const createRes = await app.inject({
      method: "POST",
      url: "/v1/jobs",
      headers: {
        cookie: await getCookie(app),
      },
      payload: jobData,
    });

    const { slug } = createRes.json();

    const getRes = await app.inject({
      method: "GET",
      url: `/v1/jobs/${slug}`,
    });

    expect(getRes.statusCode).toBe(200);
    expect(getRes.json()).toMatchObject({
      title: jobData.title,
      description: jobData.description,
      status: jobData.status,
    });
  });

  test("fail - get non-existent job", async () => {
    const app = await buildServer({ db });

    const res = await app.inject({
      method: "GET",
      url: "/v1/jobs/non-existent-slug",
    });

    expect(res.statusCode).toBe(404);
  });
});

describe("PATCH /api/jobs/:jobId", () => {
  test("success - update job", async () => {
    const app = await buildServer({ db });

    const cookie = await getCookie(app);

    const createRes = await app.inject({
      method: "POST",
      url: "/v1/jobs",
      headers: {
        cookie,
      },
      payload: {
        title: "Job to Update",
        description: "Original description",
        status: "active",
      },
    });

    const { id } = createRes.json();

    const updateRes = await app.inject({
      method: "PATCH",
      url: `/v1/jobs/${id}`,
      headers: {
        cookie,
      },
      payload: {
        description: "Updated description",
        status: "inactive",
      },
    });

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.json()).toMatchObject({
      description: "Updated description",
      status: "inactive",
    });
  });

  test("fail - update job without authentication", async () => {
    const app = await buildServer({ db });

    const res = await app.inject({
      method: "PATCH",
      url: "/v1/jobs/some-id",
      payload: {
        status: "inactive",
      },
    });

    expect(res.statusCode).toBe(401);
  });
});
