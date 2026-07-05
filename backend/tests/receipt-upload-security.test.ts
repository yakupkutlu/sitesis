import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../src/app.js";

describe("Payment Receipt Upload Security", () => {
  it("POST /api/payment-receipts without csrf token should return 403", async () => {
    const response = await request(app)
      .post("/api/payment-receipts")
      .field("paymentAllocationId", "00000000-0000-0000-0000-000000000000");

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it("POST /api/payment-receipts with csrf but without login should return 401", async () => {
    const agent = request.agent(app);

    const csrfResponse = await agent.get("/api/csrf-token");
    const csrfToken = csrfResponse.body.data.csrfToken;

    const response = await agent
      .post("/api/payment-receipts")
      .set("x-csrf-token", csrfToken)
      .field("paymentAllocationId", "00000000-0000-0000-0000-000000000000");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
