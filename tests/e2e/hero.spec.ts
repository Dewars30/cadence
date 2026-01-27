import { test, expect } from "@playwright/test";

test("hero loop export", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Cadence MVP")).toBeVisible();

  await page.getByRole("button", { name: "New Artifact" }).click();

  await expect(page.getByRole("button", { name: "Start Run" })).toBeVisible();
  await page.getByRole("button", { name: "Start Run" }).click();

  const approve = page.getByRole("button", { name: "Approve Phase" });
  await approve.click();
  await approve.click();
  await approve.click();

  await expect(page.getByText("Production")).toBeVisible();

  await page.getByRole("button", { name: /Checkpoint/ }).click();
  await expect(page.getByText("V1")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export DOCX" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).not.toBeNull();
  expect(download.suggestedFilename()).toMatch(/\\.docx$/);
});
