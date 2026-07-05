import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../src/app.js";

describe("Reset Password Rate Limit", () => {
  it("POST /api/auth/reset-password should be rate limited after too many attempts", async () => {
    const agent = request.agent(app);

    const csrfResponse = await agent.get("/api/csrf-token");
    const csrfToken = csrfResponse.body.data.csrfToken;

    let lastStatus = 0;

    for (let attempt = 0; attempt < 17; attempt += 1) {
      const response = await agent
        .post("/api/auth/reset-password")
        .set("x-csrf-token", csrfToken)
        .send({
          token: "a".repeat(64),
          password: "newPassword123",
        });

      lastStatus = response.status;
    }

    expect(lastStatus).toBe(429);
  });
});
