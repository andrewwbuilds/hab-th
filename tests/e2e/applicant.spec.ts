import { expect, test, type Page } from "@playwright/test";
import { HACKER_ANSWERS, PASSWORD, uniqueEmail } from "./helpers";

async function buildRoadie(page: Page): Promise<void> {
  await page.goto("/app/roadie");
  await expect(page.getByRole("heading", { name: "What do you listen to?" })).toBeVisible();
  await page.getByRole("button", { name: "Indie" }).click();
  await page.getByRole("button", { name: "Electronic" }).click();
  const next = page.getByRole("button", { name: "Next", exact: true });
  await next.click();

  await expect(page.getByRole("heading", { name: "How hard does it go?" })).toBeVisible();
  await page.getByRole("radiogroup", { name: "Energy" }).getByText("4", { exact: true }).click();
  await next.click();

  await expect(page.getByRole("heading", { name: "Where does it sit emotionally?" })).toBeVisible();
  await page.getByRole("radiogroup", { name: "Mood" }).getByText("4", { exact: true }).click();
  await next.click();

  await expect(page.getByRole("heading", { name: "Which era sounds like home?" })).toBeVisible();
  await page.getByText("2010s", { exact: true }).click();
  await next.click();

  await expect(page.getByRole("heading", { name: "How much do you listen in a day?" })).toBeVisible();
  await page.getByText("3 to 6 hours", { exact: true }).click();
  await next.click();

  await expect(page.getByRole("heading", { name: "How do you find new music?" })).toBeVisible();
  await page.getByText("Friends", { exact: true }).click();
  await next.click();

  await expect(page.getByRole("heading", { name: "Who is on repeat?" })).toBeVisible();
  await page.getByLabel("Top artist").fill("Phoebe Bridgers");
  await page.getByLabel("Anthem").fill("Motion Sickness");
  await next.click();

  await expect(page.getByRole("heading", { name: "Meet your Roadie" })).toBeVisible();
  const nameInput = page.getByLabel("Name", { exact: true });
  await expect(nameInput).not.toHaveValue("");
  await page.getByRole("button", { name: "Hatch my Roadie" }).click();

  await expect(page.getByRole("link", { name: "Go home" })).toBeEnabled();
}

test("a new applicant builds a Roadie and submits a hacker application", async ({ page }) => {
  const email = uniqueEmail("hacker");

  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill("Encore Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { name: "Build your Roadie first" })).toBeVisible();

  await buildRoadie(page);

  await page.getByRole("link", { name: "Go home" }).click();
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
