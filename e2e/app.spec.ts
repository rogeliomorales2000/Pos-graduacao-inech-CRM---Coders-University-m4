import { expect, test } from "@playwright/test";

test("cliente renderiza o título Intech CRM", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Intech CRM" })).toBeVisible();
});
