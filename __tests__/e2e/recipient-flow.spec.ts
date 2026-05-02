import { test, expect } from "@playwright/test";

// Recipient flow E2E — verifies STATE MACHINE only.
// Audio audibility cannot be tested in headless Playwright.
// Real-device manual testing is the gate for actual audio behavior.

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

// This test assumes a clip with slug "test-clip" exists (seeded for E2E).
// In CI: set up a real KV entry before running; or mock at the edge.
test.describe("Recipient clip page", () => {
  test("renders album art and play button", async ({ page }) => {
    await page.goto(`${BASE_URL}/c/test-clip`);
    // Page should show album art
    await expect(page.locator("img[alt]").first()).toBeVisible();
    // Play button (or spinner while prefetching)
    const playBtn = page.getByRole("button", { name: /play/i });
    await expect(playBtn).toBeVisible({ timeout: 5000 });
  });

  test("play button transitions to playing state on click", async ({ page }) => {
    await page.goto(`${BASE_URL}/c/test-clip`);
    // Wait for ready state (button enabled)
    const playBtn = page.getByRole("button", { name: /play/i });
    await expect(playBtn).toBeEnabled({ timeout: 8000 });
    await playBtn.click();
    // After click, button should either start playing (shows EQ bars) or show spinner
    // We look for the "looping" text or EQ animation
    await expect(page.getByText(/looping/i)).toBeVisible({ timeout: 3000 });
  });

  test("shows 404 page for unknown slug", async ({ page }) => {
    const res = await page.goto(`${BASE_URL}/c/this-slug-does-not-exist-xyz`);
    expect(res?.status()).toBe(404);
  });

  test("home page renders search input", async ({ page }) => {
    await page.goto(BASE_URL);
    const input = page.getByPlaceholder(/search for a song/i);
    await expect(input).toBeVisible();
  });
});
