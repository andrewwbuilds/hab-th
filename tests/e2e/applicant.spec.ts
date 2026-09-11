import { expect, test, type Page } from "@playwright/test";
import { HACKER_ANSWERS, PASSWORD, uniqueEmail } from "./helpers";

async function chooseGuide(page: Page): Promise<void> {
  await page.goto("/app/roadie");
  await expect(page.getByRole("heading", { name: "Who’s coming with you?" })).toBeVisible();
  await page.getByRole("button", { name: /^Gary/ }).click();
  await expect(page.getByLabel("Guide’s name")).toHaveValue("Gary");
  await page.getByRole("button", { name: "Save my guide" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Gary is ready!" })).toBeVisible();
}

test("a new applicant builds a Roadie and submits a hacker application", async ({ page }) => {
  const email = uniqueEmail("hacker");

  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill("Encore Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { name: "Choose your guide first" })).toBeVisible();

  await chooseGuide(page);

  await page.getByRole("link", { name: "Continue to your applications" }).click();
  await expect(page).toHaveURL(/\/app$/);
  const dock = page.locator("[data-roadie-dock]");
  await expect(dock).toBeVisible();
  await expect(dock.locator("[aria-live]")).not.toHaveText("");

  await page.goto("/app/apply/hacker");
  await expect(page.getByRole("heading", { name: "Hacker application" })).toBeVisible();

  await page.locator("#field-school").fill(HACKER_ANSWERS.school);
  await page.locator("#field-graduation_year").fill(String(HACKER_ANSWERS.graduation_year));
  await page.locator("#field-shirt_size").selectOption(HACKER_ANSWERS.shirt_size);
  await page.locator("#field-experience_level").selectOption(HACKER_ANSWERS.experience_level);
  await page.locator("#field-skills").getByRole("button", { name: "Frontend" }).click();
  await page.locator("#field-skills").getByRole("button", { name: "Backend" }).click();
  await page.locator("#field-proud_project").fill(HACKER_ANSWERS.proud_project);
  await page.locator("#field-build_idea").fill(HACKER_ANSWERS.build_idea);
  await page.locator("#field-team_status").selectOption(HACKER_ANSWERS.team_status);
  await page.locator("#field-why_encore").fill(HACKER_ANSWERS.why_encore);

  await expect(page.getByText("Every required answer is in. Submit when you are ready.")).toBeVisible();
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status").filter({ hasText: /^Saved$/ }).first()).toBeVisible();

  await page.getByRole("button", { name: "Submit application" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Submit this application?" })).toBeVisible();
  await dialog.getByRole("button", { name: "Submit application" }).click();

  await expect(page).toHaveURL(/\/app\/status\/hacker$/);
  await expect(page.locator("header").getByText("Submitted", { exact: true })).toBeVisible();
});
