import { expect, test } from "@playwright/test";

test("visitante sem sessão é redirecionado para /auth/sign-in", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});
