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
    await expect(page.getByText("好片段，慢慢收藏。", { exact: true })).toBeVisible();
    if (info.project.name === "mobile")
      await page.getByRole("button", { name: "打开导航" }).click();
    const mark = page.locator(".snail-brand img[data-brand-mark]:visible");
    await expect(mark).toHaveAttribute("src", "/brand/mark-48.png");
    await expect.poll(() => mark.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(48);
    expect(
      await mark.evaluate((img) => ({
        width: img.getBoundingClientRect().width,
        ratio: img.getBoundingClientRect().width / img.getBoundingClientRect().height,
        background: getComputedStyle(img).backgroundColor,
        radius: getComputedStyle(img).borderRadius,
        filter: getComputedStyle(img).filter,
        shadow: getComputedStyle(img).boxShadow,
      })),
    ).toEqual({
      width: 24,
      ratio: 1,
      background: "rgba(0, 0, 0, 0)",
      radius: "0px",
      filter: "none",
      shadow: "none",
    });
    const word = page.locator(".snail-brand img[alt=Snail]:visible");
    await expect(word).toHaveAttribute("src", `/brand/wordmark-${theme}.svg`);
    expect(await word.evaluate((img) => img.getBoundingClientRect().width)).toBeGreaterThanOrEqual(
      72,
    );
    expect(await page.locator('[data-brand="provisional"]').count()).toBe(0);
    expect((await mark.boundingBox())?.y).toBe(16);
    await expect(page.locator("main > header img[alt=Snail]")).toHaveCount(0);
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/brand/favicon.ico");
    await page.screenshot({
      animations: "disabled",
      path: `.artifacts/brand-${info.project.name}-${theme}.png`,
      fullPage: true,
    });
  });

  test(`loading and expired-session login use the new brand in ${theme}`, async ({
    page,
  }, info) => {
    await page.addInitScript((selected) => localStorage.setItem("theme", selected), theme);
    let release = () => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/me", async (route) => {
      await pending;
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "authentication_required" } }),
      });
    });
    try {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      const mark = page.locator("img[data-brand-mark]");
      await expect(mark).toHaveAttribute("src", "/brand/mark-64.png");
      await expect.poll(() => mark.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(64);
      await expect(
        page.getByRole("status", { name: "正在打开 Snail…", exact: true }),
      ).toBeVisible();
      await page.screenshot({
        animations: "disabled",
        path: `.artifacts/brand-loading-${info.project.name}-${theme}.png`,
      });
      release();
      await expect(page.getByRole("heading", { name: "你的私人视频库" })).toBeVisible();
      await expect(mark).toHaveAttribute("src", "/brand/mark-128.png");
      await expect.poll(() => mark.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(128);
      await expect(page.getByRole("link", { name: "登录 Snail", exact: true })).toHaveAttribute(
        "href",
        "/cdn-cgi/access/login?redirect_url=%2F",
      );
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        animations: "disabled",
        path: `.artifacts/brand-login-${info.project.name}-${theme}.png`,
      });
    } finally {
      release();
    }
  });
}
