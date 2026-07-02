import path from "node:path";
import { expect, test } from "@playwright/test";
import { signInWithEmulator } from "./helpers/auth";

const JPEG_FIXTURE = path.join(process.cwd(), "e2e", "fixtures", "test-plant.jpg");
const HEIC_FIXTURE = path.join(process.cwd(), "e2e", "fixtures", "test-plant.heic");

test.describe.configure({ mode: "serial" });

test("golden path: sign in, add a plant, log and delete care, diagnose, delete plant", async ({
  page,
  context,
}) => {
  await test.step("sign in", async () => {
    await signInWithEmulator(page, context, "golden-path@example.com");
    await expect(page.getByRole("heading", { name: "Your plants" })).toBeVisible();
    await expect(page.getByText("No plants yet. Add your first one!")).toBeVisible();
  });

  await test.step("add a plant via photo identification", async () => {
    await page.getByRole("link", { name: "Add plant" }).click();
    await page.setInputFiles("#photo-upload", JPEG_FIXTURE);
    await expect(page.getByRole("button", { name: "Save plant" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByLabel("Common name")).toHaveValue("Fiddle Leaf Fig");
    await page.getByRole("button", { name: "Save plant" }).click();
    await page.waitForURL("**/plants/*");
    await expect(page.getByRole("heading", { name: "Fiddle Leaf Fig" })).toBeVisible();
  });

  await test.step("log a care event", async () => {
    await expect(page.getByText("No care events logged yet.")).toBeVisible();
    await page.getByRole("button", { name: "Water" }).click();
    await expect(page.getByText("Watered")).toBeVisible();
  });

  await test.step("delete the care event", async () => {
    await page.getByRole("button", { name: /delete watered event/i }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("No care events logged yet.")).toBeVisible();
  });

  await test.step("diagnose an issue", async () => {
    await page.setInputFiles("#photo-upload", JPEG_FIXTURE);
    await expect(page.getByText("E2E mock fixture — not a real diagnosis.")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/Urgency: medium/)).toBeVisible();
  });

  await test.step("delete the plant", async () => {
    await page.getByRole("button", { name: "Delete plant" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await page.waitForURL("**/dashboard");
    await expect(page.getByText("No plants yet. Add your first one!")).toBeVisible();
  });
});

test("HEIC photos are converted and identified like any other photo", async ({ page, context }) => {
  await signInWithEmulator(page, context, "heic-upload@example.com");
  await page.getByRole("link", { name: "Add plant" }).click();

  await page.setInputFiles("#photo-upload", HEIC_FIXTURE);
  await expect(page.getByRole("button", { name: "Save plant" })).toBeVisible({ timeout: 20000 });
  await expect(page.getByLabel("Common name")).toHaveValue("Fiddle Leaf Fig");
});
