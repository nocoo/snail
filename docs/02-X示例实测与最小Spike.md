# 02｜X 示例实测与最小 Spike

本篇记录前半段的公开单链接、下载/Range 及本地 Worker 实验；用户后续授权的 **OpenCLI 真实书签认证**见 [07](07-X登录与认证可行性.md)，原版下载失败及精确 MP4 接力见 [08](08-OpenCLI登录桥与开源下载器源码研究.md)。这些后续实证决定当前认证 Gate，不能仅用本篇匿名成功作产品结论。[81][82]

本篇保存实测结果，不包含视频、缩略图、原始网页或认证信息。外部资料的编号见 [11](11-Sources与证据索引.md)，本篇实验整体记为证据 E01–E06 / 来源 [56]。

## 1. E01：实验条件与边界

| 项目 | 本次实际条件 |
| --- | --- |
| 输入 | `https://x.com/girlofflorence/status/2098577796398567727?s=46` |
| 规范化来源 | `https://x.com/girlofflorence/status/2098577796398567727` |
| 请求时段 | 2026-09-12 11:02–11:08 UTC，即北京时间 19:02–19:08 |
| 工具 | curl 8.7.1；Python 3.14.7；Node v26.8.1；ffprobe 9.0.1 |
| 临时目录 | `/tmp/snail-research-iKKC3rYb/`，macOS 实际路径对应 `/private/tmp/…` |
| 请求方式 | 普通 HTTPS GET/HEAD；`Accept-Encoding: identity`；User-Agent 为 `snail-feasibility-research/0.1` |
| 凭据 | 没有 Cookie、Authorization、浏览器 profile 或人工提供的会话；curl 使用 `--disable` 忽略个人配置 |
| 控制 | 连接超时 12 秒，普通探测总超时 40 秒；媒体完整下载上限 20,000,000 字节；只使用本例返回的媒体地址 |
| 不执行 | X 发帖/点赞/收藏写操作、登录、guest 凭据生成、验证码求解、DRM 解密、HLS 密钥请求、代理轮换 |
| 产物 | 请求结果 JSON、脱敏表、脚本及 ffprobe 输出在临时目录；实验结束清除媒体文件和本地 R2 对象 |

这里的“无绕过”描述实际操作；没有取得版权人许可或 X 抓取许可证明，因此本实验不是合法性认证。X 的服务条款限制未经书面许可的抓取，正式产品必须另行满足适用访问及保存条件。[13]

哈希为响应体原始字节的 SHA-256；没有对 HTML 做排序或清洗后再计算。HEAD 没有响应体，表中的空体哈希不是远端视频哈希。HTTP 状态 `000/0` 表示没收到 HTTP 响应，不解释为服务端状态码。

## 2. E02：元数据入口

| 请求 | 实际状态 | Content-Type | Content-Length 头 | 实收字节 | 语义结果 |
| --- | --- | --- | --- | ---: | --- |
| 原始 X 页面。[1] | 200 | `text/html; charset=UTF-8` | 未提供 | 102600 | OG 元数据及序列化页面状态 |
| oEmbed，`omit_script=true&dnt=true`。[2] | 200，1 次跳转至 `publish.x.com` | `application/json; charset=utf-8` | 未提供 | 923 | 作者、来源、嵌入 HTML，无变体列表 |
| 官方 `/2/tweets/{id}`，带媒体 fields/expansions，不带凭据。[3] | 401 | `application/problem+json` | 99 | 99 | 未授权；没有验证付费/授权后的返回 |
| `cdn.syndication.twimg.com/tweet-result?id=…&lang=en`，未附客户端参数。[4] | 200 | `application/json; charset=utf-8` | 2 | 2 | `{}`；没有媒体 |
| 另一次 oEmbed，仅 `omit_script=true` | 200 | `application/json; charset=utf-8` | 未提供 | 905 | 同一帖子，嵌入 HTML 参数不同 |

本次使用的官方查询参数是 `expansions=attachments.media_keys`、`media.fields=type,url,preview_image_url,duration_ms,width,height,variants`、`tweet.fields=created_at,author_id,attachments`。官方数据字典确实提供 `variants` 字段；401 只能说明本次匿名请求不具备授权，不能说明接口不支持视频。[9][10]

| 可确认的元数据 | 观测值 | 来自哪里 |
| --- | --- | --- |
| 帖子 ID | `2098577796398567727` | URL、页面 |
| 作者 | `𝐟𝐥𝐨𝐫𝐞𝐧𝐜𝐞.`，`@girlofflorence` | 页面、oEmbed |
| 正文 | `one room like this and i will spend whole life here.` | 页面、oEmbed |
| 发布时间 | `2026-09-12T01:01:51Z`，北京时间 09:01:51 | 页面 `created_at_ms=1789174911000` |
| 媒体 ID | `2098577761237700609` | 页面媒体实体 |
| 类型 | `video` | 页面媒体实体 |
| 原始尺寸字段 | 720×1280 | 页面 `original_info`；不是对母版文件的证明 |
| 来源声明时长 | 7082 ms | 页面 `duration_millis` |
| 敏感标记 | 页面 `possibly_sensitive` 为 false、媒体 warning 为 null | 仅记录返回字段，不作内容权利判断 |
| 封面 | `pbs.twimg.com/amplify_video_thumb/…` | 页面 OG 和媒体实体 |

以上是本例的实际返回，不是对所有帖子的字段保证。[1][2]

### 页面解析观察

本次 HTML 不是一个可直接 `JSON.parse(window.__INITIAL_STATE__)` 的旧式快照：没有该变量；媒体出现在带 `$R[…]` 引用的序列化 JavaScript 对象中，实体类型包含 `ApiMediaEntityVideoVariant`。[1]

实验只在大小受限的字符串中提取已观察到的 `bitrate / content_type / url` 字段，**没有执行 eval 或网页脚本**。相同四个变体在页面状态中重复出现两次，本地 Worker 提取到 8 条记录、去重后 4 个 URL。[56]

因此，这个 parser 是证明本例可取字段的实验，不是可发布的通用 X 解析器。后续实现必须绑定目标帖子及媒体实体，拒绝推荐帖/引用帖混入，给 schema 版本设置回归样本，未知结构只降级为书签。

## 3. E03：媒体变体与下载

### 返回的四种变体

| 类型 | 尺寸 | 页面 bitrate（bit/s） | HEAD Content-Length | 本次处理 |
| --- | --- | ---: | ---: | --- |
| MP4。[53] | 320×568 | 632000 | 505479 | HEAD＋前 1024 字节 |
| MP4。[52] | 480×852 | 950000 | 787558 | HEAD＋前 1024 字节 |
| MP4。[5] | 720×1280 | 2176000 | 1729313 | HEAD＋完整文件＋首段/尾段/越界 Range |
| HLS master。[6] | 清单内有上述三档 | 页面为 null | GET 实收 1126 | 只检查清单及选定的高档音视频子清单 |

页面字段名是 `bitrate`；官方 API 字典示例使用 `bit_rate`，归一化时需要处理差异。[1][10]

最高 MP4 的实际 URL：

```text
https://video.twimg.com/amplify_video/2098577761237700609/vid/avc1/720x1280/Qzj42yRv5tl0ZFBG.mp4?tag=29
```

其他 URL 在 Sources [6][7][52][53][54][55] 中完整列出。没有观察到显式失效时间参数；这不证明 URL 永不过期，也不把 `tag=29` 解释为访问凭据。

### 实际媒体响应

| 请求 | HTTP | Content-Type | 实收字节 | Content-Range / 总长 |
| --- | ---: | --- | ---: | --- |
| 320 MP4 HEAD | 200 | `video/mp4` | 0 | `Content-Length: 505479` |
| 320 MP4 `bytes=0-1023` | 206 | `video/mp4` | 1024 | `bytes 0-1023/505479` |
| 480 MP4 HEAD | 200 | `video/mp4` | 0 | `Content-Length: 787558` |
| 480 MP4 `bytes=0-1023` | 206 | `video/mp4` | 1024 | `bytes 0-1023/787558` |
| 720 MP4 HEAD | 200 | `video/mp4` | 0 | `Content-Length: 1729313` |
| 720 MP4 GET 完整 | 200 | `video/mp4` | 1729313 | `Content-Length: 1729313` |
| 720 MP4 `bytes=0-1023` | 206 | `video/mp4` | 1024 | `bytes 0-1023/1729313` |
| 720 MP4 `bytes=-1024` | 206 | `video/mp4` | 1024 | `bytes 1728289-1729312/1729313` |
| 720 MP4 `bytes=999999999-1000000000` | 416 | `video/mp4` | 0 | `bytes */1729313` |
| 封面 GET | 200 | `image/webp` | 169456 | `Content-Length: 169456` |
| HLS master GET | 200 | `application/x-mpegURL` | 1126 | `Content-Length: 1126` |
| HLS 720 视频子清单 GET | 200 | `application/x-mpegURL` | 403 | `Content-Length: 403` |
| HLS 128 kbps 音频子清单 GET | 200 | `application/x-mpegURL` | 494 | `Content-Length: 494` |

这些媒体响应均带 `Accept-Ranges: bytes`；MP4 的首尾实收字节分别与完整文件的相应切片完全相等。相关下载均没有携带 cookie、Authorization 或 Referer。[56]

MP4 响应还带 `Last-Modified: Sat, 12 Sep 2026 00:59:42 GMT` 和 `Cache-Control: max-age=604800, must-revalidate`；缓存时间不是文件授权期限或 URL 有效期。[5]

### ffprobe 与文件结构

| 检查 | 真实结果 |
| --- | --- |
| 视频轨 | H.264，720×1280，轨道时长 7.100460 秒，bit_rate 1809729 |
| 音频轨 | AAC，轨道时长 7.128526 秒，bit_rate 128000 |
| 容器 | 时长 7.128526 秒，size 1729313，bit_rate 1940724 |
| MP4 顶层 box | `ftyp` offset 0、size 24；`moov` offset 24、size 8927；`mdat` offset 8951、size 1720304；末尾 `free` size 58 |
| 前 8 字节 | `0000001866747970`，对应大小及 `ftyp` |

本例已有完整音视频 MP4，下载不需要 ffmpeg；只运行 ffprobe 读取本地文件信息，没有转码或合流。ffprobe 的用途及输出选项有官方文档可查。[51]

HLS master 显示三档视频和三个音频组，高档视频 `BANDWIDTH=1954689`，音频组为 `audio-128000`；高档视频子清单含初始化片段与两个媒体片段，音频子清单含初始化片段与三个媒体片段。[6][54][55]

所检查的 master、高档视频和音频清单没有 `EXT-X-KEY` 或 `EXT-X-SESSION-KEY`。没有下载分片或尝试解密；该观察不能代表未检查的清单或其他帖子。[6][54][55]

## 4. E04：SHA-256 证据表

| 响应体 | 字节 | SHA-256 |
| --- | ---: | --- |
| 原始 X HTML | 102600 | `30707063a0712ef9268c8163f0731ee30a17d6f22c492414979bfc59bc81ec36` |
| oEmbed，含 dnt | 923 | `0f73767d8915b4438d0a44d6340fc82927714458539c5f227859dcacffec9827` |
| 官方 API 401 响应 | 99 | `8f20ff0c6196b3d88227a60b7b32325bae08a23c17051edb358c5e321540d76f` |
| syndication 空对象 | 2 | `44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a` |
| 320 MP4 前 1024 字节 | 1024 | `ff604edaae0bb121dea4fca852832f6bd22556e72a41ea4cc289ce89e2eefae7` |
| 480 MP4 前 1024 字节 | 1024 | `44ac400e8b9bcf305ebdf189cf9539ed465e2933f13e37f2db780d5bfb83b809` |
| 720 MP4 完整文件 | 1729313 | `2ee43bb5411bbae7baaa856bbb36debc01fe97d7f2b4cd288d72684d4994ea1e` |
| 720 MP4 前 1024 字节 | 1024 | `758392a965eedcad844356012969c5937b38852b1dc64ba22d608ca9cae7a0d6` |
| 720 MP4 后 1024 字节 | 1024 | `0e3cd712cc0f2f325fe4c852551b0f8485be08e4fc5b9f46b679a40bbf33bd61` |
| 封面完整文件 | 169456 | `0b6137cac80d6f293f58e03b9e5d32e95fa057b0c00b2ccac7931eca13524d1b` |
| HLS master | 1126 | `7b53d90b8b687e9ef9a72d5e991f0452559a036979235d956fba07f8d523de6e` |
| HLS 视频子清单 | 403 | `e45fc62e9c7a39ce1107022255ce22fce4b82ded8b893464279d6ccb3b676514` |
| HLS 音频子清单 | 494 | `9559a7ca91842de92545dc1966697bebf4a7e96f3aa4ea89e6f24a1a9446eccc` |
| 空响应体：HEAD、越界 416 | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

哈希相同证明本次字节一致，不证明视频权利归属、母版身份或无恶意内容。动态页面含时间变化字段，复测 HTML 不应要求固定哈希；媒体若发生变化，也应生成新的证据记录而非强行匹配旧值。

## 5. E05：Worker → R2 最小实验

### 实际环境

- `miniflare 4.20260730.0`、`workerd 1.20260730.1`，兼容日期 `2026-08-06`。
- 最新取回的 Workers 类型包为 `5.20260911.1`，用于核对 API 资料，不作为本地运行时版本。
- 使用 Miniflare 自带 R2 模拟绑定与本机临时持久化目录；出站 `fetch()` 直接访问真实 X/CDN，没有拦截成 mock，也没有用 curl 代替 Worker 出站网络。
- 没有调用 Cloudflare 账号 API、创建云端桶或部署 Worker。官方本地开发及 Miniflare 文档描述了这类本地运行/存储测试能力。[23][24]

### 结果

以下“入口状态”是本地 Worker 返回的 Response 状态；R2 binding 是方法调用，**没有声称取得真实云端 R2 的 HTTP 200**。

| 实验入口 | 入口状态 | 上游状态 / 类型 | 写入与读回 |
| --- | ---: | --- | --- |
| `/resolve` | 200 | X 200，`text/html; charset=UTF-8`，102601 字节 | 提取 8 条记录，4 个不同变体 |
| `/copy?mode=direct` | 200 | CDN 200，`video/mp4` | 直接传 `response.body`；写入 1729313 字节；读回匹配完整 MP4 哈希 |
| `/copy?mode=unknown` | 500 | 已取得媒体流 | 普通 TransformStream 导致长度未知；见下方原始错误 |
| `/copy?mode=fixed` | 200 | CDN 200，`video/mp4` | 计数 1729313；上传中 SHA-256 与 R2 读回均匹配 |
| `/copy?kind=thumbnail&mode=fixed` | 200 | CDN 200，`image/webp` | 计数 169456；上传中 SHA-256 与 R2 读回均匹配 |
| `/read?key=video/fixed` | 200 | 本地 R2 返回视频 | 1729313 字节；完整哈希相同 |
| 同上，`bytes=0-1023` | 206 | `video/mp4` | `bytes 0-1023/1729313`；1024 字节；首段哈希相同 |
| 同上，越界 | 416 | `video/mp4` | `bytes */1729313`；空体 |
| `/read?key=thumbnail/fixed` | 200 | 本地 R2 返回封面 | 169456 字节；完整哈希相同 |
| 同上，`bytes=0-1023` | 206 | `image/webp` | 1024 字节；SHA-256 `ba7cc33d8ffd3004d15c207ce45371dbb68586bd69d84cff2b9955317add0ff9` |
| 同上，越界 | 416 | `image/webp` | `bytes */169456`；空体 |

长度未知实验的真实错误为：

```text
TypeError: Provided readable stream must have a known length
(request/response body or readable half of FixedLengthStream)
```

该入口的错误 JSON 为 134 字节，SHA-256 为 `25ed7148ace852ab35b8d775cab234a69ded755da7bb9bebd4f13a3b696e1f12`。它是有意对流长度约束的测试，不是 X 拒绝访问。

成功的视频流在 R2 模拟绑定获得 ETag `9fd638c306d13a720c9bfbb035eb41ee`，与 SHA-256 是不同字段；不要将 ETag 当成跨存储方式都成立的内容哈希。[17][56]

### 有效的数据流

```text
真实 CDN response.body
  → 有背压的 TransformStream：逐块计数、写入 DigestStream
  → FixedLengthStream(已校验的 Content-Length)
  → R2.put(randomKey, readable)

并行等待 pipeTo 与 put 完成
  → 取 SHA-256
  → R2.get 后再次用 DigestStream 校验
```

`crypto.DigestStream` 不保留输入数据，支持流式摘要；`FixedLengthStream` 会在输入过多或过少时出错，R2 API 接受 ReadableStream。[17][20][21]

本例没有读取整个视频到 Worker 的 ArrayBuffer；Node 测试驱动为核对 1.7 MB 读回结果使用了缓冲，这与生产 Worker 的内存设计不同。本次没有测量峰值内存或 CPU 时间，也没有证明大文件、并发、断流恢复或云端费用符合目标。

### 实验环境遇到的问题

1. 未固定版本时 npm 返回 Miniflare `5.20260911.0-alpha`，与本实验使用的构造参数不兼容；改为上述固定 4.x 版本。
2. 4.x 所带 workerd 不接受 `2026-09-12` 兼容日期，提示其最大日期为 `2026-08-06`；采用该日期后继续。
3. 从 snail 目录引用外部临时模块曾触发 workerd 路径错误；改在 `/private/tmp/…/runtime` 执行后成功。

这些是本机工具配置问题，不作为“云端 Workers 不支持”的证据。调试时自动生成的 snail `.wrangler/cache` 已移除。

## 6. E06：下载器与未完成验证

对固定 commit 的 yt-dlp 执行了匿名 **通用 HTML extractor** 实验，使用 `--ignore-config --no-plugin-dirs --no-cache-dir --no-cookies --no-cookies-from-browser --force-generic-extractor --skip-download` 等参数。结果为退出码 1，标准输出 `null`，错误 `Unsupported URL`。[38][56]

该失败不代表 yt-dlp 的专用 Twitter extractor 全部不可用；本次没有执行其 guest/GraphQL/syndication 凭据路径。源码中专用路径与通用 HTML 路径不同，syndication 实现还带客户端参数及特定 User-Agent。[38]

E06 最初只审查了 OpenCLI、gallery-dl、Twikit、twitter-api-client 源码。**后续用户授权后，已经运行本机 OpenCLI 1.8.6 的真实会话**：Bookmarks 两页成功、示例命中，原版 download 失败，精确 MP4 接力成功；详见 07/08。[81][82] 其余下载器的真实账号会话仍未执行，不把“源码支持”记为运行成功。

尚未验证：

- 真正云端 Worker 出口 IP、区域、challenge、限流与相同页面结构。
- 真正 R2 对象写入、云端 Range、CORS、鉴权、缓存隔离和删除传播。
- 官方 API 有权限和余额时，本例是否返回全部变体及实际账单。
- 浏览器会话跨日/重启/撤销、全历史采集、HLS 合流、多视频帖、长视频、不同格式或不兼容文件；有限窗口本机会话已通过。[81]
- 实际断点续传：本次验证了独立 Range 切片，未验证持久化续传状态和文件拼接。
- DRM/付费/私密内容的访问：不在允许范围，未测试，不纳入成功率分母。

## 7. 复现方法

复测前先确认来源仍公开且访问及保存方式获得允许；若出现登录、challenge、付费或保护提示，停止并记录，不改变身份或调用求解器。

### HTTP 与哈希

以下命令只写新建临时目录；`video_url` 应取当次正常来源返回的地址，不能把旧地址作为绕过新权限状态的方法。

```sh
spike_dir="$(mktemp -d /tmp/snail-http-XXXXXXXX)"
video_url='https://video.twimg.com/amplify_video/2098577761237700609/vid/avc1/720x1280/Qzj42yRv5tl0ZFBG.mp4?tag=29'
curl --disable --silent --show-error --proto '=https' \
  --connect-timeout 12 --max-time 40 --max-filesize 20000000 \
  -H 'Accept-Encoding: identity' -A 'snail-feasibility-research/0.1' \
  -D "$spike_dir/full.headers" -o "$spike_dir/full.mp4" \
  -w '%{http_code} %{content_type} %{size_download}\n' "$video_url"
curl --disable --silent --show-error --proto '=https' \
  --connect-timeout 12 --max-time 40 --max-filesize 20000000 \
  -H 'Accept-Encoding: identity' -H 'Range: bytes=0-1023' \
  -A 'snail-feasibility-research/0.1' \
  -D "$spike_dir/range.headers" -o "$spike_dir/range.bin" \
  -w '%{http_code} %{content_type} %{size_download}\n' "$video_url"
shasum -a 256 "$spike_dir/full.mp4" "$spike_dir/range.bin"
ffprobe -v error -show_entries format=duration,size,bit_rate:stream=codec_name,codec_type,width,height,duration -of json "$spike_dir/full.mp4"
```

在临时脚本中比较 `range.bin == full.mp4[:1024]`；尾段改用 `Range: bytes=-1024`，越界使用表中的范围。HEAD 的下载体长度必须记为 0，文件总长取响应头。失败响应也保存大小和哈希，但不当成视频。

### 本次 Worker 实验定位

本次实际脚本未加入仓库，临时文件的 SHA-256 用于确认检查的是同一份实验：

| 临时脚本 | SHA-256 |
| --- | --- |
| `probe.py` | `15cc9b7a2f5aaa1a8430fa968abf99d80f04f8d47b16463b582d8666068a730a` |
| `runtime/worker.mjs` | `d4817c0b56d3a26257e66c12fa22d146f9012b5fec98cafdd24ac5bb3b22cccb` |
| `runtime/run.mjs` | `0412e27eef3f38df663773b6a0f5e21dfa6ca31266f8a0e16899175b309f41a6` |

重新创建等价实验时，在独立临时目录固定安装 `miniflare@4.20260730.0`，仅配置 `r2Buckets`、临时持久化路径和上述运行时支持的兼容日期；按照第 5 节分别测试直接流、普通 TransformStream、FixedLengthStream 三条路径，并记录每条路径的大小、摘要、错误与读回 Range。不能用这份本地结果替代 [10](10-推荐MVP阶段计划与验收.md) 中的云端验收。

临时目录不是长期证据仓库；被清理后，应按本篇方法生成新的记录。上游代码 commit 和公开 Sources 列在 03、11，实验结论及完整关键哈希已保留在本篇。

[1]: 11-Sources与证据索引.md#s1
[2]: 11-Sources与证据索引.md#s2
[3]: 11-Sources与证据索引.md#s3
[4]: 11-Sources与证据索引.md#s4
[5]: 11-Sources与证据索引.md#s5
[6]: 11-Sources与证据索引.md#s6
[7]: 11-Sources与证据索引.md#s7
[9]: 11-Sources与证据索引.md#s9
[10]: 11-Sources与证据索引.md#s10
[13]: 11-Sources与证据索引.md#s13
[17]: 11-Sources与证据索引.md#s17
[20]: 11-Sources与证据索引.md#s20
[21]: 11-Sources与证据索引.md#s21
[23]: 11-Sources与证据索引.md#s23
[24]: 11-Sources与证据索引.md#s24
[38]: 11-Sources与证据索引.md#s38
[51]: 11-Sources与证据索引.md#s51
[52]: 11-Sources与证据索引.md#s52
[53]: 11-Sources与证据索引.md#s53
[54]: 11-Sources与证据索引.md#s54
[55]: 11-Sources与证据索引.md#s55
[56]: 11-Sources与证据索引.md#s56
[81]: 11-Sources与证据索引.md#s81
[82]: 11-Sources与证据索引.md#s82
