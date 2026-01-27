import { test, expect } from "@playwright/test";

test("hero loop export", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Cadence MVP")).toBeVisible();
  await expect(page.getByText("Ready")).toBeVisible();

  await page.getByRole("button", { name: "New Artifact" }).dispatchEvent("click");

  const startRunButton = page.getByRole("button", { name: "Start Run" });
  await startRunButton.waitFor({ state: "visible" });
  await startRunButton.click();

  const approve = page.getByRole("button", { name: "Approve Phase" });
  await approve.click();
  await approve.click();
  await approve.click();

  await expect(page.getByText("Production", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /Checkpoint/ }).click();
  await expect(page.getByText("V1", { exact: true })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export DOCX" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).not.toBeNull();
  expect(download.suggestedFilename()).toMatch(/\.docx$/);
});
