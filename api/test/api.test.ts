import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

const app = createApp();

describe("MailMood API", () => {
  it("GET /health returns service metadata", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.privacy).toBe("process-and-forget");
  });

  it("POST /analyze returns analysis object", async () => {
    const response = await request(app)
      .post("/analyze")
      .send({ text: "Please respond ASAP. This is urgent.", mode: "incoming" });

    expect(response.status).toBe(200);
    expect(response.body.toneLabel).toBeTypeOf("string");
    expect(response.body.confidence).toBeTypeOf("number");
    expect(Array.isArray(response.body.emotions)).toBe(true);
  });

  it("POST /rewrite returns rewritten text", async () => {
    const response = await request(app)
      .post("/rewrite")
      .send({ text: "I need this now, you must fix it ASAP.", targetTone: "calm_professional" });

    expect(response.status).toBe(200);
    expect(response.body.rewritten).toBeTypeOf("string");
    expect(response.body.rewritten.toLowerCase()).toContain("as soon as possible");
  });

  it("validates empty payload", async () => {
    const response = await request(app).post("/analyze").send({ text: "" });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("text is required");
  });
});
