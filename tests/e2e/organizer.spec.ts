import { expect, test } from "@playwright/test";
import {
  createApplicant,
  createSubmittedHackerApplication,
  ORGANIZER_EMAIL,
  ORGANIZER_PASSWORD,
  signIn,
} from "./helpers";

test("an organizer reviews a submitted application and accepts it", async ({ page }) => {
  const applicant = await createApplicant("Review Target");
  await createSubmittedHackerApplication(applicant.id);

  await signIn(page, ORGANIZER_EMAIL, ORGANIZER_PASSWORD);
  await expect(page).toHaveURL(/\/org$/);

  await page.goto(`/org/applications?status=submitted&q=${encodeURIComponent(applicant.email)}`);
  const rows = page.getByRole("row").filter({ hasText: applicant.email });
  await expect(rows.first()).toBeVisible();
  await rows.first().getByRole("link", { name: /Review Target/ }).click();

  await expect(page).toHaveURL(/\/org\/applications\/[0-9a-f-]+/);
  await expect(page.getByRole("heading", { name: "Review Target" })).toBeVisible();

  await page.getByRole("button", { name: "Start review" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Marked as under review" })).toBeVisible();
  await expect(page.getByLabel("Status", { exact: true })).toHaveValue("under_review");

  for (const criterion of ["Technical depth", "Motivation", "Collaboration"]) {
    await page.getByRole("radiogroup", { name: criterion }).getByRole("radio", { name: "4 of 5" }).click();
  }
  await page.getByRole("radiogroup", { name: "Overall" }).getByRole("radio", { name: "5 of 5" }).click();
  await page.getByLabel("Notes").fill("Clear project story, would pair well with a designer.");
  await page.getByRole("button", { name: "Save review" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Review saved" })).toBeVisible();

  await page.getByRole("button", { name: "Accept", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Accept Review Target?" })).toBeVisible();
  await dialog.getByRole("button", { name: "Set decision" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Marked as accepted" })).toBeVisible();
  await expect(page.locator("header").getByText("Accepted", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Status", { exact: true })).toHaveValue("accepted");
});
