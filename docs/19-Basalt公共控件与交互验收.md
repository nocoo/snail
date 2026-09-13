# 19 · Basalt 公共控件与交互验收

执行用户的 `/su-basalt-upgrade`：以 Basalt `INTEGRATION.md`、已发布组件 API 和 Ocelot、Pew、Zhe 的实际应用布局为参考。仅写 Snail，参考仓库只读。npm 最新版与锁文件均为 `@nocoo/basalt@2.1.7`，保留 TypeScript 7.0.2、React 19 和官方 Tailwind 4 入口。

## 框架与消费者

| 区域 | 公共组件与约定 |
| --- | --- |
| 应用框架 | `AppShell` → `AppSkipLink`、`Sidebar`、`AppMain`；主区为 56px `AppHeader`、带标准留白的 `ContentIsland` |
| 侧栏 | `SidebarHeader/Nav/Partition/Item/IconItem/Footer/User`；260px 展开、68px 折叠，44px 固定品牌槽内展示 24px 标记，收合动画中坐标保持不变 |
| 手机导航 | 公共 `Sheet` 复用相同侧栏；首次渲染识别断点，不预留桌面栏；关闭恢复菜单按钮焦点 |
| 右上角 | 公共 `Button`、GitHub 官方图标及许可、`ThemeToggle`；当前页面标题不作为可点击链接 |
| 页面抬头 | `PageHeader` 的 title、description、actions；资料库多个筛选器使用独立 `LayerCard` |
| 层级与分区 | `ContentIsland`、`LayerCard`、`LayerCard.Well`、`SectionRule`；具体内容使用公共控件定义的更亮层级 |
| 表单与筛选 | `Field`、`Input`、`InputArea`、公共组合 `Select`、`ToggleGroup`、`Checkbox` 和 `Checkbox.Group` |
| 预览与确认 | `Dialog`、`DialogHeader/Title/Description/Footer`、`DescriptionList`；显式内容间距与返回触发者的焦点管理 |
| 状态与传输 | `Banner`、`Badge`、`TagBadge`、`UploadItem`、`TablePager`、`LoadingScreen` |
| 登录 | 公共 `LayerCard` 的 54:86 访客证构图和真实 Access 登录链接 |

`OptionSelect` 仅组合公共组件，并转发 `Field` 的 ID、ARIA 和 ref 到实际 trigger；空字符串使用内部占位值，回调转换为原应用值。长菜单通过公共 `className` 约束可用视口高度，保留库内滚动与键盘行为。未复制 Select 或其他共享控件实现。

导航通过 `LinkProvider render={AppLink}` 复用应用已有的 `navigate`。普通同源应用链接保持上传队列和 File 引用；外链、下载、修饰键、非主键和 Access 路径保留浏览器语义。资料库面包屑清除分类、收藏及搜索筛选，回到全部视频。公共 Header 与 PageHeader 的同名标题符合 Basalt 的独立层级契约。

## 主题与产品布局

`ThemeProvider` 内使用公共 `AccentProvider` 的 `paletteOverrides`，默认陶土色：light `#bf5c3c`、dark `#e79670`，不重声明共享颜色或框架尺寸 tokens。品牌应用见 [docs/20](20-品牌2.0采用.md)。

应用 CSS 只保留视频画幅、网格/瀑布/列表/影院布局、传输浮层位置、字标主题显示和 reduced-motion。媒体继续使用原生 video 的 controls、Range API 和完整画幅；上传、收藏、分类/标签、笔记、批量处理、配对、scope 选择及撤销仍调用真实 Worker API。

## RED → GREEN → REFACTOR

- 首轮框架 RED：缺少标准 GitHub 入口、仍有原生 select、卡片与内容岛同色。日志 `.artifacts/S17-frame-red.log`。
- 对话框焦点 RED：取消链接导入与关闭预览未返回触发按钮；公共 Dialog 的自动焦点钩子记录 opener，触发者已删除时回主内容。日志 `.artifacts/S17-focus-red.log`。
- 保存状态 RED：修改已保存笔记后仍显示成功。现在成功反馈绑定到已保存的 asset 与字段快照，随后编辑立即回到未保存状态。日志 `.artifacts/S17-save-status-red.log`。
- 独立只读 Codex 首轮指出 2 个 P2 和 1 个 P3：面包屑整页刷新、长 Select 无法滚动到末项、预览/导入分区间距为 0。行为测试分别复现 window 标记丢失、45 项列表末项不在视口、16px 最小间距断言失败；日志 `.artifacts/S19-brand-navigation-red.log` 与 `.artifacts/S19-brand-green-review-red.log`。
- 对应修正后的桌面定向回归 5/5 通过，日志 `.artifacts/S19-brand-review-green.log`。共享组件继续负责皮肤和交互，应用仅通过公共 props 配置导航、几何与间距。

完整本地门禁、独立复审和匹配提交的生产结果继续记在 `GOAL.md`。本地使用合成身份、合成视频和临时 D1/R2；这些记录不代表生产认证、真实 X 书签或云端存储验收。之前的真实 Connector 证据保留在 [docs/17](17-登录修复与真实收藏验收.md)。

## 参考

- [Basalt 集成契约](https://github.com/nocoo/basalt/blob/main/INTEGRATION.md) 与 [npm 2.1.7](https://www.npmjs.com/package/@nocoo/basalt/v/2.1.7)
- [Ocelot](https://github.com/nocoo/ocelot)、[Pew](https://github.com/nocoo/pew)、[Zhe](https://github.com/nocoo/zhe)
