import { expect, test, type Page } from "@playwright/test";
import { HACKER_ANSWERS, PASSWORD, uniqueEmail } from "./helpers";

async function createAccount(page: Page, email: string): Promise<void> {
  await page.getByLabel("Full name").fill("Encore Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
}

async function signUp(page: Page, email: string, track?: string): Promise<void> {
  await page.goto("/sign-up");
  if (track) {
    await page.getByText(track, { exact: true }).click();
    await expect(page.getByRole("radio", { name: new RegExp(`^${track}`) })).toBeChecked();
  }
  await createAccount(page, email);
}

async function chooseGuide(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { name: "Who’s coming with you?" })).toBeVisible();
  await page.getByRole("button", { name: /^Gary/ }).click();
  await expect(page.getByLabel("Guide’s name")).toHaveValue("Gary");
  await page.getByRole("button", { name: "Save my guide" }).click();
}

test("signing up as a judge lands on the judge form", async ({ page }) => {
  await signUp(page, uniqueEmail("judge"), "Judge");
  await expect(page).toHaveURL(/\/app\/apply\/judge$/);
  await expect(page.getByRole("heading", { name: "Judge application" })).toBeVisible();
});

test("the landing role card preselects the track on sign-up", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /^Judge/ }).click();
  await expect(page).toHaveURL(/\/sign-up\?track=judge$/);
  await expect(page.getByRole("radio", { name: /^Judge/ })).toBeChecked();
  await createAccount(page, uniqueEmail("landing-judge"));
  await expect(page).toHaveURL(/\/app\/apply\/judge$/);
});

test("a new applicant lands on the hacker form, picks a guide, and submits", async ({ page }) => {
  const email = uniqueEmail("hacker");

  await signUp(page, email);
  await expect(page).toHaveURL(/\/app\/apply\/hacker$/);
  await expect(page.getByRole("heading", { name: "Hacker application" })).toBeVisible();

  await page.getByRole("link", { name: "Choose a guide" }).click();
  await expect(page).toHaveURL(/\/app\/roadie\?next=/);
  await chooseGuide(page);
  await expect(page).toHaveURL(/\/app\/apply\/hacker$/);
  await expect(page.getByRole("link", { name: "Choose a guide" })).toHaveCount(0);
  const dock = page.locator("[data-roadie-dock]");
  await expect(dock).toBeVisible();
  await expect(dock.locator("[aria-live]")).not.toHaveText("");

  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "Choose your guide" })).toHaveCount(0);

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
