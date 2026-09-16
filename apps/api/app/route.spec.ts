import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /", () => {
  it("responde 200 com JSON hello world", async () => {
    const res = GET();

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    await expect(res.json()).resolves.toEqual({ message: "Hello World" });
  });
});
