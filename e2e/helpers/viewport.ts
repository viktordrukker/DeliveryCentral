import { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export const VIEWPORT_SIZES = [
  { height: 720, label: '1280×720 (HD)', width: 1280 },
  { height: 1080, label: '1920×1080 (Full HD)', width: 1920 },
  { height: 1440, label: '2560×1440 (QHD)', width: 2560 },
  { height: 2160, label: '3840×2160 (4K)', width: 3840 },
] as const;

/**
 * Assert that the page body does not require vertical scroll at the current viewport.
 * Allows a 5px tolerance for sub-pixel rounding differences.
 */
export async function assertNoBodyScroll(page: Page, label: string): Promise<void> {
  const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const innerHeight = await page.evaluate(() => window.innerHeight);

  expect(scrollHeight, `${label}: page should not scroll (scrollHeight=${scrollHeight}, innerHeight=${innerHeight})`).toBeLessThanOrEqual(innerHeight + 5);
}
