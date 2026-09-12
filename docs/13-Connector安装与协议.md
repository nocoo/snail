# 13 · Connector 安装与协议

Snail Connector 是本机采集与传输程序。X 会话只由本机 Chrome/OpenCLI 使用，Snail 云端从不需要 X 密码、cookie、guest/bearer/CSRF 值或浏览器配置目录。0.1.0 持久凭据支持 macOS Keychain；Linux/Windows 没有落地安全凭据后端，本版明确拒绝落盘 token，而不是退化成明文环境变量。

## 本机准备与使用

需要 Bun 1.4.0、ffmpeg/ffprobe、OpenCLI 1.8.6 和已连接的 Browser Bridge。OpenCLI 与浏览器插件需按上游说明安装并由用户正常登录 X，不能绕过 MFA/challenge。[1] Snail 从已安装 adapter 源码动态发现 GraphQL 定义，但严格检查已验证的 OpenCLI 版本；升级先跑本文件验收。

```sh
# 在 Snail 仓库中；Mac 上已有已授权的浏览器会话
bun install --frozen-lockfile
bun run connector -- pair https://snail.hexly.ai
# 网页中核对设备名和权限后批准；token 不显示到终端
bun run connector -- status

# 仅读取，输出脱敏计数，不打印书签或身份
bun run connector -- preview 'https://x.com/girlofflorence/status/2098577796398567727?s=46' --limit 120

# 用户明确有权保存该视频时使用
bun run connector -- import 'https://x.com/girlofflorence/status/2098577796398567727?s=46' --approve-rights

# 守候网页中已经逐条批准的链接任务；默认不归档整个书签窗口
bun run connector -- watch

# 可选：用户明确批准窗口内全部可导入视频后启用书签同步
bun run connector -- sync --approve-rights --limit 120
bun run connector -- watch --approve-rights --limit 120

bun run connector -- rotate
bun run connector -- revoke
```

正常使用必须完成 Snail Access 登录和网页配对批准，这与 X 登录是两件事。首次 pair 打开 `/connect?code=...`；默认申请 `media:write`、`jobs:read`，`--read-library` 才额外申请 `library:read`。网页只允许批准所申请权限的子集。

临时 state 默认在当前仓库 gitignored `.connector/`，目录 0700、文件 0600；`SNAIL_STATE_DIR` 可指定用户自己的安全目录，但不应放云同步目录或其他仓库。设备 token 存 Keychain service `ai.hexly.snail.connector`，以 origin 的摘要作为 account 名；通过 stdin 写入，不出现在 argv/env/stdout。原始 X 游标不写云端，seen 列表只存 post/media ID 的 SHA-256，最多 50,000 项。

本机网络代理可使用现有 `HTTPS_PROXY`；程序不会打印其值。固定 CDN 的公共 DNS 预检通过 HTTPS 解析器完成，因此保留地址的本机代理 DNS 不被误当作 CDN 的公网地址。TLS/代理仍属于本机信任边界。

## 配对、撤销、恢复

| 协议 | 身份与行为 |
|---|---|
| POST `/api/connector-pairings` | 匿名、每 IP 10 次/10 分钟；256-bit device code，10 分钟有效，短码在网页核对 |
| POST `/api/connector-pairings/exchange` | device code 一次兑换；单独 150 次/10 分钟限流，足够每 5 秒轮询到期窗口 |
| POST `/api/me/connector-pairings/approve` | Access 用户 + CSRF；绑定唯一资料库和最小 scope |
| `/api/connectors/me/*` | 独立 `Authorization: Bearer`；仅 Snail 设备凭据，不接受 X token 或 Access Service Token |
| POST `.../heartbeat` | checkpoint、version、state；更新 last_seen_at，不返回私有数据 |
| POST `.../rotate` | 生成新 256-bit 凭据，旧摘要立即失效，有效期 30 天 |
| POST `.../revoke` / 用户 DELETE `/api/devices/:id` | 即时作废，取消活动上传、终止 multipart、重排未完成任务、登记垃圾 |
| POST `.../jobs/claim` | 要求 jobs:read + media:write；180 秒 lease，30 秒 heartbeat，20 秒轮询 |
| POST `.../jobs/:id/{heartbeat,complete,fail}` | 必须匹配当前设备/lease；complete 还必须匹配来源资料库中的 asset |

云端只保存 Snail 凭据 SHA-256。过期重新配对；Connector 启动时若剩余不足一天会轮换，长时间连续守候在到期后需要重启/重新配对。macOS Keychain 若拒绝访问，停止并给固定错误，不把设备秘密降级写到磁盘。机器失窃时从网页撤销该设备；撤销不依赖机器上线。

离线保留服务器任务；租约到期可由后续会话或另一台已授权设备领取。失效租约不得继续发布，已上传片和对象交给清理机制。可恢复失败在网页点击重试；撤销、过期或 needs_login 不能靠无限网络重试解决。关闭 Connector 不删除已保存作品；`revoke` 清理本机配对状态。

## 数据边界与媒体真实性

允许的规范化输入为 `sourceId/sourceUrl/mediaId/mediaUrl/title/description/posterUrl/duration/width/height/approved`，任务只带 `{id, leaseId}`。`cookies/cookie_file/authorization/headers/token/browser_profile` 及其他未知字段直接 400 并写 `protocol.rejected` 审计；原始异常和字段值不落审计。

adapter 的原始 stdout/stderr 被隔离；主进程只接收规范化 IPC。目标匹配同时要求 post_id 和 media_id，拒绝跨帖 source_status、受保护作者、HLS-only 或不匹配的 CDN 路径。书签读取使用真实 GraphQL 分页，单链接补查仅匹配目标帖，不能扫描整个 DOM 的 article 媒体。

本机先验证 MIME、正数大小、Content-Length、ftyp、SHA-256，随后 ffprobe 和 ffmpeg 全解码。默认分片上传精确验证后的字节；`--relay` 才让 Worker 重取同一获准 URL，Connector 再核对返回大小与哈希。即使媒体已保存，海报生成失败也如实返回 unavailable，不伪造成功海报。

严禁调用原始 `opencli twitter download` 并把 exit 0、success 或扩展名当证据；研究中这个命令可把 HTML 保存成 MP4。原始示例的两种 MP4 变体、下载陷阱、分页和 folders 结果保留在 02/08，不以新的真实下载成功覆盖旧失败记录。

## 书签增量边界

默认读取最近 120 条，参数限定 1–500。重叠窗口 + 本地 seen 摘要 + 服务端 `(library, source_id, media_id)` 唯一约束 + 内容 SHA 去重，避免重复存档；没有假装支持 X 持久游标事件或无限历史同步。窗口满时明确提示 bounded_window；一次新增超过窗口、很久未运行、被重新排序/删除的旧书签可能漏过，应提高 limit 或单链接导入。0.1.0 不提供 Bookmarks folders UI，因为研究未验证稳定可用的 folders 接口。

## 验收

先运行 `bun run test`，覆盖协议字段泄露、来源污染、假 MIME/HTML、真实合成解码、设备配对/scope/轮换/撤销、租约恢复和 multipart→R2→poster→Range→dedup。真实验证只执行获准示例，确认脱敏计数、媒体归属、实际 hash/大小/解码；不要输出原始 bookmarks JSON。随后在生产 pair → 网页批准 → status → 网页单链接任务/watch → 播放/Range → 撤销，检查晚到写入被拒绝。原始视频只在临时目录，发布仓库无视频、cookie、token或身份。

## Sources

[1] OpenCLI 1.8.6 源码与安装说明：https://github.com/jackwener/opencli 。本机实际 adapter 与 Browser Bridge 审查、许可证和认证边界见原始研究 08；本版精确媒体归属与隔离实现见 `connector/{opencli,core,media,state,client,sync,cli}.ts`。
