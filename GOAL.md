# Snail 开工 Goal ledger

目标：交付并发布到 https://snail.hexly.ai 的私人视频收藏、分类与播放库。Codex 唯一写入；Grok/Pi 只读审查；Hexly 独立维护品牌。研究 docs/01–11 保留原始字节，清单在 `scripts/research-baseline.json`。

## 已确认（2026-09-12）

- Git main 已初始化，https://github.com/nocoo/snail 已真实创建为 public，MIT；应用版本 0.1.0 尚未发布。
- Vite + React 19 + TypeScript 7.0.2 + Biome，公开 MIT Basalt 2.1.7 的组件和独立样式入口；没有复制共享库私有实现。
- 单 Worker assets/API + D1 + 私有 R2；Worker 独立验证 Access JWT；设备凭据限制资料库、scope、有效期，不上传 X cookie。
- GitHub/Wrangler 均已认证；创建 D1、R2 和 Access 成功，独立生产部署 Secret 已安全存入 GitHub Environment；尚未部署 Worker 或应用远程迁移。
- 正式 Snail 品牌 1.0.0 已交接，来源 Hexly 发布 SHA `352eb2652d4e11c876ef84152fc8e02f8d5ed331`；公开 manifest SHA-256 校验通过，应用接入待下一原子提交。

## TDD 切片

原始失败日志、截图、临时视频全部位于 gitignored `.artifacts/`。下表中的本地 D1/R2 指真实 workerd 的本地绑定，并非生产资源。

| 切片 | RED | GREEN / REFACTOR | 当前结果 |
|---|---|---|---|
| S1 身份/隔离/CSRF/健康 | 21:25 缺少 auth/media/Worker 模块 | 21:27 29/29；签名 RS256 测试身份、跨库拒绝、真实绑定健康 | 本地通过 |
| S2 分片/哈希/Range | 21:28 3 条上传路由 404 | 21:29 32/32；两片续传、重试、服务端全文件 SHA、去重、206/416 | 本地通过 |
| S3 配对/scope/撤销 | 21:30 配对 HTTP 失败 | 21:32 35/35；一次兑换、摘要存储、过期/撤销、读写隔离 | 本地通过 |
| S4 整理和响应式 UI | 21:34 分类/标签/批量失败；上传客户端缺失 | 21:36 后端 38/38；后续 desktop/mobile 4/4：真实合成视频上传/播放/编辑/搜索/收藏/四布局 | 本地通过 |
| S5 本机 Connector/任务 | S5-jobs、connector、contract、decode RED；原先 JWT 接受非 app 类型 | 规范化精确 post/media；OpenCLI IPC 隔离；本地完整解码；设备租约/心跳/重领；app 类型强制 | 实现通过，生产配对待验 |
| S6 审查与数据清理 | S6-security RED：relay 配额、协议审计、分片预留、垃圾清理失败 | 发布与有效设备/租约/状态在 D1 batch 内；撤销中止 multipart；小时 GC；幂等 CAS | 已落实 Grok 首轮 5 项有效 findings |
| S7 完整路径与边界 | 配对提示不在卡片内；正常轮询得到 429；不同来源复用同一 upload；DNS helper 缺失；Connector 完整导入失败 | 22:20 单元/HTTP 62/62；UI 4/4；合成视频经 Connector 解码→分片→R2→海报→Range→去重→撤销 | 本地通过，后续新增检查继续记录 |

S7 同时发现 workerd 不接受 fetch `redirect: "error"`，最小 workerd 实测得到 TypeError，已使用 `manual` 并显式拒绝非成功状态。CDN DNS 使用固定公共 HTTPS 解析器做公共地址预检，保留严格域名白名单；这不是允许任意 URL 的通用 DNS pinning。

## 基础设施实证

- D1 `snail`：`78da63ef-3d5b-4ff7-9e78-121996c25f2e`，APAC；R2 `snail-private-media`，默认私有。
- Wrangler OAuth 新建 Access 请求曾返回 403；随后通过本机已认证 Dashboard 的正常 UI 建立独立应用并验证成功，没有绕过 MFA/challenge。
- Access `Snail private library`：`ac66213d-0838-4f1d-a990-d5c272c90c7c`，snail.hexly.ai，独立 AUD，24 小时会话，已有单一授权用户 Allow 策略只做关联、未更改。
- Access `Snail public health`：`dcb09ac3-4813-43db-915f-a003bb91b738`，精确 `/api/live`。
- Access `Snail device protocol`：`fad107b7-c8e8-49df-ac64-dd5362c15191`，仅 `/api/connectors/me/*`、`/api/connector-pairings`、`/api/connector-pairings/exchange` Bypass；用户批准和撤销仍受保护。
- GitHub Environment `production`：`CLOUDFLARE_API_TOKEN` Secret 与 `CLOUDFLARE_ACCOUNT_ID` Variable 已设置。新建 `Snail production deploy` token 不含 Access 管理权限，值未打印/写入磁盘。
- 尚未部署阶段 Hexly 首次监控 `/api/live` 为 HTTP 530/down；保持真实状态，不记作健康。

## 真实 X 路径

- 产品 Connector 的 `preview` 已经通过本机 OpenCLI 1.8.6/Browser Bridge 读取最近 120 条书签窗口，2 页 HTTP 200，定位用户指定目标帖并选取目标媒体；不记录账号身份或其他书签内容。
- 不使用原版 `twitter download` 的成功标志；只读取目标 GraphQL post/media 的精确 MP4，校验 Content-Type/长度/ftyp/SHA-256，并以 ffprobe 与 ffmpeg 完整解码。
- 临时媒体在处理结束后删除；规范化结果通过独立设备协议上传。原始 X 游标、cookie、CSRF 和 bearer 字段留在本机 adapter 内。
- 生产端到端样例尚待完成，不能把本机 preview 与合成链路当作生产导入成功。

## 发布 Gate

- [x] 本地 TypeScript、Biome 推荐规则；单元/Worker HTTP、真实迁移建表
- [x] 桌面/手机：上传、播放、整理、检索、设备配对提示
- [x] 分片重试/续传/哈希/去重/Range，拒绝 HTML 伪 MP4
- [x] 设备配对、最小权限、即时撤销、幂等、心跳、租约恢复
- [x] 未登录/跨库/CSRF/SSRF/重定向/MIME/magic/大小/限流回归
- [ ] 正式品牌接入、逐字节 provenance、亮暗主题浏览器验收
- [ ] 真实 D1/R2/生命周期/HTTPS/Access 与已登录核心流程
- [ ] 生产合成媒体与获准示例、哈希/Range/解码、清理临时资产
- [ ] 独立复审最终版本，无未处理阻断项
- [ ] docs/01–11 不变，运行/Connector/迁移/恢复/发布文档齐全
- [ ] 原子提交、push main、CI/CD 成功、v0.1.0 tag/Release
- [ ] 标准公开 `/api/live` 实际 JSON 健康，生产版本与 Release 一致

尚未通过的 Gate 继续执行；不会把本地测试、资源已创建或待部署版本表述为正式交付。

## S8 审查回归（22:24）

- RED：过期租约被另一设备领取后，旧上传仍为 uploading。GREEN：63/63 通过；领取、失败和取消都会停止失效传输并登记垃圾，分片预留与完成加当前租约校验。
- 真实产品下载器复核获准示例：HTTP 200，video/mp4，1,729,313 字节，SHA-256 `2ee43bb5411bbae7baaa856bbb36debc01fe97d7f2b4cd288d72684d4994ea1e`，720×1280，H.264，7.128526 秒，完整解码通过；临时视频已删除。
- R2 已设置 `snail-abort-incomplete`：全部 key 的未完成 multipart 一天后自动终止；仍未部署 Worker。
- 本地 typecheck、推荐规则 lint、63 单元/HTTP、4 桌面/手机浏览器、Vite build、Worker dry-run、11 篇研究哈希、gitleaks 工作目录扫描通过。公开 AUD 与研究中固定对象 key 使用精确白名单；未关闭秘密扫描规则。

## S9 正式品牌

公开 manifest 与固定源提交的 Git blob 完全相同；21 个所选原文件、根 logo 与 ICO 目录通过校验。Playwright 首次品牌用例的测试身份缺少规定前缀，已修复 fixture 并在 53e83fb 的实际旧 UI 上重新验证 RED（不存在正式 mark）；布局回归 RED 同时确认旧 SidebarHeader 挤压品牌说明。GREEN 以修正后的全部桌面/手机测试记录为准。独立品牌版本 1.0.0，不改应用语义版本。
