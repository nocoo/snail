import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }, info) => {
  await page.setExtraHTTPHeaders({
    "X-Snail-Test-Identity": `test-${info.project.name}-${info.testId}-${info.retry}`,
  });
});

test("upload, organize, search and play a synthetic video on every layout", async ({
  page,
}, testInfo) => {
  const title = `Synthetic ${testInfo.project.name}`;
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "全部视频", exact: true }).last()).toBeVisible();
  await page.getByLabel("上传视频文件").setInputFiles(resolve(".artifacts/media/synthetic.mp4"));
  await expect(page.getByText("已保存", { exact: true }).first()).toBeVisible({ timeout: 45_000 });
  const card = page.locator("[data-asset-card]").first();
  await card.getByRole("button", { name: "播放视频" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("video")).toBeVisible();
  await expect
    .poll(() => dialog.locator("video").evaluate((video: HTMLVideoElement) => video.readyState))
    .toBeGreaterThanOrEqual(1);
  await dialog.getByLabel("标题", { exact: true }).fill(title);
  await dialog.getByLabel("笔记").fill("City lights reference");
  await dialog.getByRole("button", { name: "保存修改" }).click();
  await dialog.getByRole("button", { name: "关闭预览" }).click();
  await page.getByPlaceholder("搜索标题、笔记或标签…").fill(title);
  await expect(page.locator("[data-asset-card]")).toHaveCount(1);
  await page.locator("[data-asset-card]").getByRole("button", { name: "加入收藏" }).click();
  for (const layout of ["列表", "瀑布", "影院", "网格"]) {
    await page.getByRole("button", { name: `${layout}布局`, exact: true }).click();
    await expect(page.locator("[data-layout]")).toHaveAttribute(
      "data-layout",
      ({ 列表: "list", 瀑布: "masonry", 影院: "cinema", 网格: "grid" } as Record<string, string>)[
        layout
      ],
    );
  }
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
  await page.screenshot({
    path: `.artifacts/${testInfo.project.name}-library.png`,
    fullPage: true,
  });
});

test("manage taxonomy and inspect the device pairing screen", async ({ page }, testInfo) => {
  await page.goto("/settings");
  await page.getByLabel("新分类名称").fill(`Travel ${testInfo.project.name}`);
  await page.getByRole("button", { name: "创建分类", exact: true }).click();
  await expect(
    page.locator(".taxonomy-row").getByText(`Travel ${testInfo.project.name}`, { exact: true }),
  ).toBeVisible();
  await page.getByLabel("新标签名称").fill(`Motion ${testInfo.project.name}`);
  await page.getByRole("button", { name: "创建标签", exact: true }).click();
  await expect(
    page.locator(".taxonomy-row").getByText(`Motion ${testInfo.project.name}`, { exact: true }),
  ).toBeVisible();
  await page.goto("/connect");
  await expect(page.getByRole("heading", { name: "连接本机", exact: true }).last()).toBeVisible();
  await expect(page.getByLabel("设备配对码")).toBeVisible();
  await expect(page.getByText("X 登录态只留在本机", { exact: false })).toBeVisible();
  await page.getByLabel("设备配对码").fill("0000-0000");
  await page.getByRole("button", { name: "查看设备", exact: true }).click();
  await expect(page.locator(".pair-card").getByRole("status")).toBeVisible();
});
