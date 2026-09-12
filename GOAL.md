# Snail 开工 Goal ledger

目标：交付并发布到 https://snail.hexly.ai 的私人视频收藏、分类与播放库。Codex 唯一写入；Grok/Pi 只读审查；Hexly 独立维护品牌。研究 docs/01–11 保留原始字节，清单在 `scripts/research-baseline.json`。

## 已确认（2026-09-12）

- Git main 已初始化，https://github.com/nocoo/snail 已真实创建为 public，MIT；应用版本 0.1.0 尚未发布。
- Vite + React 19 + TypeScript 7.0.2 + Biome，公开 MIT Basalt 2.1.7 的组件和规范 Tailwind 样式入口；没有复制共享库私有实现。
- 单 Worker assets/API + D1 + 私有 R2；Worker 独立验证 Access JWT；设备凭据限制资料库、scope、有效期，不上传 X cookie。
- GitHub/Wrangler 均已认证；D1、R2、Access、自定义域和首个 Worker 已真实部署，远程 0001/0002 已应用；独立生产部署 Secret 已安全存入 GitHub Environment。
- 正式 Snail 品牌 1.0.0 已采用，来源 Hexly 发布 SHA `352eb2652d4e11c876ef84152fc8e02f8d5ed331`；adoption commit `fe5f72e8a0d960a81acadc5704a04e1c4ed4f607`，21 个所选原文件逐字节验证通过。

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
- GitHub Environment `production`：`CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID` Secrets 已设置，account ID 另保留公开 Variable。Snail 自有 production job 直接读取。新建 `Snail production deploy` token 不含 Access 管理权限，值未打印/写入磁盘。
- 尚未部署阶段 Hexly 首次监控 `/api/live` 为 HTTP 530/down；该历史结果保留。首次部署后已真实匿名 HTTP 200 JSON，数据库/存储健康，版本 0.1.0；不回填或篡改 Hexly 采样。

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
- [x] 正式品牌接入、逐字节 provenance、亮暗主题浏览器验收
- [x] 真实 D1/R2/生命周期/HTTPS 与匿名 Access 拦截
- [ ] Access 正常登录后核心流程
- [ ] 生产合成媒体与获准示例、哈希/Range/解码、清理临时资产
- [x] Grok/Pi 独立复审，有效代码与工作流 findings 已落实；生产交互 Gate 仍单独保留
- [x] docs/01–11 不变，运行/Connector/迁移/恢复/发布文档齐全
- [x] 原子提交、push main、CI/CD 成功（精确已验 SHA 与 run 见下）
- [ ] v0.1.0 tag/GitHub Release，受真实登录后验收硬门禁保护
- [ ] 标准公开 `/api/live` 实际 JSON 健康（已通过），生产版本与最终 Release 一致（待发布）

尚未通过的 Gate 继续执行；不会把本地测试、资源已创建或待部署版本表述为正式交付。

## S8 审查回归（22:24）

- RED：过期租约被另一设备领取后，旧上传仍为 uploading。GREEN：63/63 通过；领取、失败和取消都会停止失效传输并登记垃圾，分片预留与完成加当前租约校验。
- 真实产品下载器复核获准示例：HTTP 200，video/mp4，1,729,313 字节，SHA-256 `2ee43bb5411bbae7baaa856bbb36debc01fe97d7f2b4cd288d72684d4994ea1e`，720×1280，H.264，7.128526 秒，完整解码通过；临时视频已删除。
- R2 已设置 `snail-abort-incomplete`：全部 key 的未完成 multipart 一天后自动终止；仍未部署 Worker。
- 本地 typecheck、推荐规则 lint、63 单元/HTTP、4 桌面/手机浏览器、Vite build、Worker dry-run、11 篇研究哈希、gitleaks 工作目录扫描通过。公开 AUD 与研究中固定对象 key 使用精确白名单；未关闭秘密扫描规则。

## S9 正式品牌

公开 manifest 与固定源提交的 Git blob 完全相同；21 个所选原文件、根 logo 与 ICO 目录通过校验。Playwright 首次品牌用例的测试身份缺少规定前缀，已修复 fixture 并在 53e83fb 的实际旧 UI 上重新验证 RED（不存在正式 mark）；布局回归 RED 同时确认旧 SidebarHeader 挤压品牌说明。GREEN 以修正后的全部桌面/手机测试记录为准。独立品牌版本 1.0.0，不改应用语义版本。

正式 adoption commit：`fe5f72e8a0d960a81acadc5704a04e1c4ed4f607`。64 单元/HTTP 与 8 桌面/手机浏览器测试通过；品牌在应用/OS 相反主题下选择正确，未改动上游 21 个原文件。

## S10–S11 发布契约与真实路径

- S10 RED：生产检查模块缺失；GREEN：64 单元/HTTP 通过，探针拒绝登录 HTML、错误版本和没有认证隔离的站点。
- S11 RED（22:44）：实际 `/api/live/` 返回 Worker 401，与原先假设的 Access 302 不同；GREEN：补充尾斜杠/后代路径的安全拒绝检查，允许 Access 302 或明确的 JSON 401 `authentication_required`，拒绝成功数据和其他伪 401。
- 原生 Bun fetch 的真实公开探针已通过：live 200；主页、用户身份与批准路径 302 Access；live 后代与无凭据设备 401。最初本机代理/DNS 出现 TLS/解析失败，曾以当前公开 Cloudflare IP 保留 hostname/SNI/TLS 验证复核；稍后原生请求恢复，无需改系统网络或产品传输协议。
- 首次 Worker version `d0f727ba-3431-4d22-a9e1-57e42c439963`，远程迁移无待应用项，R2 无公开入口且 multipart 一天自动终止。用户正常 Access 邮箱验证码登录仍待完成；生产核心流程与真实 Connector 配对不能提前记成功。
- S11 后全量 65 单元/HTTP 通过；类型、lint、研究与品牌校验通过。Pi 对文档/Keychain/范围/恢复复核无功能阻断，指出的新测试格式问题已经修正并通过 lint。
- `a0cff27` 已实际 push main。Grok 发布复核发现 caller 无法取得 Environment Variable；按共享工作流真实契约补齐 account ID Environment Secret，callee 直接读取，未扩大秘密继承或 Access 权限。

## S12 与生产 CI/CD

- CI `34700384128` 在 `a41e546` 成功，但首次共享部署 `34700481827` 实际读到空 Secret。API 仅核对了两项名称存在，不能据此断言运行时可达。
- 直接 Environment job 的布尔诊断 `34700673280` 成功；改为 Snail 自有 production job，同时保留固定 `release-source` action、准确 checkout 和部署前 fresh-main 校验。Grok 最终复核无阻断，不把差异泛化为所有 reusable workflow 的规则。
- 已通过的部署候选：`17866ca18ed00d5cf4a8bb11eb4eabf653b60f22`；CI `34700749555`、Deploy `34700797249` 全部 success。Worker version `df5fb11a-f3cc-4dc8-9b45-4d042dba9587`，启动 22ms；远程无待应用迁移，生产 HTTPS/健康/匿名隔离探针全部通过。
- R2 管理链路实测：合成 MP4 12,016,000 字节，SHA-256 `475079cbacedc2ed2f7d5f344074803941c0d7c5d13448e819c7e43b9c191c72`；远程写入、读回、完整解码通过，测试对象已删除。首次删除请求超时，随后重试成功。该管理链路不是已登录网页上传证据。
- S12 RED：缺少真实生产验收硬门禁；GREEN：发布检查要求当前 SHA/版本的七项登录后实测全部通过。pending、缺项、旧 SHA/版本均拒绝，不能以公开健康正常代替认证 Gate。全通过记录只在真实操作完成后写入 ignored 证据，当前没有生成。
- 当前仍需要用户在本机 Chrome 完成 Snail Access 正常邮箱验证码登录；X 本机登录和下载已实证 GO，Snail 登录后生产验收及正式 tag 保持 CONDITIONAL GO。
- S12 后 66 单元/HTTP、类型、lint、研究/品牌哈希和工作目录秘密扫描通过；原有 8 桌面/手机浏览器用例在真实远端 CI 通过。
- 发布门禁实现提交 `a4c58384e96f1d2857f6f5cd2d71a5fff1cd1987`：CI `34701110376` 与 Deploy `34701166328` 均 success；Worker `e1abe78b-bf82-4baa-9484-9e095b4b35df`，启动 21ms，生产公开探针再次通过。`release:check` 实际因缺少已登录验收记录退出 1，正式 tag/GitHub Release 未创建。此处固定已经完成的实测，不提前断言后续文档提交的 CI 结果。

## S13 · Basalt 规范 Tailwind 集成

- 用户补充要求 Option A：固定 Tailwind / Vite 插件 4.3.3，CSS 为 `@source` → Basalt tailwind → tailwindcss 的三行顺序；原 standalone 入口已移除。官方 registry 两个版本端点均 HTTP 200，安装成功，锁文件无本机路径或镜像 URL。
- RED：四个真实浏览器用例均发现应用重新声明了 Basalt 配色；原始日志 `.artifacts/S13-basalt-red.log`。GREEN：移除共享 tokens 与 chrome 尺寸覆盖，应用基础规则归入 `@layer base`，12 个桌面/手机浏览器用例全部通过；包括主题切换、56px 页头、260px 侧栏、手机无侧栏占位与合成视频上传/播放/整理。
- 全部 66 单元/Worker HTTP、类型、Biome、构建、Worker dry-run、gitleaks，以及研究 11 篇和品牌 21 个原文件哈希均通过。Biome 的 import 顺序规则仅对指定样式文件设例外，理由和集成来源记录于 docs/12。
- Pi 只读复核没有发现阻断项；正式品牌 adoption SHA 和所有原字节不变。本条在 Basalt 修改提交前记录，后续 CI/CD 以匹配该提交的真实 Actions 为准；Access 登录后生产验收与 v0.1.0 tag 仍保持待完成。

## 生产配对入口补充实测

- `fd5b6842d5090347e9296f9f591b77d17ee21f10` 的 CI `34702116869`、Deploy `34702178746` 均 success；Worker `6d28281b-b473-4195-9772-fcadbc9dccbd` 已在生产，公开健康和匿名隔离再次通过。
- 23:29 真实匿名配对：非法 scope 400、合法申请 201、待批准兑换 428、匿名批准 302 Access、再次兑换仍 428。本次未批准测试行已限定名称/时间/状态清理，剩余 0，旧码随后 410。配对码只留进程内存，没有生成设备 token，也没有创建用户资料库或设备。
- 23:28 本机 Chrome 的正常主页导航仍进入 Snail Access 邮箱入口；前一 goal turn 完成 Basalt 修正与上线，本次继续补齐生产配对入口证据。剩余真实登录后的上传、Keychain 配对、获准样例、撤销/晚到写入与清理全部依赖本人完成正常 Access 登录，不能用管理 API 批准或合成身份替代。
