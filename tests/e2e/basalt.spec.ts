import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"] as const) {
  test(`keeps Basalt surfaces and responsive frame in ${theme} mode`, async ({ page }, info) => {
    await page.setExtraHTTPHeaders({
      "X-Snail-Test-Identity": `test-basalt-${info.project.name}-${theme}`,
    });
    await page.emulateMedia({ colorScheme: theme === "light" ? "dark" : "light" });
    await page.addInitScript((selected) => localStorage.setItem("theme", selected), theme);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "全部视频", exact: true }).last()).toBeVisible();

    const surface = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const main = document.querySelector("main");
      const island = document.querySelector("[data-basalt-surface-root]");
      const header = document.querySelector("main > header");
      if (!main?.parentElement || !island || !header) throw new Error("frame_missing");
      return {
        backgroundToken: root.getPropertyValue("--basalt-background").trim(),
        foregroundToken: root.getPropertyValue("--basalt-foreground").trim(),
        bodyBackground: getComputedStyle(document.body).backgroundColor,
        shellBackground: getComputedStyle(main.parentElement).backgroundColor,
        shellDisplay: getComputedStyle(main.parentElement).display,
        mainLeft: main.getBoundingClientRect().left,
        headerHeight: header.getBoundingClientRect().height,
        islandPadding: getComputedStyle(island).paddingTop,
        islandScroll: getComputedStyle(island).overflowY,
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      };
    });
    // These are the public 2.1.7 palette defaults, owned by Basalt in both themes.
    expect(surface.backgroundToken).toBe(theme === "light" ? "220 14% 94%" : "0 0% 9%");
    expect(surface.foregroundToken).toBe(theme === "light" ? "0 0% 12%" : "0 0% 93%");
    expect(surface.shellBackground).toBe(surface.bodyBackground);
    expect(surface.shellDisplay).toBe("flex");
    expect(surface.headerHeight).toBe(56);
    expect(surface.mainLeft).toBe(info.project.name === "mobile" ? 0 : 260);
    expect(surface.islandPadding).toBe(info.project.name === "mobile" ? "12px" : "20px");
    expect(surface.islandScroll).toBe("auto");
    expect(surface.horizontalOverflow).toBe(false);

    const input = page.getByPlaceholder("搜索标题、笔记或标签…");
    await input.focus();
    await expect(input).toBeFocused();
    await page.getByRole("button", { name: "切换外观" }).click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-mode",
      theme === "light" ? "dark" : "light",
    );
  });
}
