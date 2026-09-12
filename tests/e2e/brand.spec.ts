import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"] as const) {
  test(`uses the ${theme} app brand when the system theme differs`, async ({ page }, info) => {
    await page.setExtraHTTPHeaders({
      "X-Snail-Test-Identity": `test-brand-${info.project.name}-${theme}`,
    });
    await page.emulateMedia({ colorScheme: theme === "light" ? "dark" : "light" });
    await page.addInitScript((selected) => localStorage.setItem("theme", selected), theme);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "全部视频", exact: true }).last()).toBeVisible();
    if (info.project.name === "mobile")
      await page.getByRole("button", { name: "打开导航" }).click();
    const mark = page.locator(".snail-brand img[data-brand-mark]:visible");
    await expect(mark).toHaveAttribute("src", `/brand/mark-${theme}.svg`);
    expect(
      await mark.evaluate((img) => ({
        width: img.getBoundingClientRect().width,
        ratio: img.getBoundingClientRect().width / img.getBoundingClientRect().height,
        background: getComputedStyle(img).backgroundColor,
        radius: getComputedStyle(img).borderRadius,
      })),
    ).toEqual({ width: 24, ratio: 1, background: "rgba(0, 0, 0, 0)", radius: "0px" });
    const word = page.locator(".snail-brand img[alt=Snail]:visible");
    await expect(word).toHaveAttribute("src", `/brand/wordmark-${theme}.svg`);
    expect(await word.evaluate((img) => img.getBoundingClientRect().width)).toBeGreaterThanOrEqual(
      72,
    );
    expect(await page.locator('[data-brand="provisional"]').count()).toBe(0);
    if (info.project.name === "desktop") {
      const caption = await page.locator(".brand-caption").boundingBox();
      const brand = await page.locator(".snail-brand").boundingBox();
      expect(caption && brand && caption.y >= brand.y + brand.height).toBe(true);
    }
    expect(
      await page.locator(".header-wordmark").evaluate((el) => getComputedStyle(el).opacity),
    ).toBe("1");
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/brand/favicon.svg");
    await page.screenshot({
      path: `.artifacts/brand-${info.project.name}-${theme}.png`,
      fullPage: true,
    });
  });
}
