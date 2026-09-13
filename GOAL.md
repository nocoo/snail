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
- [x] Access 正常登录后核心流程（2026-09-13，S14–S15 真实验收）
- [x] 生产合成媒体与获准示例、哈希/Range/解码、清理临时资产（见 S14–S15）
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

## S14 · 登录配置与真实 Keychain 回归（2026-09-13）

- 用户指定 team `nocoo` 与新 AUD；真实匿名 `/`、`/api/me` 的 Access 重定向确认正在使用该 AUD。本机已登录 Chrome 的首页却为 Worker JSON `authentication_required`，仓库仍配置旧 AUD，故登录后的应用 JWT 被 Worker 拒绝。仅更新部署 audience 与生成的 Env 类型，保留签名、issuer、expiry、app 身份和 CSRF 校验。
- Access RED：新增使用真实部署配置验证当前应用 audience 的签名测试，6 条中 1 条以 `authentication_required` 失败；GREEN：6/6。证据 `.artifacts/S14-access-{red,green}.log`，测试签名身份仅在本地生成，不是生产身份。
- Keychain RED：新增 macOS 真实临时凭据保存→读取→轮换→删除测试，以 `keychain_unavailable` 失败。根因是 `security -i` 不支持 `quit`，已写入的命令后追加它会使进程退出 1；用 stdin EOF 结束后 GREEN 1/1。测试用独立随机 account，最后删除，凭据未输出。Linux CI 明确跳过这项 macOS 集成测试。
- GREEN / REFACTOR：只更正配置和移除无效命令，无新增依赖；68 单元/Worker HTTP、12 桌面/手机浏览器、类型、Biome、Vite build、Worker dry-run、11 篇研究哈希、21 个品牌文件与 gitleaks 均通过。原始日志在 ignored `.artifacts/S14-*`。
- 本条写入时生产尚未部署本次修复，真实 Connector 配对和获准书签入库继续验证；后续生产结果另记，不将本地测试当生产成功。

### S14 生产实测进展

- 修复提交 `e6b15cd81ca48ed020e68a4ac5c07ec43a5d774f` 已推送 main；CI `34723737770`、Deploy `34723793552` 均 success，Worker `abe2ae0b-07dd-4eef-84f7-11a9392df12a`。真实既有 Access 会话打开资料库，`/api/me` 200；公开健康和匿名隔离继续通过。
- 真实产品 CLI pair → 网页查看并批准 → macOS Keychain → heartbeat 成功；仅 `media:write`、`jobs:read`，读资料库返回 403。CLI rotate 后旧凭据 401，新凭据和 Keychain 读回继续有效。
- 网页批准的示例任务经真实 `watch` 完成；OpenCLI 120 条书签窗口、2 页 200、只处理获准目标，保存 1 条 1,729,313 字节 MP4。再次提交复用同一 asset，SHA-256 均为 `2ee43bb5411bbae7baaa856bbb36debc01fe97d7f2b4cd288d72684d4994ea1e`，720×1280，7.128526 秒，海报 ready。收藏标记已写入。
- 生产媒体完整读回与 D1/Connector 哈希、长度一致；ffprobe H.264、ffmpeg 全解码通过；头/尾 Range 206、越界 416、JPEG 海报 200。真实前台 Chrome 播放推进到 1.16 秒、readyState 4、无媒体错误。后台标签页曾因 Chrome 暂停造成自动化等待，前台重测通过；没有复制登录 cookie。
- 12,893,277 字节合成 MP4 在网页上传第一片后点击暂停；服务器确认片 1。重试复用同一上传 ID，只补片 2，最终 ready 和海报成功。所有网络请求到真实生产；暂停由验证脚本触发页面控件，没有伪造服务器响应。
- 两台临时最小 scope 设备在网页撤销，已上传会话变为 cancelled；后续心跳、complete、part 均实际 401 `device_revoked`。最终资产不可见检查暴露下述长搜索缺陷，故相关综合验收尚未提前标成全通过。

## S15 · 真实 D1 长搜索回归（2026-09-13）

- 生产实测 47/48 个 ASCII 字符搜索 200，49/60 个字符 500；临时设备名称的长查询触发该问题。当前 Cloudflare D1 官方限制明确 `LIKE`/`GLOB` pattern 最多 50 字节，原查询添加两侧 `%` 后超限，较长中文也受影响。
- RED：新增 Worker HTTP 行为测试，覆盖长标题、中文笔记、长标签、大小写、字面量 `%`/`_`/反斜杠及跨库隔离；真实本地 workerd 返回 500，4 条中 1 条失败。GREEN：使用 SQLite 原生 `instr(lower(column),lower(?))`，保留 prepared 参数和资料库绑定；4/4 通过。未截断为 48 字节，也未引入搜索服务。
- 实际配对产生的 ignored `.connector/state.json` 被 Biome 扫描，导致 lint RED；将运行时目录与 `.artifacts` 一样排除，避免修改 Connector 管理的状态文件来迎合格式化。
- S15 本地 69 单元/HTTP 和 12 桌面/手机浏览器通过，后续最终检查与生产重验另记；原始产物在 `.artifacts/S15-*`。参考：https://developers.cloudflare.com/d1/platform/limits/ 。

### S15 生产复验与清理

- `02169936d38e16a553fbc17cac631c06c09f0af4` 的 CI `34724477054`、Deploy `34724550430` 均 success；Worker `d04d66d7-f89f-43f5-9b79-94a8f014c681`。生产 79 字节完整标题、132 字节中文笔记、字面量通配符与大小写查询均 200 且结果正确，真实网页编辑和搜索通过。
- 两台已撤销临时设备的完整名称重新检索为 200 / 0 条，D1 上传均 cancelled。此前的三类晚到请求均已 401；最初综合检查因长搜索 500 失败的记录保留，没有改写为第一次就通过。
- 合成视频经真实网页批量删除，详情、media、poster 均 404；资料库剩余且保留 1 条真实 X 收藏。其播放、哈希、海报、重复导入和收藏状态均已实证。
- 仅对本次合成资产、已取消上传和被替换海报的 key 做受限清理；每次检查 D1 无 live/活动传输引用，再实际 R2 delete 与 get 缺失复核，5/5 完成；真实视频与当前海报不在删除范围。首次管理命令中断后按原清单继续，原失败记录保留。`.connector/tmp` 为空，12 MiB 合成临时文件和 X 读回文件已移除。
- 产品 Connector 配对继续存于 macOS Keychain，30 天有效期，状态命令成功；验证用 watch 已正常停止，后续运行 `bun run connector -- watch` 接收网页中批准的任务。没有导入整个私人书签窗口。

## S16 · 整页书签 IPC 回归（2026-09-13）

- 补验无单帖参数的真实书签窗口时，父进程等待超过 3 分钟，子进程已经退出：大结果发送后立即 disconnect 会丢失 IPC 回复；原父进程遇到退出码 0 会清理超时，却不结束 Promise。
- RED：新增执行真实 Bun CLI/fork 的行为测试，用本仓库临时合成 adapter 返回 120 条长元数据，以及正常退出但不回复两种场景；原实现均超过 8 秒测试限时。没有修改或复制 OpenCLI 实现，adapter 的 stdout/stderr 仍隔离。
- GREEN / REFACTOR：子进程等待 `process.send` 回调后再断开；父进程在通道关闭而未收到回复时返回固定错误。2/2 测试在 2.61 秒完成，输出只含脱敏计数；日志 `.artifacts/S16-ipc-{red,green}.log`。
- 真实 OpenCLI 重新读取完整 120 条书签、两页均 HTTP 200，返回 41 个规范化视频附件；获准示例确实在该窗口中，本次未传 sourceId、未使用单帖补查，也未上传其他书签。脱敏记录 `.artifacts/S14-bookmark-presence.json`。
- 最终本地 71 单元/Worker HTTP、12 桌面/手机浏览器、TypeScript、Biome、Vite build、Worker dry-run、研究/品牌哈希与 gitleaks 全通过。S16 本条在提交前记录；对应远端 CI/Deploy 以该提交的 Actions 实际结果为准。当前操作与继续使用方式记录于 docs/17。

## S17 · Basalt 公共控件与框架迁移（2026-09-13）

- 用户要求对照 Basalt 模板与 Ocelot、Pew、Zhe，执行 `/su-basalt-upgrade` 并自查常见问题。已读取本机命令、Basalt INTEGRATION 与已发布包的 recipes/API；参考仓库只读。npm 最新版与当前锁定版均为 `@nocoo/basalt@2.1.7`，不虚增依赖版本。
- RED：新增桌面/手机、明暗主题的框架导航与键盘控件行为回归，并为真实本地合成上传补充内容层级检查。桌面首轮 4/4 失败：两主题缺少标准顶栏仓库入口、原生 select 没有公共控件弹层、视频卡片与内容岛颜色相同。日志 `.artifacts/S17-frame-red.log`，原布局截图 `.artifacts/S17-before-frame-*`；本地测试身份与合成媒体不代表生产验证。

## S18 · 本机 HTTPS 与完整开发服务（2026-09-13）

- 按用户插入任务，先查询 nmem 的项目/最新预留与活动 Caddy，确认 7018 属于 Gecko；7051、17051、27051 均实测可绑定。分配 Snail 开发 7051、E2E 17051、BDD 27051 预留，登记 `snail-local-ports`。参考仓库未改动，只新增活动 Caddy 的 Snail 域名片段。
- RED：两项真实本地 HTTP 行为测试失败，Vite `/api/live` 返回 HTML、D1/R2 无重启持久化。GREEN：Vite 接入真实本地 Worker，开发 D1/R2 保存于 `.wrangler/dev`；2/2 通过，包括签名身份、同源分类写入、外站拒绝、跨重启上传媒体读取和测试状态隔离。日志 `.artifacts/S18-local-{red,green}.log`。
- REFACTOR：开发与 E2E 复用有界、流式响应的本地代理，移除旧测试服务重复实现；只允许预设 Host/Origin，Vite 不接受测试身份切换，浏览器 cookie/Access assertion 不转交上游。Miniflare 5 使用当前 `resourcePersistencePath`，没有无效的旧版 persistence 参数。生产认证与云端资源未改。
- 活动 Caddy 候选校验与 reload 成功；DNS 127.0.0.1、既有通配符证书可信，HTTP 301。实际 HTTPS `/api/live` 200 JSON 且 database/storage `ok`，`/api/me` 200；Chromium 页面渲染和 HMR connected，无异常，记录 `.artifacts/S18-local-browser.json`。一次配置重启期间的浏览器等待超时已保留，不将其写为首次通过。
- 开发服务已经保持运行；运行方式与配置在 docs/18。类型检查通过，S17 首轮完整桌面/手机回归 18/18 通过；Basalt 视觉自查、独立 review 与全量发布检查仍在继续，不将其提前记为完成。
- S18 全量单元/Worker HTTP 73/73、类型、Biome 和差异空白检查通过。开发代理为本地用途，真实生产验收不由上述测试替代。
- 开发环境提交 `b4f2b8f` 后，用户报告 Basalt/React 模块 504。直接请求确认 `504 Outdated Optimize Dep`，根因是新增 HTTP 测试 Vite 与运行中的开发站共享优化缓存；并非 Caddy 网络超时。补充缓存保留回归 RED（文件被删除而 ENOENT）→测试模式独立 cacheDir→GREEN 3/3；日志 `.artifacts/S18-cache-{red,green}.log`。随后真实 HTTPS 浏览器连续打开与刷新，72 个依赖请求全部 200，HMR 正常、页面异常 0，证据 `.artifacts/S18-dependencies-browser.json`。
