import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import next from "next";
import request from "supertest";

describe("API GET / (supertest)", () => {
  let server: Server;

  beforeAll(async () => {
    const app = next({ dev: true });
    const handle = app.getRequestHandler();
    await app.prepare();

    server = createServer((req, res) => {
      void handle(req, res);
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
  }, 60_000);

  afterAll(() => {
    server?.close();
  });

  it("responde 200 com JSON hello world sobre HTTP real", async () => {
    const res = await request(server).get("/");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/json");
    expect(res.body).toEqual({ message: "Hello World" });
  });
});
