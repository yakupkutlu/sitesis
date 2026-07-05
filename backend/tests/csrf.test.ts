import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../src/app.js";

describe("CSRF API", () => {
  it("GET /api/csrf-token should return csrf token and set cookie", async () => {
    const response = await request(app).get("/api/csrf-token");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(typeof response.body.data.csrfToken).toBe("string");
    expect(response.body.data.csrfToken).toContain(".");

    const setCookieHeader = response.headers["set-cookie"];

    expect(setCookieHeader).toBeDefined();
    expect(Array.isArray(setCookieHeader)).toBe(true);
    expect(setCookieHeader.join(";")).toContain(response.body.data.csrfToken);
  });
});
