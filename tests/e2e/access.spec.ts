import { expect, test } from "@playwright/test";
import { createApplicant, ORGANIZER_EMAIL, ORGANIZER_PASSWORD, PASSWORD, signIn } from "./helpers";

test("an applicant who opens /org lands on /app", async ({ page }) => {
  const applicant = await createApplicant("Access Applicant");
  await signIn(page, applicant.email, PASSWORD);
  await page.goto("/org");
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
});

test("an organizer who opens /app lands on /org", async ({ page }) => {
  await signIn(page, ORGANIZER_EMAIL, ORGANIZER_PASSWORD);
  await page.goto("/app");
  await expect(page).toHaveURL(/\/org$/);
});

test("a signed-out visit to /app goes to sign-in with a next path", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/sign-in\?next=/);
  expect(new URL(page.url()).searchParams.get("next")).toBe("/app");
});
