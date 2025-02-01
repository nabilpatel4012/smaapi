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

async function createJob(
  app: FastifyInstance,
  cookie: Awaited<ReturnType<typeof getCookie>>
) {
  const jobData = {
    title: faker.person.jobTitle(),
    description: faker.lorem.paragraph(),
    status: "active",
  };

  const res = await app.inject({
    method: "POST",
    url: "/v1/jobs",
    headers: { cookie },
    payload: jobData,
  });

  return res.json();
}

describe("POST /api/applications", () => {
  test("success - create application", async () => {
    const app = await buildServer({ db });
    const cookie = await getCookie(app);
    const job = await createJob(app, cookie);

    const applicationData = {
      coverLetter: faker.lorem.paragraph(),
      jobId: job.id,
      resume: faker.internet.url(),
    };

    const res = await app.inject({
      method: "POST",
      url: "/v1/applications",
      headers: {
        cookie,
      },
      payload: applicationData,
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      coverLetter: applicationData.coverLetter,
      jobId: job.id,
    });
  });

  test("fail - create application without authentication", async () => {
    const app = await buildServer({ db });
    const cookie = await getCookie(app);
    const job = await createJob(app, cookie);

    const res = await app.inject({
      method: "POST",
      url: "/v1/applications",
      payload: {
        coverLetter: faker.lorem.paragraph(),
        jobId: job.id,
        resume: faker.internet.url(),
      },
    });

    expect(res.statusCode).toBe(401);
  });

  test("fail - create application for non-existent job", async () => {
    const app = await buildServer({ db });
    const cookie = await getCookie(app);

    const res = await app.inject({
      method: "POST",
      url: "/v1/applications",
      headers: {
        cookie,
      },
      payload: {
        coverLetter: faker.lorem.paragraph(),
        jobId: faker.string.uuid(),
        resume: faker.internet.url(),
      },
    });

    expect(res.statusCode).toBe(404);
  });
});

describe("PATCH /api/applications/:id", () => {
  test("success - update application", async () => {
    const app = await buildServer({ db });
    const cookie = await getCookie(app);
    const job = await createJob(app, cookie);

    // Create an application first
    const createRes = await app.inject({
      method: "POST",
      url: "/v1/applications",
      headers: {
        cookie: await getCookie(app),
      },
      payload: {
        coverLetter: faker.lorem.paragraph(),
        jobId: job.id,
        resume: faker.internet.url(),
      },
    });

    const { id } = createRes.json();
    const updatedCoverLetter = faker.lorem.paragraph();

    const res = await app.inject({
      method: "PATCH",
      url: `/v1/applications/${id}`,
      headers: {
        cookie,
      },
      payload: {
        coverLetter: updatedCoverLetter,
        status: "accepted",
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      id,
      coverLetter: updatedCoverLetter,
      status: "accepted",
    });
  });

  test("fail - update application without authentication", async () => {
    const app = await buildServer({ db });
    const cookie = await getCookie(app);
    const job = await createJob(app, cookie);

    await app.inject({
      method: "POST",
      url: "/v1/applications",
      headers: {
        cookie: await getCookie(app),
      },
      payload: {
        coverLetter: faker.lorem.paragraph(),
        jobId: job.id,
        resume: faker.internet.url(),
      },
    });

    const res = await app.inject({
      method: "PATCH",
      url: `/v1/applications/${faker.string.uuid()}`,
      payload: {
        status: "rejected",
      },
    });

    expect(res.statusCode).toBe(401);
  });

  test("fail - update non-existent application", async () => {
    const app = await buildServer({ db });
    const cookie = await getCookie(app);

    const res = await app.inject({
      method: "PATCH",
      url: `/v1/applications/${faker.string.uuid()}`,
      headers: {
        cookie,
      },
      payload: {
        status: "rejected",
      },
    });

    expect(res.statusCode).toBe(404);
  });
});
