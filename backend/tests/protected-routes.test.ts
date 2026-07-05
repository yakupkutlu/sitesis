import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../src/app.js";

describe("Protected Routes", () => {
  it("GET /api/users without login should return 401", async () => {
    const response = await request(app).get("/api/users");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
