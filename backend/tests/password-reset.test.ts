import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../src/app.js";

describe("Password Reset Privacy", () => {
  it("POST /api/auth/forgot-password with unknown email should return generic success message", async () => {
    const agent = request.agent(app);

    const csrfResponse = await agent.get("/api/csrf-token");
    const csrfToken = csrfResponse.body.data.csrfToken;

    const response = await agent
      .post("/api/auth/forgot-password")
      .set("x-csrf-token", csrfToken)
      .send({
        email: "unknown-user@example.com",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBeDefined();
    expect(response.body.debug).toBeUndefined();
  });
});
