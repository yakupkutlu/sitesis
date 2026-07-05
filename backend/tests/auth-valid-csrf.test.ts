import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../src/app.js";

describe("Auth with valid CSRF", () => {
  it("POST /api/auth/login with valid csrf token should pass csrf protection", async () => {
    const agent = request.agent(app);

    const csrfResponse = await agent.get("/api/csrf-token");

    const csrfToken = csrfResponse.body.data.csrfToken;

    const loginResponse = await agent
      .post("/api/auth/login")
      .set("x-csrf-token", csrfToken)
      .send({
        email: "notfound@example.com",
        password: "wrong-password",
      });

    expect(loginResponse.status).not.toBe(403);
    expect(loginResponse.status).toBe(401);
    expect(loginResponse.body.success).toBe(false);
  });
});
