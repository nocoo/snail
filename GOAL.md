# Snail 开工 Goal ledger

目标：交付并发布到 https://snail.hexly.ai 的私人视频收藏、分类与播放库。唯一工程写入者：Codex；Grok/Pi 只读审查。研究 docs/01–11 保留，原始 SHA-256 清单存 `.artifacts/research-baseline.json`。

## 已确认

- 2026-09-12：Git main 初始化；https://github.com/nocoo/snail 已真实创建，public。当前版本 0.1.0，尚未发布。
- 本机 gh 以 nocoo 登录，具备 repo/workflow 权限；Wrangler OAuth 已登录。尚待验证 Access 管理/R2/CI 凭据。
- 栈：Vite + React 19 + TypeScript 7.0.2 + Biome；核对 Basalt 本机源码、package exports 与消费应用，使用公开 MIT `@nocoo/basalt@2.1.7`。
- 单 Worker assets/API + D1 + 私有 R2；Access 保护用户路径，精确健康路径公开；Connector 独立设备认证，不上传 X cookie。
- Logo 由 Hexly w1:p3 独立发布，当前保留 provisional slot。

## TDD 切片与验收

| 切片 | RED | GREEN / REFACTOR | 状态 |
|---|---|---|---|
| S1 Access 身份、资料库隔离、CSRF、真实健康 | 21:25 单元缺少 auth/media，HTTP 缺少 Worker 入口而失败 | 21:27 `bun run test` 29/29 通过；真实 workerd + 本地 D1/R2、RS256 测试身份 | 后端完成，UI/生产待验 |
| S2 分片上传、续传、哈希去重、Range/海报 | MIME/URL/Range 单元 RED 已记录；上传 HTTP 待跑 | 边界解析单元通过，上传待实现 | 进行中 |
| S3 设备配对、scope/撤销、幂等安全导入 | 待跑 | 待实现 | 未开始 |
| S4 分类/标签/收藏/搜索/排序/批量/四布局 | 待跑 | 待实现 | 未开始 |
| S5 本机 OpenCLI、cursor/心跳/断线恢复 | 待跑 | 待实现 | 未开始 |
| S6 CI/CD、迁移、清理、安全与生产验证 | 待跑 | 待实现 | 未开始 |

每个切片记录真实失败原因、成功测试命令与结果；原始日志和合成视频只放 gitignored `.artifacts/`。不将 mock 或本地 R2 结果写作云端通过。

## 发布 Gate（全通过才结束 Goal）

- [ ] TypeScript / Biome / 单元 / Worker HTTP / 迁移检查
- [ ] 桌面与手机浏览器：上传、播放、整理、检索、设备连接
- [ ] 合成大文件：进度、重试、续传、去重、Range、拒绝 HTML 假 MP4
- [ ] Connector：配对、最小权限、撤销、幂等、心跳、离线恢复
- [ ] 安全：未登录、跨库、CSRF、SSRF/重定向、MIME/magic/大小、限流、秘密扫描
- [ ] 实际 Cloudflare：D1/R2/HTTPS/Access 拦截与登录后核心流程
- [ ] 合成视频与获准示例链路实测，清理所有测试媒体与私人证据
- [ ] 独立只读审查与有效 findings 落实
- [ ] 保留 11 篇研究文档，运行/部署/版权/恢复文档齐全
- [ ] 原子提交、main push、CI 通过、v0.1.0 tag/GitHub Release
- [ ] 公开 `/api/live` 标准 JSON 返回真实健康；品牌正式资产校验或如实记录占位状态

## 当前限制

应用尚未实现、尚未部署；不能声称已可用。真实 X 授权、API 套餐与版权边界沿用研究结论，产品采用已经验证的本机 OpenCLI 会话路径。
