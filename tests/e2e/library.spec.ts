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
  await page.getByRole("button", { name: "收起已完成传输", exact: true }).click();
  const card = page.locator("[data-asset-card]").first();
  await expect(card).toBeVisible();
  const surfaces = await card.evaluate((element) => {
    const island = element.closest("[data-basalt-surface-root]");
    if (!island) throw new Error("missing_content_island");
    return {
      island: getComputedStyle(island).backgroundColor,
      card: getComputedStyle(element).backgroundColor,
    };
  });
  expect(surfaces.card).not.toBe(surfaces.island);
  await card.getByRole("button", { name: "播放视频" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("video")).toBeVisible();
  await expect
    .poll(() => dialog.locator("video").evaluate((video: HTMLVideoElement) => video.readyState))
    .toBeGreaterThanOrEqual(1);
  await expect
    .poll(async () => {
      const description = await dialog
        .getByText("收藏里的每一个片刻", { exact: true })
        .boundingBox();
      const video = await dialog.locator("video").boundingBox();
      return description && video ? video.y - description.y - description.height : 0;
    })
    .toBeGreaterThanOrEqual(16);
  await dialog.getByLabel("标题", { exact: true }).fill(title);
  await dialog.getByLabel("笔记").fill("City lights reference");
  await page.screenshot({
    animations: "disabled",
    path: `.artifacts/S19-preview-${testInfo.project.name}.png`,
  });
  await dialog.getByRole("button", { name: "保存修改" }).click();
  await expect(dialog.getByRole("status").getByText("修改已保存")).toBeVisible();
  await dialog.getByLabel("笔记").fill("Updated city lights reference");
  await expect(dialog.getByRole("status")).toBeEmpty();
  await dialog.getByRole("button", { name: "保存修改" }).click();
  await expect(dialog.getByRole("status").getByText("修改已保存")).toBeVisible();
  await dialog.getByRole("button", { name: "关闭预览" }).click();
  await expect(card.getByRole("button", { name: "播放视频" })).toBeFocused();
  await page.getByPlaceholder("搜索标题、笔记或标签…").fill(title);
  await expect(page.locator("[data-asset-card]")).toHaveCount(1);
  await page.locator("[data-asset-card]").getByRole("button", { name: "加入收藏" }).click();
  for (const layout of ["列表", "瀑布", "影院", "网格"]) {
    await page.getByLabel(`${layout}布局`, { exact: true }).click();
    await expect(page.locator("[data-layout]")).toHaveAttribute(
      "data-layout",
      ({ 列表: "list", 瀑布: "masonry", 影院: "cinema", 网格: "grid" } as Record<string, string>)[
        layout
      ],
    );
  }
  await expect(page.getByLabel("网格布局", { exact: true })).toHaveAttribute("data-state", "on");
  await page.evaluate(async () => {
    await Promise.all(
      document.getAnimations().map((animation) => animation.finished.catch(() => {})),
    );
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
  await page.screenshot({
    animations: "disabled",
    path: `.artifacts/${testInfo.project.name}-library.png`,
    fullPage: true,
  });
});

test("manage taxonomy and approve a scoped device that revokes immediately", async ({
  page,
  baseURL,
}, testInfo) => {
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
  await page.goto("/");
  await page.getByLabel("上传视频文件").setInputFiles(resolve(".artifacts/media/synthetic.mp4"));
  await expect(page.getByText("已保存", { exact: true }).first()).toBeVisible({ timeout: 45_000 });
  await page.getByRole("button", { name: "收起已完成传输", exact: true }).click();
  await page.getByRole("button", { name: "播放视频", exact: true }).click();
  const preview = page.getByRole("dialog");
  await preview.getByRole("combobox", { name: "视频分类", exact: true }).click();
  await page.getByRole("option", { name: `Travel ${testInfo.project.name}`, exact: true }).click();
  await preview
    .getByRole("checkbox", { name: `Motion ${testInfo.project.name}`, exact: true })
    .check();
  await preview.getByRole("button", { name: "保存修改", exact: true }).click();
  await expect(preview.getByText("修改已保存", { exact: true })).toBeVisible();
  await preview.getByRole("button", { name: "关闭预览", exact: true }).click();
  await page.getByRole("combobox", { name: "筛选分类", exact: true }).click();
  await page.getByRole("option", { name: `Travel ${testInfo.project.name}`, exact: true }).click();
  await page.getByRole("combobox", { name: "筛选标签", exact: true }).click();
  await page.getByRole("option", { name: `Motion ${testInfo.project.name}`, exact: true }).click();
  await expect(page.locator("[data-asset-card]")).toHaveCount(1);
  await page.goto("/connect");
  await expect(page.getByRole("heading", { name: "连接本机", exact: true }).last()).toBeVisible();
  await expect(page.getByLabel("设备配对码")).toBeVisible();
  await expect(page.getByText("X 登录态只留在本机", { exact: false })).toBeVisible();
  await page.getByLabel("设备配对码").fill("0000-0000");
  await page.getByRole("button", { name: "查看设备", exact: true }).click();
  await expect(page.locator(".pair-card").getByRole("status")).toBeVisible();
  const pairingResponse = await fetch(`${baseURL}/api/connector-pairings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Synthetic test device",
      scopes: ["media:write", "jobs:read", "library:read"],
    }),
  });
  expect(pairingResponse.status).toBe(201);
  const pairing = (await pairingResponse.json()) as { userCode: string; deviceCode: string };
  await page.getByLabel("设备配对码").fill(pairing.userCode);
  await page.getByRole("button", { name: "查看设备", exact: true }).click();
  await page.getByRole("checkbox", { name: "读取资料库元数据", exact: true }).uncheck();
  await page.getByRole("button", { name: "批准这台设备", exact: true }).click();
  await expect(
    page.getByText("已批准连接。请回到本机终端完成配对。", { exact: true }),
  ).toBeVisible();
  const exchange = await fetch(`${baseURL}/api/connector-pairings/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceCode: pairing.deviceCode }),
  });
  expect(exchange.status).toBe(200);
  const paired = (await exchange.json()) as { token: string; scopes: string[] };
  const deviceHeaders = {
    Authorization: `Bearer ${paired.token}`,
    "Content-Type": "application/json",
  };
  expect(
    (await fetch(`${baseURL}/api/connectors/me/assets`, { headers: deviceHeaders })).status,
  ).toBe(403);
  const heartbeat = () =>
    fetch(`${baseURL}/api/connectors/me/heartbeat`, {
      method: "POST",
      headers: deviceHeaders,
      body: JSON.stringify({ checkpoint: "synthetic-ui-check" }),
    });
  expect((await heartbeat()).status).toBe(200);
  await page.getByRole("button", { name: "刷新状态", exact: true }).click();
  const disconnect = page.getByRole("button", { name: "断开", exact: true });
  await disconnect.click();
  await page.getByRole("dialog").getByRole("button", { name: "保留连接", exact: true }).click();
  await expect(disconnect).toBeFocused();
  await disconnect.click();
  await page.getByRole("dialog").getByRole("button", { name: "确认断开", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("已撤销", { exact: true })).toBeVisible();
  expect((await heartbeat()).status).toBe(401);
});
