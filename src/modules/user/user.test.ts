import { test, expect, describe } from "vitest";
import { faker } from "@faker-js/faker";
import { buildServer } from "../../utils/server";
import { createUser } from "./user.service";
import { db } from "../../test/setup";

describe("POST /api/users", () => {
  test("success - create the user", async () => {
    const email = faker.internet.email();
    const password = faker.internet.password();
    const app = await buildServer({ db });

    const res = await app.inject({
      method: "POST",
      url: "/v1/users",
      payload: { email, password },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ message: "User created successfully" });
  });

  test("fail - user already exists", async () => {
    const email = faker.internet.email();
    const password = faker.internet.password();

    await createUser({ email, password }, db);

    const app = await buildServer({ db });

    const res = await app.inject({
      method: "POST",
      url: "/v1/users",
      payload: { email, password },
    });

    expect(res.statusCode).toBe(409);
  });

  test("fail - missing email", async () => {
    const app = await buildServer({ db });

    const res = await app.inject({
      method: "POST",
      url: "/v1/users",
      payload: { password: "password" },
    });

    expect(res.statusCode).toBe(400);
  });
});

describe("POST /api/users/sessions", () => {
  test("success - login the user", async () => {
    const app = await buildServer({ db });

    const email = faker.internet.email();
    const password = faker.internet.password();

    await createUser({ email, password }, db);

    const res = await app.inject({
      method: "POST",
      url: "/v1/users/sessions",
      payload: { email, password },
    });

    expect(res.statusCode).toBe(200);
  });

  test("fail - invalid email or password", async () => {
    const email = faker.internet.email();
    const password = faker.internet.password();

    const app = await buildServer({ db });

    const res = await app.inject({
      method: "POST",
      url: "/v1/users/sessions",
      payload: { email, password },
    });

    expect(res.statusCode).toBe(401);

    expect(res.json()).toEqual({
      message: "invalid email or password",
    });
  });
});

describe("GET /api/users", () => {
  test("success - get the user", async () => {
    const email = faker.internet.email();
    const password = faker.internet.password();

    const app = await buildServer({ db });

    await createUser({ email, password }, db);

    const loginRes = await app.inject({
      method: "POST",
      url: "/v1/users/sessions",
      payload: { email, password },
    });

    expect(loginRes.statusCode).toBe(200);

    const cookies = loginRes.headers["set-cookie"];

    const res = await app.inject({
      method: "GET",
      url: "/v1/users/me",
      headers: {
        cookie: cookies,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      id: expect.any(String),
      email: email.toLowerCase(),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });
});
