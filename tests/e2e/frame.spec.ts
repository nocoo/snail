import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"] as const) {
  test(`Basalt frame preserves geometry and navigation in ${theme}`, async ({ page }, info) => {
    await page.setExtraHTTPHeaders({
      "X-Snail-Test-Identity": `test-frame-${info.project.name}-${theme}`,
    });
    await page.addInitScript((mode) => localStorage.setItem("theme", mode), theme);
    await page.goto("/connect");
    await expect(page.getByRole("heading", { name: "连接本机", exact: true }).last()).toBeVisible();
    await expect(page.getByRole("link", { name: "打开本机连接指南", exact: true })).toHaveAttribute(
      "href",
      "https://github.com/nocoo/snail/blob/main/docs/13-Connector安装与协议.md",
    );
    const header = page.locator("main > header");
    await page.screenshot({
      animations: "disabled",
      path: `.artifacts/frame-${info.project.name}-${theme}.png`,
    });
    await expect(header.getByRole("link", { name: "GitHub 仓库" })).toHaveAttribute(
      "href",
      "https://github.com/nocoo/snail",
    );
    await expect(header.getByRole("img", { name: "Snail", exact: true })).toHaveCount(0);
    await expect(header.getByRole("link", { name: "资料库", exact: true })).toHaveAttribute(
      "href",
      "/",
    );
    await expect(header.getByRole("link", { name: "连接本机", exact: true })).toHaveCount(0);
    expect(await header.evaluate((element) => element.getBoundingClientRect().height)).toBe(56);

    const menu = page.getByRole("button", { name: "打开导航", exact: true });
    if (info.project.name === "mobile") await menu.click();
    const sidebar = page.getByRole("complementary");
    await expect(sidebar).toBeVisible();
    expect(await sidebar.evaluate((element) => element.getBoundingClientRect().width)).toBe(260);
    const mark = sidebar.locator("img[data-brand-mark]:visible");
    const before = await mark.boundingBox();
    expect(before?.y).toBe(16);
    const firstItem = sidebar.getByRole("button", { name: "全部视频", exact: true });
    expect(await firstItem.evaluate((element) => getComputedStyle(element).fontSize)).toBe("14px");
    await expect(sidebar.getByRole("link", { name: "退出登录", exact: true })).toBeVisible();

    if (info.project.name === "desktop") {
      const positions = page.evaluate(async () => {
        const values: { x: number; y: number }[] = [];
        const started = performance.now();
        while (performance.now() - started < 600) {
          await new Promise(requestAnimationFrame);
          const mark = [...document.querySelectorAll("aside img[data-brand-mark]")].find(
            (element) => element.getBoundingClientRect().width > 0,
          );
          if (mark) {
            const { x, y } = mark.getBoundingClientRect();
            values.push({ x, y });
          }
        }
        return values;
      });
      await sidebar.getByRole("button", { name: "折叠侧栏", exact: true }).click();
      await expect
        .poll(() => sidebar.evaluate((element) => element.getBoundingClientRect().width))
        .toBe(68);
      for (const position of await positions) {
        expect(position.x).toBe(before?.x);
        expect(position.y).toBe(before?.y);
      }
      await expect(sidebar.getByRole("button", { name: "连接本机", exact: true })).toHaveAttribute(
        "aria-current",
        "page",
      );
      await sidebar.getByRole("button", { name: "整理与设置", exact: true }).click();
      await expect(
        page.getByRole("heading", { name: "整理与设置", exact: true }).last(),
      ).toBeVisible();
      await sidebar.getByRole("button", { name: "展开侧栏", exact: true }).click();
      await expect
        .poll(() => sidebar.evaluate((element) => element.getBoundingClientRect().width))
        .toBe(260);
      expect(await mark.boundingBox()).toEqual(before);
    } else {
      expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe("hidden");
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(menu).toBeFocused();
      await menu.click();
      await sidebar.getByRole("button", { name: "整理与设置", exact: true }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(menu).toBeFocused();
      await expect(
        page.getByRole("heading", { name: "整理与设置", exact: true }).last(),
      ).toBeVisible();
    }
    await page.evaluate(() => {
      Reflect.set(window, "snailNavigationSentinel", true);
    });
    await header.getByRole("link", { name: "资料库", exact: true }).click();
    await expect(page.getByRole("heading", { name: "全部视频", exact: true }).last()).toBeVisible();
    expect(await page.evaluate(() => Reflect.get(window, "snailNavigationSentinel"))).toBe(true);
    await expect(page.getByText("好片段，慢慢收藏。", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      animations: "disabled",
      path: `.artifacts/frame-${info.project.name}-${theme}.png`,
    });
  });
}

test("public filters support keyboard selection and consent stays explicit", async ({
  page,
}, info) => {
  await page.setExtraHTTPHeaders({ "X-Snail-Test-Identity": `test-controls-${info.project.name}` });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "全部视频", exact: true }).last()).toBeVisible();
  const filter = page.getByRole("combobox", { name: "筛选分类", exact: true });
  await filter.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.getByRole("option", { name: "未分类", exact: true }).click();
  await expect(filter).toHaveText("未分类");
  await expect(filter).toBeFocused();
  await filter.click();
  await page.getByRole("option", { name: "所有分类", exact: true }).click();
  await expect(filter).toHaveText("所有分类");
  const importButton = page.getByRole("button", { name: "收藏链接", exact: true });
  await importButton.click();
  const dialog = page.getByRole("dialog");
  const submit = dialog.getByRole("button", { name: "加入导入队列", exact: true });
  await dialog.getByLabel("X 帖子链接").fill("https://x.com/example/status/123456789");
  await expect(submit).toBeDisabled();
  const consent = dialog.getByRole("checkbox", {
    name: "我拥有或已获准保存这条视频。",
    exact: true,
  });
  await expect
    .poll(async () => {
      const input = await dialog.getByLabel("X 帖子链接").boundingBox();
      const checkbox = await consent.boundingBox();
      return input && checkbox ? checkbox.y - input.y - input.height : 0;
    })
    .toBeGreaterThanOrEqual(16);
  await consent.focus();
  await page.keyboard.press("Space");
  await expect(consent).toBeChecked();
  await expect(submit).toBeEnabled();
  await page.keyboard.press("Space");
  await expect(submit).toBeDisabled();
  await page.screenshot({
    animations: "disabled",
    path: `.artifacts/S19-import-${info.project.name}.png`,
  });
  await dialog.getByRole("button", { name: "取消", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(importButton).toBeFocused();
});

test("long category menus stay inside the viewport and scroll to the last option", async ({
  page,
}, info) => {
  await page.setExtraHTTPHeaders({
    "X-Snail-Test-Identity": `test-many-options-${info.project.name}`,
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "全部视频", exact: true }).last()).toBeVisible();
  await page.evaluate(async () => {
    for (let index = 0; index < 45; index++) {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Snail-Request": "1" },
        body: JSON.stringify({ name: `Category ${String(index).padStart(2, "0")}` }),
      });
      if (!response.ok) throw new Error(`category_setup_${response.status}`);
    }
  });
  await page.reload();
  const select = page.getByRole("combobox", { name: "筛选分类", exact: true });
  await select.click();
  const list = page.getByRole("listbox");
  await expect(list).toBeVisible();
  const bounds = await list.boundingBox();
  const viewport = page.viewportSize();
  if (!bounds || !viewport) throw new Error("missing_menu_geometry");
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
  const last = page.getByRole("option", { name: "Category 44", exact: true });
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeInViewport();
  await last.click();
  await expect(select).toHaveText("Category 44");
  await expect(select).toBeFocused();
});
