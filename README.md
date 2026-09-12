<picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/brand/lockup-dark.svg">
  <img src="public/brand/lockup-light.svg" width="227" height="96" alt="Snail">
</picture>

# Snail

私人视频收藏、分类与播放库。Vite + React 19、TypeScript 7.0.2、Basalt 2.1.7，部署为一个 Cloudflare Worker，使用 D1、私有 R2 和 Cloudflare Access。

- Production: https://snail.hexly.ai
- Source: https://github.com/nocoo/snail (public, MIT)
- 当前版本：**0.1.0 发布候选**，已首次部署，正式发布以 [Goal ledger](GOAL.md) 和 [生产验收](docs/16-发布验收记录.md) 为准。
- [CI](https://github.com/nocoo/snail/actions/workflows/verify.yml) · [Deploy](https://github.com/nocoo/snail/actions/workflows/release.yml) · [公开健康检查](https://snail.hexly.ai/api/live)
- 最初 11 篇中文[研究文档](docs/01-研究结论与范围.md)原样保留；实施决定和研究差异记录在 docs/12 起。

## 使用

打开站点，通过 Access 登录后即可上传、播放和整理视频。网格、瀑布、列表、影院四种布局适配桌面和手机；支持分类、标签、收藏、标题/笔记/标签搜索、排序和批量操作。

上传按 8 MiB 分片，显示进度，支持暂停、重试和重新选取同一文件续传；服务器重算 SHA-256 去重，并通过私有媒体 API 提供 Range 播放。每视频最多 512 MiB，每库 50 GiB。MP4、WebM、MOV 的实际可播性取决于浏览器支持的编码；没有云端转码。删除会立即隐藏条目，后台回收对应字节。

从 X 收藏需要在自己的 Mac 上运行 Connector：

```sh
# 需要已安装并登录的 OpenCLI 1.8.6/Browser Bridge、Bun 和 ffmpeg/ffprobe
bun run connector -- pair https://snail.hexly.ai
# 在网页核对并批准设备；凭据只存 macOS Keychain
bun run connector -- watch
```

随后在网页的「连接本机」中提交自己有权保存的 X 视频链接；Connector 读取目标媒体、验证完整解码、上传字节和海报。也支持主动导入和有界书签轮询，详见 [Connector 安装与协议](docs/13-Connector安装与协议.md)。默认 watch 只处理网页批准的任务；批量同步书签需要显式 `--approve-rights`。书签窗口最多 500 条，不承诺无限历史同步。

X 会话只留在本机 Chrome/OpenCLI，密码、cookie 和 X 授权头永不进入 Snail 云端。设备凭据独立、可撤销、限制权限和资料库。只保存自己拥有或有权留存的媒体；可下载的 CDN MP4 不代表版权许可，也不代表上传者的原始母版。

## 本地开发

使用 Bun 1.4.0、Node 26.8.1 和 ffmpeg/ffprobe。依赖通过公开包和锁文件安装，未复制 Basalt 私有实现。

Basalt 2.1.7 使用官方 Tailwind 入口，搭配 Tailwind / Vite 插件 4.3.3；`.npmrc` 固定 `@nocoo` 到官方 npm。应用不重定义共享颜色 tokens，详细集成与样式层级见 [实施文档](docs/12-实施架构与认证边界.md)。

```sh
bun install --frozen-lockfile
bun run types
bun run build
node scripts/test-server.ts
```

访问 http://127.0.0.1:4173。完整预览使用本地 workerd/D1/R2 和合成签名身份，数据随进程结束清除；此测试代理不进入生产包。`bun run dev` 仅提供 Vite 前端热更新，不包含 API 代理。

```sh
bun run check              # 类型、Biome、单元/Worker HTTP、构建、Worker dry-run
bunx playwright install chromium
bun run test:e2e           # 桌面/手机真实合成媒体链路
bun run research:check    # 11 篇研究文档原字节
bun run brand:check       # 固定品牌来源与字节
```

提交到 main 后，CI 成功才触发生产迁移与部署。`bun run production:check` 验证公开 JSON 健康、Access 与设备鉴权；`bun run release:check` 还要求当前 SHA 的真实登录后验收、干净 main、远端 SHA 与成功 CI/Deploy 一致，才可创建版本 tag/Release。生产资源、凭据权限、删除与恢复见 [运维文档](docs/14-存储迁移部署与运维.md)。

本仓库不包含私人 X 数据、测试视频、凭据或浏览器配置。贡献约定见 [AGENTS.md](AGENTS.md)；原始测试产物仅放 gitignored 目录。

## Brand

Snail brand **1.0.0** is adopted from Hexly commit `352eb2652d4e11c876ef84152fc8e02f8d5ed331`. Navigation uses the actual application theme; browser icons retain the original SVG/ICO. All 21 selected files are byte-for-byte verified with `bun run brand:check`.

[Brand provenance](public/brand/provenance.json) · [Usage guide](public/brand/guide.md) · [Adoption record](docs/15-品牌采用与来源.md). Original geometry/code: MIT; Space Grotesk outlines: SIL OFL 1.1. The two license notices ship with the assets. Application and brand versions are independent.
