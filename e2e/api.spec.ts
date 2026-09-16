import { expect, test } from "@playwright/test";

test("API GET / retorna JSON de hello world", async ({ request }) => {
  const res = await request.get("http://localhost:3002/");

  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("application/json");
  expect(await res.json()).toEqual({ message: "Hello World" });
});
