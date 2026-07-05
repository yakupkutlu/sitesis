import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../src/app.js";

describe("Auth CSRF Protection", () => {
  it("POST /api/auth/login without csrf token should return 403", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "test@example.com",
        password: "password123",
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });
});
