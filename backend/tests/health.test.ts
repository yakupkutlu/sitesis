import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../src/app.js";

describe("Health API", () => {
  it("GET /api/health should return backend status", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      status: "ok",
    });
  });
});
