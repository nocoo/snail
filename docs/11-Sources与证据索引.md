# 11｜Sources 与证据索引

检索与实测日期：2026-09-12（Asia/Shanghai）。本文列真实访问来源，不生成不存在的网页、API 成功或凭据；Git 源码用固定 commit，本机安装版另列。

正文引用格式 `[n]` 跳转本页对应编号。官方文档支持“契约/限制”，源码支持“实现机制”，本机记录支持“这一次观察”，三者不能互相替代。价格与维护快照均有时间性；没有生产可用率或法律授权证明。

## 1. 记录方法与来源范围

HTTP 用忽略个人 curl 配置的探测器，白名单记录状态、Content-Type、响应体字节数与 SHA-256；GET/HEAD、Range、CLI exit 与真实网络状态分开。某些传输编码由浏览器/客户端解码，书签页大小为解码后的 JSON 字节；HEAD 的体大小为 0，不能当目标文件大小。

私人书签观察器只导出统计、状态与摘要；没有将账号身份、其他书签内容、cookie、Authorization/CSRF 值、cursor 或原始会话材料放入本文。编号 56/81/82/83 是本研究证据，不伪装成外部权威。

## 2. 全局编号 Sources

<a id="s1"></a>

### 1. 给定 X 公开帖子

来源：[https://x.com/girlofflorence/status/2098577796398567727?s=46](https://x.com/girlofflorence/status/2098577796398567727?s=46)。

实取：2026-09-12T11:02:06.671898+00:00；HTTP **200**；`text/html; charset=UTF-8`；体 **102,600** 字节；SHA-256 `30707063a0712ef9268c8163f0731ee30a17d6f22c492414979bfc59bc81ec36`。

<a id="s2"></a>

### 2. 给定帖子的 oEmbed 响应

来源：[https://publish.twitter.com/oembed?url=https%3A%2F%2Fx.com%2Fgirlofflorence%2Fstatus%2F2098577796398567727&omit_script=true&dnt=true](https://publish.twitter.com/oembed?url=https%3A%2F%2Fx.com%2Fgirlofflorence%2Fstatus%2F2098577796398567727&omit_script=true&dnt=true)。

实取：2026-09-12T11:02:06.671844+00:00；HTTP **200**；`application/json; charset=utf-8`；体 **923** 字节；SHA-256 `0f73767d8915b4438d0a44d6340fc82927714458539c5f227859dcacffec9827`。

最终 URL：[https://publish.x.com/oembed?url=https%3A%2F%2Fx.com%2Fgirlofflorence%2Fstatus%2F2098577796398567727&omit_script=true&dnt=true](https://publish.x.com/oembed?url=https%3A%2F%2Fx.com%2Fgirlofflorence%2Fstatus%2F2098577796398567727&omit_script=true&dnt=true)。

<a id="s3"></a>

### 3. 给定帖子的匿名官方 API 请求

来源：[https://api.x.com/2/tweets/2098577796398567727?expansions=attachments.media_keys&media.fields=type,url,preview_image_url,duration_ms,width,height,variants&tweet.fields=created_at,author_id,attachments](https://api.x.com/2/tweets/2098577796398567727?expansions=attachments.media_keys&media.fields=type,url,preview_image_url,duration_ms,width,height,variants&tweet.fields=created_at,author_id,attachments)。

实取：2026-09-12T11:02:06.671557+00:00；HTTP **401**；`application/problem+json`；体 **99** 字节；SHA-256 `8f20ff0c6196b3d88227a60b7b32325bae08a23c17051edb358c5e321540d76f`。

<a id="s4"></a>

### 4. 不带客户端凭据参数的 syndication

来源：[https://cdn.syndication.twimg.com/tweet-result?id=2098577796398567727&lang=en](https://cdn.syndication.twimg.com/tweet-result?id=2098577796398567727&lang=en)。

实取：2026-09-12T11:02:06.672982+00:00；HTTP **200**；`application/json; charset=utf-8`；体 **2** 字节；SHA-256 `44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a`。

<a id="s5"></a>

### 5. 示例 720×1280 MP4

来源：[https://video.twimg.com/amplify_video/2098577761237700609/vid/avc1/720x1280/Qzj42yRv5tl0ZFBG.mp4?tag=29](https://video.twimg.com/amplify_video/2098577761237700609/vid/avc1/720x1280/Qzj42yRv5tl0ZFBG.mp4?tag=29)。

实取：2026-09-12T11:03:50.593912+00:00；HTTP **200**；`video/mp4`；体 **1,729,313** 字节；SHA-256 `2ee43bb5411bbae7baaa856bbb36debc01fe97d7f2b4cd288d72684d4994ea1e`。

<a id="s6"></a>

### 6. 示例 HLS master

来源：[https://video.twimg.com/amplify_video/2098577761237700609/pl/db0908-KaYbd04wQ.m3u8?tag=29](https://video.twimg.com/amplify_video/2098577761237700609/pl/db0908-KaYbd04wQ.m3u8?tag=29)。

实取：2026-09-12T11:03:49.584070+00:00；HTTP **200**；`application/x-mpegURL`；体 **1,126** 字节；SHA-256 `7b53d90b8b687e9ef9a72d5e991f0452559a036979235d956fba07f8d523de6e`。

<a id="s7"></a>

### 7. 示例封面 WebP

来源：[https://pbs.twimg.com/amplify_video_thumb/2098577761237700609/img/t2j627Ukjjuu1PIr?format=webp&name=large](https://pbs.twimg.com/amplify_video_thumb/2098577761237700609/img/t2j627Ukjjuu1PIr?format=webp&name=large)。

实取：2026-09-12T11:03:51.281189+00:00；HTTP **200**；`image/webp`；体 **169,456** 字节；SHA-256 `0b6137cac80d6f293f58e03b9e5d32e95fa057b0c00b2ccac7931eca13524d1b`。

<a id="s8"></a>

### 8. X 官方 oEmbed API 文档

来源：[https://docs.x.com/x-for-websites/oembed-api](https://docs.x.com/x-for-websites/oembed-api)。

实取：2026-09-12T11:06:17.824937+00:00；HTTP **200**；`text/html; charset=utf-8`；体 **856,339** 字节；SHA-256 `a80bd1b517b4978f7d23f5a3a3acb0f7bd8f322920102fdf5794acb28b5226c5`。

oEmbed 返回嵌入相关元数据；本次媒体变体证据来自样本页面及书签，而非 oEmbed 的媒体下载保证。

<a id="s9"></a>

### 9. X 官方 Post lookup/reference

来源：[https://docs.x.com/x-api/posts/get-post-by-id.md](https://docs.x.com/x-api/posts/get-post-by-id.md)。

实取：2026-09-12T11:06:17.824833+00:00；HTTP **200**；`text/markdown; charset=utf-8`；体 **64,568** 字节；SHA-256 `c74a521b5f4c83259a61b68186e736e4bb2ed49ff1535a760e860bf99f8e5c56`。

同时核对 lookup introduction；媒体扩展与字段以本条 reference 和第 10 条 data dictionary 为准。

<a id="s10"></a>

### 10. X API data dictionary

来源：[https://docs.x.com/x-api/fundamentals/data-dictionary.md](https://docs.x.com/x-api/fundamentals/data-dictionary.md)。

实取：2026-09-12T11:06:17.822554+00:00；HTTP **200**；`text/markdown; charset=utf-8`；体 **92,347** 字节；SHA-256 `fc4db015c23b8a22e37fe5a9b76d9be67c6f5656cb0a32261f8fdeb45971d6c9`。

<a id="s11"></a>

### 11. X API 当前用量价格与 Owned Reads

来源：[https://docs.x.com/x-api/getting-started/pricing](https://docs.x.com/x-api/getting-started/pricing)。

实取：2026-09-12T11:03:11.768676+00:00；HTTP **200**；`text/markdown; charset=utf-8`；体 **13,981** 字节；SHA-256 `df0b3dfe34fd0e1bf809391dc57e4563e7c10adccf7c2932b8e22aee85460380`。

本次读到 pay-per-usage、Owned Reads 的 App 所有者条件、余额及 soft dedup；价格可变化，本研究未充值或验证账单。

<a id="s12"></a>

### 12. X Developer Policy

来源：[https://developer.x.com/en/developer-terms/policy](https://developer.x.com/en/developer-terms/policy)。

实取：2026-09-12T11:03:11.857041+00:00；HTTP **200**；`text/markdown; charset=utf-8`；体 **29,562** 字节；SHA-256 `cf7b4b9d897252be9a81abd54f7fedd584f6152efbe844f5140afb62f751aba3`。

最终 URL：[https://docs.x.com/developer-terms/policy](https://docs.x.com/developer-terms/policy)。

涉及访问、内容展示更新、离线展示和再分发要求；不把用户同意当完整平台/版权许可。

<a id="s13"></a>

### 13. X Terms of Service

来源：[https://x.com/en/tos](https://x.com/en/tos)。

实取：2026-09-12T11:08:06.143342+00:00；HTTP **200**；`text/html`；体 **288,762** 字节；SHA-256 `71a14ab2612a52ec4c91c79ae40891bc97809d0999190943516490e733e650f0`。

包含未经事先书面许可的 scraping 限制；技术可访问不等于许可已经取得。

<a id="s14"></a>

### 14. Eagle 官方产品与相关功能页

来源：[https://en.eagle.cool/](https://en.eagle.cool/)。

实取：2026-09-12T11:03:12.733865+00:00；HTTP **200**；`text/markdown; charset=utf-8`；体 **38,777** 字节；SHA-256 `b661fd645f55122eefca032bab67de10754ea0c93e7668a51a8a067360bdd7fc`。

同时实际读取以下 Eagle 官方功能页；Eagle 对标事实按相应页面核对：

- [https://en.eagle.cool/support/desktop/collect/save-youtube-vimeo-videos](https://en.eagle.cool/support/desktop/collect/save-youtube-vimeo-videos)，HTTP 200。
- [https://en.eagle.cool/support/article/scanning-for-identical-files](https://en.eagle.cool/support/article/scanning-for-identical-files)，HTTP 200。
- [https://en.eagle.cool/support/article/folders](https://en.eagle.cool/support/article/folders)，HTTP 200。
- [https://en.eagle.cool/support/desktop/browse/video-player](https://en.eagle.cool/support/desktop/browse/video-player)，HTTP 200。

<a id="s15"></a>

### 15. Vite 静态部署

来源：[https://vite.dev/guide/static-deploy.html](https://vite.dev/guide/static-deploy.html)。

实取：2026-09-12T11:03:13.353007+00:00；HTTP **200**；`text/html; charset=UTF-8`；体 **93,086** 字节；SHA-256 `8616d5e9c52ce1198e17a8bdac2da4bd964bf4d1e8d9d6c45271ac8933e99cf5`。

<a id="s16"></a>

### 16. Workers limits

来源：[https://developers.cloudflare.com/workers/platform/limits/](https://developers.cloudflare.com/workers/platform/limits/)。

实取：2026-09-12T11:05:20.474143+00:00；HTTP **200**；`text/html`；体 **248,068** 字节；SHA-256 `7343b1bc3aa307d12e4ca4a5c7af072f6561f7636efeed5d15fcfba440a55035`。

首两次偏好 Markdown 的请求超时；本条是后来真实 HTML 200 的结果。

<a id="s17"></a>

### 17. R2 Workers API binding

来源：[https://developers.cloudflare.com/r2/api/workers/workers-api-reference/](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/)。

实取：2026-09-12T11:02:27.900429+00:00；HTTP **200**；`text/markdown; charset=utf-8`；体 **23,620** 字节；SHA-256 `1f0a586e001deb5cde00a7033b33235aac9b1748adda55392ad3fc20422d04c4`。

<a id="s18"></a>

### 18. R2 limits

来源：[https://developers.cloudflare.com/r2/platform/limits/](https://developers.cloudflare.com/r2/platform/limits/)。

实取：2026-09-12T11:04:11.779303+00:00；HTTP **200**；`text/markdown; charset=utf-8`；体 **7,116** 字节；SHA-256 `a0d0dc316bf10db6e5c29044b7aae131dc98230409f0fe83ef8d7a1fd27a65b6`。

<a id="s19"></a>

### 19. Workers Streams

来源：[https://developers.cloudflare.com/workers/runtime-apis/streams/](https://developers.cloudflare.com/workers/runtime-apis/streams/)。

实取：2026-09-12T11:03:07.919893+00:00；HTTP **200**；`text/markdown; charset=utf-8`；体 **9,154** 字节；SHA-256 `2299957975778d8299710555acf0a87284cfc4dcb51755f8e8483a00f30056d7`。

<a id="s20"></a>

### 20. TransformStream / FixedLengthStream

来源：[https://developers.cloudflare.com/workers/runtime-apis/streams/transformstream/](https://developers.cloudflare.com/workers/runtime-apis/streams/transformstream/)。

实取：2026-09-12T11:06:17.824973+00:00；HTTP **200**；`text/markdown; charset=utf-8`；体 **5,401** 字节；SHA-256 `55bdc35013e1d42f574d03a7ea351fd00f17f95da5cf905c8476b2811e27ed82`。

<a id="s21"></a>

### 21. Workers Web Crypto / DigestStream

来源：[https://developers.cloudflare.com/workers/runtime-apis/web-crypto/](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/)。

实取：2026-09-12T11:03:07.926047+00:00；HTTP **200**；`text/markdown; charset=utf-8`；体 **21,038** 字节；SHA-256 `861c5f9ae81a03e6b145e9b849927384cdfbe60819dbc56460853f65c654c4e7`。

<a id="s22"></a>

### 22. Workers Node.js compatibility

来源：[https://developers.cloudflare.com/workers/runtime-apis/nodejs/](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)。

实取：2026-09-12T11:06:18.633573+00:00；HTTP **200**；`text/markdown; charset=utf-8`；体 **19,107** 字节；SHA-256 `440fcace93220d3ca5fc512f1457967e114bdc9abe95e2d3877fdf34bb2571fd`。

依据兼容性总表确认 child_process 为 non-functional stub；没有把独立子页 404 当功能证据。

<a id="s23"></a>

### 23. Workers 本地开发与测试

来源：[https://developers.cloudflare.com/workers/development-testing/](https://developers.cloudflare.com/workers/development-testing/)。

实取：2026-09-12T11:08:06.144461+00:00；HTTP **200**；`text/html`；体 **292,276** 字节；SHA-256 `7fb11e1c5ecdf0a102186c15a9cb44928c568449fec45ff57ed88b362b6bd4d6`。

最终 URL：[https://developers.cloudflare.com/workers/local-development/](https://developers.cloudflare.com/workers/local-development/)。

本地模拟不是生产部署证据。

<a id="s24"></a>

### 24. Miniflare R2 storage

来源：[https://developers.cloudflare.com/workers/testing/miniflare/storage/r2/](https://developers.cloudflare.com/workers/testing/miniflare/storage/r2/)。

实取：2026-09-12T11:08:06.144560+00:00；HTTP **200**；`text/html`；体 **174,723** 字节；SHA-256 `618c36a56d2cff3358c43cf93a0f572af70b7a06e740430cfdc75f77292f85f4`。

<a id="s25"></a>

### 25. R2 对象生命周期

来源：[https://developers.cloudflare.com/r2/buckets/object-lifecycles/](https://developers.cloudflare.com/r2/buckets/object-lifecycles/)。

实取：2026-09-12T11:04:11.779215+00:00；HTTP **200**；`text/markdown; charset=utf-8`；体 **9,729** 字节；SHA-256 `1abb354d0b8d7242ee279702f81048f27c2e9d8151a202367d387dc0ed88d520`。

正文涉及对象/未完成 multipart 生命周期；不代表立即删除承诺。

<a id="s26"></a>

### 26. R2 S3 预签名 URL

来源：[https://developers.cloudflare.com/r2/api/s3/presigned-urls/](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)。

实取：2026-09-12T11:05:20.478366+00:00；HTTP **200**；`text/html`；体 **149,498** 字节；SHA-256 `7c73ac53b8588d3ab3a5b6077a83c3acd4579ca6f5b9c21e6c4556e887228fc4`。

<a id="s27"></a>

### 27. R2 CORS

来源：[https://developers.cloudflare.com/r2/buckets/cors/](https://developers.cloudflare.com/r2/buckets/cors/)。

实取：2026-09-12T11:04:12.278907+00:00；HTTP **200**；`text/markdown; charset=utf-8`；体 **15,039** 字节；SHA-256 `2d61da4a058069f6f95a95b30e9bc13974621975e3a00bea19a360e2790325ba`。

<a id="s28"></a>

### 28. Queues 投递保证

来源：[https://developers.cloudflare.com/queues/reference/delivery-guarantees/](https://developers.cloudflare.com/queues/reference/delivery-guarantees/)。

实取：2026-09-12T11:03:08.499821+00:00；HTTP **200**；`text/markdown; charset=utf-8`；体 **3,804** 字节；SHA-256 `6b8877002ff716303438e7b333baaec5610389b110efba44da6239b8aed3de13`。

<a id="s29"></a>

### 29. Queues limits

来源：[https://developers.cloudflare.com/queues/platform/limits/](https://developers.cloudflare.com/queues/platform/limits/)。

实取：2026-09-12T11:04:12.485089+00:00；HTTP **200**；`text/markdown; charset=utf-8`；体 **11,717** 字节；SHA-256 `a11611f7c08178c9bfe164d48f33865b5834b4d0c825a72804fb86fcfacb87c5`。

与 pricing 的 Queue CPU 描述有差异，设计不依赖较大值。

<a id="s30"></a>

### 30. D1 SQL statements / FTS5

来源：[https://developers.cloudflare.com/d1/sql-api/sql-statements/](https://developers.cloudflare.com/d1/sql-api/sql-statements/)。

实取：2026-09-12T11:03:09.079971+00:00；HTTP **200**；`text/markdown; charset=utf-8`；体 **36,661** 字节；SHA-256 `2737652dbe889e9206057297854a6e019e715c6ac8a4814e2b93dbf601c9e999`。

<a id="s31"></a>

### 31. SQLite FTS5 官方说明

来源：[https://sqlite.org/fts5.html](https://sqlite.org/fts5.html)。

实取：2026-09-12T11:08:06.145476+00:00；HTTP **200**；`text/html; charset=utf-8`；体 **210,915** 字节；SHA-256 `aa965064eb7d3f5c2040edfba900e7d96ce88412fdb672176f4b3dcc8d89089c`。

<a id="s32"></a>

### 32. OWASP SSRF Prevention Cheat Sheet

来源：[https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)。

实取：2026-09-12T11:08:06.142074+00:00；HTTP **200**；`text/html; charset=utf-8`；体 **108,030** 字节；SHA-256 `c6d2b8d345fe30e844be04e2b469a67f40f3dd9bb6d13c95dfc87cece03df5b0`。

<a id="s33"></a>

### 33. R2 pricing

来源：[https://developers.cloudflare.com/r2/pricing/](https://developers.cloudflare.com/r2/pricing/)。

实取：2026-09-12T11:02:27.904951+00:00；HTTP **200**；`text/markdown; charset=utf-8`；体 **12,658** 字节；SHA-256 `fdc974e3a9531ceecb982ced7f30262f40dc942fc8c709004bfd488958fd8718`。

<a id="s34"></a>

### 34. Workers pricing

来源：[https://developers.cloudflare.com/workers/platform/pricing/](https://developers.cloudflare.com/workers/platform/pricing/)。

实取：2026-09-12T11:02:28.405660+00:00；HTTP **200**；`text/markdown; charset=utf-8`；体 **42,601** 字节；SHA-256 `074d01abe222c27116db801ff14f5d3478c29625d53d0919f346a0cc02f905bf`。

<a id="s35"></a>

### 35. D1 pricing

来源：[https://developers.cloudflare.com/d1/platform/pricing/](https://developers.cloudflare.com/d1/platform/pricing/)。

实取：2026-09-12T11:03:08.626769+00:00；HTTP **200**；`text/markdown; charset=utf-8`；体 **10,436** 字节；SHA-256 `c7530affcf1e5f6ca73edb8621639bfa85b067aeeed9ae0a035107d319b70253`。

<a id="s36"></a>

### 36. Queues pricing

来源：[https://developers.cloudflare.com/queues/platform/pricing/](https://developers.cloudflare.com/queues/platform/pricing/)。

实取：2026-09-12T11:05:20.476064+00:00；HTTP **200**；`text/html`；体 **104,887** 字节；SHA-256 `bd2f4d5d096070ef802fbd6eae5009e5b2720f808e505576bdee85c15b150791`。

<a id="s37"></a>

### 37. OpenCLI 上游固定源码

独立只读 clone：[固定 commit 8271afc67e8504bda94c147f446ee29775d08274](https://github.com/jackwener/OpenCLI/tree/8271afc67e8504bda94c147f446ee29775d08274)。本地路径、commit 时间、维护度与依赖判断见 03；这里不把 Git clone 冒充成某个 HTTP API 200。

实际审查入口：

- [LICENSE](https://github.com/jackwener/OpenCLI/blob/8271afc67e8504bda94c147f446ee29775d08274/LICENSE)
- [package.json](https://github.com/jackwener/OpenCLI/blob/8271afc67e8504bda94c147f446ee29775d08274/package.json)
- [clis/twitter/download.js](https://github.com/jackwener/OpenCLI/blob/8271afc67e8504bda94c147f446ee29775d08274/clis/twitter/download.js)
- [clis/twitter/bookmarks.js](https://github.com/jackwener/OpenCLI/blob/8271afc67e8504bda94c147f446ee29775d08274/clis/twitter/bookmarks.js)
- [clis/twitter/auth.js](https://github.com/jackwener/OpenCLI/blob/8271afc67e8504bda94c147f446ee29775d08274/clis/twitter/auth.js)
- [src/download/index.ts](https://github.com/jackwener/OpenCLI/blob/8271afc67e8504bda94c147f446ee29775d08274/src/download/index.ts)
- [src/download/media-download.ts](https://github.com/jackwener/OpenCLI/blob/8271afc67e8504bda94c147f446ee29775d08274/src/download/media-download.ts)
- [extension/manifest.json](https://github.com/jackwener/OpenCLI/blob/8271afc67e8504bda94c147f446ee29775d08274/extension/manifest.json)
- [src/daemon.ts](https://github.com/jackwener/OpenCLI/blob/8271afc67e8504bda94c147f446ee29775d08274/src/daemon.ts)

<a id="s38"></a>

### 38. yt-dlp 上游固定源码

独立只读 clone：[固定 commit bbc809a1161d3bfca51fa36f59dda35556ee85a0](https://github.com/yt-dlp/yt-dlp/tree/bbc809a1161d3bfca51fa36f59dda35556ee85a0)。本地路径、commit 时间、维护度与依赖判断见 03；这里不把 Git clone 冒充成某个 HTTP API 200。

实际审查入口：

- [LICENSE](https://github.com/yt-dlp/yt-dlp/blob/bbc809a1161d3bfca51fa36f59dda35556ee85a0/LICENSE)
- [THIRD_PARTY_LICENSES.txt](https://github.com/yt-dlp/yt-dlp/blob/bbc809a1161d3bfca51fa36f59dda35556ee85a0/THIRD_PARTY_LICENSES.txt)
- [pyproject.toml](https://github.com/yt-dlp/yt-dlp/blob/bbc809a1161d3bfca51fa36f59dda35556ee85a0/pyproject.toml)
- [yt_dlp/extractor/twitter.py](https://github.com/yt-dlp/yt-dlp/blob/bbc809a1161d3bfca51fa36f59dda35556ee85a0/yt_dlp/extractor/twitter.py)
- [yt_dlp/cookies.py](https://github.com/yt-dlp/yt-dlp/blob/bbc809a1161d3bfca51fa36f59dda35556ee85a0/yt_dlp/cookies.py)
- [README.md](https://github.com/yt-dlp/yt-dlp/blob/bbc809a1161d3bfca51fa36f59dda35556ee85a0/README.md)

<a id="s39"></a>

### 39. gallery-dl 上游固定源码

独立只读 clone：[固定 commit d9eebbea041a52e347a2b181bdd64536a875d004](https://github.com/mikf/gallery-dl/tree/d9eebbea041a52e347a2b181bdd64536a875d004)。本地路径、commit 时间、维护度与依赖判断见 03；这里不把 Git clone 冒充成某个 HTTP API 200。

实际审查入口：

- [LICENSE](https://github.com/mikf/gallery-dl/blob/d9eebbea041a52e347a2b181bdd64536a875d004/LICENSE)
- [setup.py](https://github.com/mikf/gallery-dl/blob/d9eebbea041a52e347a2b181bdd64536a875d004/setup.py)
- [gallery_dl/extractor/twitter.py](https://github.com/mikf/gallery-dl/blob/d9eebbea041a52e347a2b181bdd64536a875d004/gallery_dl/extractor/twitter.py)
- [gallery_dl/cookies.py](https://github.com/mikf/gallery-dl/blob/d9eebbea041a52e347a2b181bdd64536a875d004/gallery_dl/cookies.py)

<a id="s40"></a>

### 40. Twikit 上游固定源码

独立只读 clone：[固定 commit c3b7220866f8582009fe2d1155b6fe92192a2711](https://github.com/d60/twikit/tree/c3b7220866f8582009fe2d1155b6fe92192a2711)。本地路径、commit 时间、维护度与依赖判断见 03；这里不把 Git clone 冒充成某个 HTTP API 200。

实际审查入口：

- [LICENSE](https://github.com/d60/twikit/blob/c3b7220866f8582009fe2d1155b6fe92192a2711/LICENSE)
- [setup.py](https://github.com/d60/twikit/blob/c3b7220866f8582009fe2d1155b6fe92192a2711/setup.py)
- [twikit/client/client.py](https://github.com/d60/twikit/blob/c3b7220866f8582009fe2d1155b6fe92192a2711/twikit/client/client.py)
- [twikit/client/gql.py](https://github.com/d60/twikit/blob/c3b7220866f8582009fe2d1155b6fe92192a2711/twikit/client/gql.py)
- [twikit/media.py](https://github.com/d60/twikit/blob/c3b7220866f8582009fe2d1155b6fe92192a2711/twikit/media.py)

<a id="s41"></a>

### 41. twitter-api-client 上游固定源码

独立只读 clone：[固定 commit c150f1a3492ce3db15b954f2bc18b4976500a73b](https://github.com/trevorhobenshield/twitter-api-client/tree/c150f1a3492ce3db15b954f2bc18b4976500a73b)。本地路径、commit 时间、维护度与依赖判断见 03；这里不把 Git clone 冒充成某个 HTTP API 200。

实际审查入口：

- [LICENSE](https://github.com/trevorhobenshield/twitter-api-client/blob/c150f1a3492ce3db15b954f2bc18b4976500a73b/LICENSE)
- [setup.py](https://github.com/trevorhobenshield/twitter-api-client/blob/c150f1a3492ce3db15b954f2bc18b4976500a73b/setup.py)
- [twitter/account.py](https://github.com/trevorhobenshield/twitter-api-client/blob/c150f1a3492ce3db15b954f2bc18b4976500a73b/twitter/account.py)
- [twitter/scraper.py](https://github.com/trevorhobenshield/twitter-api-client/blob/c150f1a3492ce3db15b954f2bc18b4976500a73b/twitter/scraper.py)
- [twitter/constants.py](https://github.com/trevorhobenshield/twitter-api-client/blob/c150f1a3492ce3db15b954f2bc18b4976500a73b/twitter/constants.py)

<a id="s42"></a>

### 42. OpenCLI GitHub 维护快照

来源：[https://api.github.com/repos/jackwener/opencli](https://api.github.com/repos/jackwener/opencli)。

实取：2026-09-12T11:02:06.671918+00:00；HTTP **200**；`application/json; charset=utf-8`；体 **5,333** 字节；SHA-256 `9cb108aa0aa474f554eb84c482ad2465d114bd0bed27fb74627694da3fe2a419`。

发布快照：[https://api.github.com/repos/jackwener/opencli/releases/latest](https://api.github.com/repos/jackwener/opencli/releases/latest)；HTTP 200；11411 字节；SHA-256 `3331de89a3dca7d6ec7257e53a06daae5fc01a86c09063eb50a0475791f976ea`。

<a id="s43"></a>

### 43. yt-dlp GitHub 维护快照

来源：[https://api.github.com/repos/yt-dlp/yt-dlp](https://api.github.com/repos/yt-dlp/yt-dlp)。

实取：2026-09-12T11:02:07.629639+00:00；HTTP **200**；`application/json; charset=utf-8`；体 **6,119** 字节；SHA-256 `b19d5c0cb05fdf318accaa29dddeb94dbbed2ca68686278f6914bc41d3a7f017`。

发布快照：[https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest](https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest)；HTTP 200；52414 字节；SHA-256 `699139a079d16396bd46c222c911fc81817d39548e24b65a2e522b0fbc016480`。

<a id="s44"></a>

### 44. gallery-dl GitHub 维护快照

来源：[https://api.github.com/repos/mikf/gallery-dl](https://api.github.com/repos/mikf/gallery-dl)。

实取：2026-09-12T11:02:07.710541+00:00；HTTP **200**；`application/json; charset=utf-8`；体 **5,268** 字节；SHA-256 `d628009ae895c5ca1307d592114c06c96ef034ca8be496f4034e782b7f0db28b`。

发布快照：[https://api.github.com/repos/mikf/gallery-dl/releases/latest](https://api.github.com/repos/mikf/gallery-dl/releases/latest)；HTTP 200；4254 字节；SHA-256 `98f875a320402eea893c1e67cc2c976cc134f712d1d4d868346910f4c796f8d6`。

<a id="s45"></a>

### 45. Twikit GitHub 维护快照

来源：[https://api.github.com/repos/d60/twikit](https://api.github.com/repos/d60/twikit)。

实取：2026-09-12T11:02:07.826188+00:00；HTTP **200**；`application/json; charset=utf-8`；体 **5,109** 字节；SHA-256 `1725f7e1d8752595976a6017a8c4d6d1ac3210bf379bf45535411c0298c966e3`。

发布快照：[https://api.github.com/repos/d60/twikit/releases/latest](https://api.github.com/repos/d60/twikit/releases/latest)；HTTP 200；2240 字节；SHA-256 `ee3c0e340719bd205db656195bf123ed6013b3cfca57b866f64b8f6e9a4c7bc6`。

<a id="s46"></a>

### 46. twitter-api-client GitHub 维护快照

来源：[https://api.github.com/repos/trevorhobenshield/twitter-api-client](https://api.github.com/repos/trevorhobenshield/twitter-api-client)。

实取：2026-09-12T11:02:08.332892+00:00；HTTP **200**；`application/json; charset=utf-8`；体 **6,283** 字节；SHA-256 `32c35899cb5a942fd42aff93e2ce5f56d401e7f5df4f637b7a529135024f0be1`。

发布快照：[https://api.github.com/repos/trevorhobenshield/twitter-api-client/releases/latest](https://api.github.com/repos/trevorhobenshield/twitter-api-client/releases/latest)；HTTP 404；130 字节；SHA-256 `d9e37600354c1839f6b22cebde497e9d14750d2401a06c9a51b1619baf991613`。

<a id="s47"></a>

### 47. Workers best practices

来源：[https://developers.cloudflare.com/workers/best-practices/workers-best-practices/](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/)。

实取：2026-09-12T11:04:11.778232+00:00；HTTP **200**；`text/markdown; charset=utf-8`；体 **51,143** 字节；SHA-256 `4709a97dca675b92ebb332a95884d3bd7341a2f7f9111871bfec7ec9ecff3520`。

首次访问超时，后续成功。

<a id="s48"></a>

### 48. R2 multipart objects

来源：[https://developers.cloudflare.com/r2/objects/multipart-objects/](https://developers.cloudflare.com/r2/objects/multipart-objects/)。

实取：2026-09-12T11:17:21.439987+00:00；HTTP **200**；`text/html`；体 **287,542** 字节；SHA-256 `38c22bf71d1e7a800cb65ca396d29fb859fe5350e330ce882f462deea22d42d3`。

最终 URL：[https://developers.cloudflare.com/r2/objects/upload-objects/](https://developers.cloudflare.com/r2/objects/upload-objects/)。

首次 Markdown 请求超时，后续 HTML 200；只据成功内容使用 multipart 限额。

<a id="s49"></a>

### 49. D1Database / batch

来源：[https://developers.cloudflare.com/d1/worker-api/d1-database/](https://developers.cloudflare.com/d1/worker-api/d1-database/)。

实取：2026-09-12T11:10:56.931321+00:00；HTTP **200**；`text/markdown; charset=utf-8`；体 **14,384** 字节；SHA-256 `9e41b7ea0e70274175ddea21a98dc7f1e71a1226e655c2f548d1c47a55b5e1f8`。

<a id="s50"></a>

### 50. FFmpeg legal

来源：[https://ffmpeg.org/legal.html](https://ffmpeg.org/legal.html)。

实取：2026-09-12T11:10:56.929251+00:00；HTTP **200**；`text/html; charset=UTF-8`；体 **10,686** 字节；SHA-256 `cd51dc25f9e3200b1e3953aee036f499ed51f01f7ba30563873186cb3f870eda`。

<a id="s51"></a>

### 51. ffprobe 官方文档

来源：[https://ffmpeg.org/ffprobe.html](https://ffmpeg.org/ffprobe.html)。

实取：2026-09-12T11:10:56.930390+00:00；HTTP **200**；`text/html; charset=UTF-8`；体 **61,561** 字节；SHA-256 `26b3bfca4b713d977f62916871056cbfa206e22d73d5b1d90099e6c5d8adb300`。

<a id="s52"></a>

### 52. 示例 480×852 MP4 Range

来源：[https://video.twimg.com/amplify_video/2098577761237700609/vid/avc1/480x852/pX8lP4Ghvrc4lyfi.mp4?tag=29](https://video.twimg.com/amplify_video/2098577761237700609/vid/avc1/480x852/pX8lP4Ghvrc4lyfi.mp4?tag=29)。

实取：2026-09-12T11:03:49.585407+00:00；HTTP **206**；`video/mp4`；体 **1,024** 字节；SHA-256 `44ac400e8b9bcf305ebdf189cf9539ed465e2933f13e37f2db780d5bfb83b809`。

<a id="s53"></a>

### 53. 示例 320×568 MP4 Range

来源：[https://video.twimg.com/amplify_video/2098577761237700609/vid/avc1/320x568/njVhIPPCaO1ycufn.mp4?tag=29](https://video.twimg.com/amplify_video/2098577761237700609/vid/avc1/320x568/njVhIPPCaO1ycufn.mp4?tag=29)。

实取：2026-09-12T11:03:49.587772+00:00；HTTP **206**；`video/mp4`；体 **1,024** 字节；SHA-256 `ff604edaae0bb121dea4fca852832f6bd22556e72a41ea4cc289ce89e2eefae7`。

<a id="s54"></a>

### 54. 示例 HLS video playlist

来源：[https://video.twimg.com/amplify_video/2098577761237700609/pl/avc1/720x1280/m6e4v7JhGHxJsjO0.m3u8](https://video.twimg.com/amplify_video/2098577761237700609/pl/avc1/720x1280/m6e4v7JhGHxJsjO0.m3u8)。

实取：2026-09-12T11:05:22.014638+00:00；HTTP **200**；`application/x-mpegURL`；体 **403** 字节；SHA-256 `e45fc62e9c7a39ce1107022255ce22fce4b82ded8b893464279d6ccb3b676514`。

<a id="s55"></a>

### 55. 示例 HLS audio playlist

来源：[https://video.twimg.com/amplify_video/2098577761237700609/pl/mp4a/128000/-HKLrN1Z7_NpFHQC.m3u8](https://video.twimg.com/amplify_video/2098577761237700609/pl/mp4a/128000/-HKLrN1Z7_NpFHQC.m3u8)。

实取：2026-09-12T11:05:22.018337+00:00；HTTP **200**；`application/x-mpegURL`；体 **494** 字节；SHA-256 `9559a7ca91842de92545dc1966697bebf4a7e96f3aa4ea89e6f24a1a9446eccc`。

<a id="s56"></a>

### 56. 本研究 E01–E06 公开样本与 Worker 实验

结果正文：[02-X示例实测与最小Spike.md](02-X示例实测与最小Spike.md)。临时证据根 `/tmp/snail-research-iKKC3rYb/`，只保留以下脚本/脱敏度量，原始敏感产物清理情况见第 4 节。

| 文件 | SHA-256 |
| --- | --- |
| `environment.json` | `7ba086999bb7b30db5cdbd5ac37318c96a9a6f3ca5b68aa7a5589a95303acc35` |
| `repo-manifest.json` | `31400028e3218a340093de0b4e1a6c2dcd55c4d2a02c911ae5b9f38c8c2b62db` |
| `worker-results.json` | `34003f8740d2eae6f4ae8d271b5fd2c7880872cf1d80c344c611d496978e4604` |
| `ffprobe.json` | `0154e738c5d622daa1e230f2a4696c2cc417e8166b5e9523092ff3895edcbf93` |
| `media-atoms.json` | `f2efa8549d26b4cf55aaadd0d1f54e3d0b8b4fa6529b11806b387171af7b9577` |

<a id="s57"></a>

### 57. RFC 9110 Range Requests

来源：[https://www.rfc-editor.org/rfc/rfc9110.html#name-range-requests](https://www.rfc-editor.org/rfc/rfc9110.html#name-range-requests)。

实取：2026-09-12T11:06:19.063755+00:00；HTTP **200**；`text/html`；体 **1,187,554** 字节；SHA-256 `d431760660ea44e130f6e919dab216df2d0b3a490567a98089267523368fe1e5`。

<a id="s58"></a>

### 58. X 官方 Authentication overview

来源：[https://docs.x.com/fundamentals/authentication/overview.md](https://docs.x.com/fundamentals/authentication/overview.md)。

实取：2026-09-12T11:29:52.485681+00:00；HTTP **200**；`text/markdown; charset=utf-8`；体 **3,958** 字节；SHA-256 `45c3f79ac90f636c0d1334b258ae6e0a888a21227aa8869f83ee65cf014ebd71`。

<a id="s59"></a>

### 59. X OAuth 2 Authorization Code＋PKCE

来源：[https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code.md](https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code.md)。

实取：2026-09-12T11:30:21.052956+00:00；HTTP **200**；`text/markdown; charset=utf-8`；体 **16,282** 字节；SHA-256 `95342b82f5a6079ab15a7f9ab861f841f6b87a9342c0097659f0b453209f7c01`。

指南示例存在 plain 等非推荐示例写法；Snail 设计只采用 S256，并保留与 OpenAPI authorization URL 的差异。

<a id="s60"></a>

### 60. X OAuth 2 token / refresh / revoke 连接步骤

来源：[https://docs.x.com/fundamentals/authentication/oauth-2-0/user-access-token.md](https://docs.x.com/fundamentals/authentication/oauth-2-0/user-access-token.md)。

实取：2026-09-12T11:33:43.241433+00:00；HTTP **200**；`text/markdown; charset=utf-8`；体 **9,565** 字节；SHA-256 `9ad8d936b606bb94d3cdc636f179a8b9e40549b1b0a4edfe61ed488a013d2b4f`。

明确区分带 /2/oauth2/token 的用户上下文与 app-only token endpoint，不混用 revoke。

<a id="s61"></a>

### 61. X Bookmarks Lookup quickstart 与 scopes

来源：[https://docs.x.com/x-api/posts/bookmarks/quickstart/bookmarks-lookup.md](https://docs.x.com/x-api/posts/bookmarks/quickstart/bookmarks-lookup.md)。

实取：2026-09-12T11:29:52.487295+00:00；HTTP **200**；`text/markdown; charset=utf-8`；体 **6,249** 字节；SHA-256 `e918d2d9c3f12e8f5063ae2ce54d08c83b029d4eb0aeb211024ab523f140e59d`。

<a id="s62"></a>

### 62. X GET Bookmarks 完整 reference

来源：[https://docs.x.com/x-api/bookmarks/get-bookmarks.md](https://docs.x.com/x-api/bookmarks/get-bookmarks.md)。

实取：2026-09-12T11:29:52.491227+00:00；HTTP **200**；`text/markdown; charset=utf-8`；体 **65,493** 字节；SHA-256 `61b49ec63ca7ab525bb3562feba08ef72b43513429eb1e48700fc1f91c4dc972`。

最终 URL：[https://docs.x.com/x-api/users/get-bookmarks.md](https://docs.x.com/x-api/users/get-bookmarks.md)。

<a id="s63"></a>

### 63. X GET Bookmark Folders reference

来源：[https://docs.x.com/x-api/bookmarks/get-bookmark-folders.md](https://docs.x.com/x-api/bookmarks/get-bookmark-folders.md)。

实取：2026-09-12T11:29:53.644236+00:00；HTTP **200**；`text/markdown; charset=utf-8`；体 **16,224** 字节；SHA-256 `1e3f024157556bbee4e0f5b4fe9f7eda4c11c2d8c2666f45f6a91eb41945fa04`。

最终 URL：[https://docs.x.com/x-api/users/get-bookmark-folders.md](https://docs.x.com/x-api/users/get-bookmark-folders.md)。

<a id="s64"></a>

### 64. X GET Bookmarks by Folder reference

来源：[https://docs.x.com/x-api/bookmarks/get-bookmarks-by-folder-id.md](https://docs.x.com/x-api/bookmarks/get-bookmarks-by-folder-id.md)。

实取：2026-09-12T11:29:53.804357+00:00；HTTP **200**；`text/markdown; charset=utf-8`；体 **16,417** 字节；SHA-256 `26a07bc9ce7a43813ef8301f0591cbe41948adc1034e02bc1f77093b474a6fbe`。

最终 URL：[https://docs.x.com/x-api/users/get-bookmarks-by-folder-id.md](https://docs.x.com/x-api/users/get-bookmarks-by-folder-id.md)。

<a id="s65"></a>

### 65. X 当前 OpenAPI schema

来源：[https://docs.x.com/openapi.json](https://docs.x.com/openapi.json)。

实取：2026-09-12T11:29:55.139714+00:00；HTTP **200**；`application/json`；体 **900,578** 字节；SHA-256 `234419dfc48ec1c5bfb5728da040f2d9f7f9c7a1f2b29a18a4b7ce96cf22fe83`。

检查了 OAuth2UserToken scopes、GET Bookmarks/folders/security、分页、media fields，以及活动 event_type 枚举。Schema 是当前契约快照，不证明用户 App 获得了相应套餐权限。

<a id="s66"></a>

### 66. X Activity 支持事件与认证

来源：[https://docs.x.com/x-api/activity/introduction.md](https://docs.x.com/x-api/activity/introduction.md)。

实取：2026-09-12T11:29:53.913315+00:00；HTTP **200**；`text/markdown; charset=utf-8`；体 **20,401** 字节；SHA-256 `ee9f1b93c6b8b62de3c62fce94e07bde765bff57d2187a29bc6b6a6447b46227`。

没有发现 bookmark create/delete 事件；仅对本次检查的契约作出判断。

<a id="s67"></a>

### 67. X Activity event payloads

来源：[https://docs.x.com/x-api/activity/event-payloads.md](https://docs.x.com/x-api/activity/event-payloads.md)。

实取：2026-09-12T11:29:53.945452+00:00；HTTP **200**；`text/markdown; charset=utf-8`；体 **86,258** 字节；SHA-256 `a29259ac3fa59ad242069c7fca1e49b68197f307225bbbf9863cb553f670bd4d`。

存在 bookmark_count 统计字段，不能当作私人书签新增事件。

<a id="s68"></a>

### 68. X Account Activity 事件列表

来源：[https://docs.x.com/x-api/account-activity/introduction.md](https://docs.x.com/x-api/account-activity/introduction.md)。

实取：2026-09-12T11:29:54.947698+00:00；HTTP **200**；`text/markdown; charset=utf-8`；体 **25,243** 字节；SHA-256 `27dc168b97086f60436474098c6898ee35233534451fbd38cac989d0d49ba819`。

Account Activity 与 X Activity 不是同一产品，不把前者订阅认证直接搬到 Bookmarks。

<a id="s69"></a>

### 69. X 当前端点 rate limits

来源：[https://docs.x.com/x-api/fundamentals/rate-limits.md](https://docs.x.com/x-api/fundamentals/rate-limits.md)。

实取：2026-09-12T11:29:55.119679+00:00；HTTP **200**；`text/markdown; charset=utf-8`；体 **20,831** 字节；SHA-256 `243859fc611b9077798676b209c70df097ade3b4529c6b04e51333b5a29495ba`。

<a id="s70"></a>

### 70. Cloudflare Access 自托管公开应用

来源：[https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/)。

实取：2026-09-12T11:29:55.346740+00:00；HTTP **200**；`text/html`；体 **313,961** 字节；SHA-256 `9f9dee24a3d841883b33fe3780a093c7a51c9a62877e4826cd4d1ced8fce84cd`。

<a id="s71"></a>

### 71. Cloudflare Access JWT 验证

来源：[https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)。

实取：2026-09-12T11:29:55.674971+00:00；HTTP **200**；`text/html`；体 **343,421** 字节；SHA-256 `5bdd3bada57063210edd319ea31ac166cbb41c9cd3a80eedb11fd399e316c0c3`。

<a id="s72"></a>

### 72. Cloudflare Access 通用 OIDC

来源：[https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/generic-oidc/](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/generic-oidc/)。

实取：2026-09-12T11:29:56.227270+00:00；HTTP **200**；`text/html`；体 **318,883** 字节；SHA-256 `8773b1fccfb3c3e1b4fe51d28b1833f132e5a89a02b527450dd17410f429c745`。

<a id="s73"></a>

### 73. Cloudflare Access 会话时长与撤销

来源：[https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/)。

实取：2026-09-12T11:29:56.275506+00:00；HTTP **200**；`text/html`；体 **317,332** 字节；SHA-256 `574d3dd6ba191fa600b5e69044b76ede9b803a1af3b502ed834a4b809094e36a`。

<a id="s74"></a>

### 74. RFC 7636 PKCE

来源：[https://www.rfc-editor.org/rfc/rfc7636.txt](https://www.rfc-editor.org/rfc/rfc7636.txt)。

实取：2026-09-12T11:30:21.053283+00:00；HTTP **200**；`text/plain;charset=utf-8`；体 **39,482** 字节；SHA-256 `1972e5d81cbaba7066cfd46374207bc2b4546b085ed5dd9b034e79e023e0ca31`。

<a id="s75"></a>

### 75. RFC 9700 OAuth 2 Security Best Current Practice

来源：[https://www.rfc-editor.org/rfc/rfc9700.txt](https://www.rfc-editor.org/rfc/rfc9700.txt)。

实取：2026-09-12T11:30:21.054133+00:00；HTTP **200**；`text/plain;charset=utf-8`；体 **124,673** 字节；SHA-256 `9919d061d40a97886ca866b51c69389b6c81c65cd4b979056c14fdbebfcf622a`。

<a id="s76"></a>

### 76. X authentication mapping（存在陈旧/冲突信息）

来源：[https://docs.x.com/fundamentals/authentication/guides/v2-authentication-mapping.md](https://docs.x.com/fundamentals/authentication/guides/v2-authentication-mapping.md)。

实取：2026-09-12T11:30:21.056409+00:00；HTTP **200**；`text/markdown; charset=utf-8`；体 **28,769** 字节；SHA-256 `b59c71748ef975be03de33495eca4c387e53315cbfc57ea2d7d394233ea294e1`。

保留作冲突证据：Bookmarks 行有路径笔误、OAuth 1 描述与当前 schema 不同；不使用陈旧行覆盖当前 quickstart。

<a id="s77"></a>

### 77. X Bookmarks introduction

来源：[https://docs.x.com/x-api/posts/bookmarks/introduction.md](https://docs.x.com/x-api/posts/bookmarks/introduction.md)。

实取：2026-09-12T11:29:52.489886+00:00；HTTP **200**；`text/markdown; charset=utf-8`；体 **4,133** 字节；SHA-256 `10917e12b4e22a1b6eb050e06ca4acde32b393c5ce692d00b80e9a63dbc80c6f`。

<a id="s78"></a>

### 78. X Bookmarks integration（本次正文残缺）

来源：[https://docs.x.com/x-api/posts/bookmarks/integrate.md](https://docs.x.com/x-api/posts/bookmarks/integrate.md)。

实取：2026-09-12T11:29:52.487164+00:00；HTTP **200**；`text/markdown; charset=utf-8`；体 **2,515** 字节；SHA-256 `ff276f26e27ed9b62b1078d5a21f75d4a10c7460f33e6db8e79a89307b5311b0`。

HTTP 200，但文档在 “These specific endpoints require the” 处结束；没有据残缺正文补写授权要求。

<a id="s79"></a>

### 79. 实际安装版本 OpenCLI 1.8.6 npm 元数据

来源：[https://registry.npmjs.org/@jackwener%2fopencli/1.8.6](https://registry.npmjs.org/@jackwener%2fopencli/1.8.6)。

实取：2026-09-12T11:33:43.241543+00:00；HTTP **200**；`application/json`；体 **4,246** 字节；SHA-256 `d878d04ca05b36ffe58cadfaa14f511fbd62cbe68adf42a2ebb43666086ea20d`。

npm gitHead 与安装文件是两个证据；另取关键固定源文件逐字节验证，见第 80 条。

<a id="s80"></a>

### 80. 本机 OpenCLI 1.8.6 安装源码与固定版本互证

安装根：`/opt/homebrew/lib/node_modules/@jackwener/opencli/`。package/adapter/bridge/daemon/download/stealth 共 15 文件以本地只读方式审查，文件摘要见 08 与第 82 条。

以下三个远端固定文件实际 GET 200，并与安装文件字节相同：

- [https://raw.githubusercontent.com/jackwener/OpenCLI/cad35e7a6a5ff3f7d6b859bfa4c45195c0390260/clis/twitter/bookmarks.js](https://raw.githubusercontent.com/jackwener/OpenCLI/cad35e7a6a5ff3f7d6b859bfa4c45195c0390260/clis/twitter/bookmarks.js)；8280 字节；SHA-256 `c4a36b64dcf450307f0bc5b39b43986d6087188b3aa5614722b91756531f58c0`。
- [https://raw.githubusercontent.com/jackwener/OpenCLI/cad35e7a6a5ff3f7d6b859bfa4c45195c0390260/clis/twitter/download.js](https://raw.githubusercontent.com/jackwener/OpenCLI/cad35e7a6a5ff3f7d6b859bfa4c45195c0390260/clis/twitter/download.js)；20412 字节；SHA-256 `58ca0d21ff3ef97254c606e1a816f8ac1d6756dcfc02c58a9f8a1837fe22d3d4`。
- [https://raw.githubusercontent.com/jackwener/OpenCLI/cad35e7a6a5ff3f7d6b859bfa4c45195c0390260/clis/twitter/shared.js](https://raw.githubusercontent.com/jackwener/OpenCLI/cad35e7a6a5ff3f7d6b859bfa4c45195c0390260/clis/twitter/shared.js)；24300 字节；SHA-256 `3549c7613b06c4ffe60244265ee782d8fb9e289ed79c44e61f5fc0d06e3d1784`。

其他本机审查文件可对应此版本的 [源码树](https://github.com/jackwener/OpenCLI/tree/cad35e7a6a5ff3f7d6b859bfa4c45195c0390260)：`clis/twitter/auth.js`、`bookmark-folders.js`、`utils.js`、`src/browser/page.ts`、`bridge.ts`、`src/daemon.ts`、`src/download/index.ts`、`media-download.ts`、`extension/manifest.json`。本机运行的是编译后的 dist 文件，以安装摘要为准；未声称这些文件也全部通过了远端字节比对。

<a id="s81"></a>

### 81. 本研究 E07 本机账号 Bookmarks 与匿名 OAuth 边界

结果正文：[07-X登录与认证可行性.md](07-X登录与认证可行性.md)。临时证据根 `/tmp/snail-research-iKKC3rYb/`，只保留以下脚本/脱敏度量，原始敏感产物清理情况见第 4 节。

| 文件 | SHA-256 |
| --- | --- |
| `opencli-auth/bookmarks3/result.json` | `d48f1c21a81b27d6b301fb990b1709d2a345531a8372b6e0b508bf6c0cb8c681` |
| `opencli-auth/adapter-observer-results.json` | `00a976ecff950eeba579290f06705b81bb019ffe56c7ba5d2a61d72776272edc` |
| `opencli-auth/dedup-results.json` | `1a02ca07e901dfed24f72faef8c359b8663e795591eea064da74a0f9ce3641b2` |

本机 Bookmarks 请求来自已授权的 Chrome 会话，操作为 `/i/api/graphql/{queryId}/Bookmarks`；为不暴露 cursor/账号，正文只列操作路径模板与响应度量，不公开完整私人请求 URL。

匿名边界对照：[https://api.x.com/2/users/me](https://api.x.com/2/users/me)；HTTP 401；`application/problem+json`；99 字节；SHA-256 `8f20ff0c6196b3d88227a60b7b32325bae08a23c17051edb358c5e321540d76f`。

匿名边界对照：[https://api.x.com/2/users/2244994945/bookmarks?max_results=1&expansions=attachments.media_keys&media.fields=type,url,variants,preview_image_url,duration_ms,width,height](https://api.x.com/2/users/2244994945/bookmarks?max_results=1&expansions=attachments.media_keys&media.fields=type,url,variants,preview_image_url,duration_ms,width,height)；HTTP 401；`application/problem+json`；99 字节；SHA-256 `8f20ff0c6196b3d88227a60b7b32325bae08a23c17051edb358c5e321540d76f`。

<a id="s82"></a>

### 82. 本研究 E08 安装源码、原命令失败与精确媒体接力

结果正文：[08-OpenCLI登录桥与开源下载器源码研究.md](08-OpenCLI登录桥与开源下载器源码研究.md)。临时证据根 `/tmp/snail-research-iKKC3rYb/`，只保留以下脚本/脱敏度量，原始敏感产物清理情况见第 4 节。

| 文件 | SHA-256 |
| --- | --- |
| `opencli-auth/installed-source-manifest.json` | `314bcd37f38548c58bdee5d9dfcd1a4117131527825284707d0c4188cc1d2352` |
| `opencli-auth/download/result.json` | `d913f94fd2e461e7e2883610bb00c41c89f75ded68a8a65f8fddb19545d47f3e` |
| `opencli-auth/artifacts.json` | `310471901e05c7fa40d472eba1efe19aaa0819a318fcfe17d38a1793f27feb54` |
| `opencli-auth/direct-approved-results.json` | `a819caf574b1446c21f739b3ef01b6a31797451a5d2d72312e0b77fc5a26dd9e` |
| `opencli-auth/media-validation.json` | `5cc7bb004de9e2f250019b451a3caf86028260c91bb24e1d19c5e3c3c4e3c5d5` |
| `opencli-auth/worker-authenticated-media-results.json` | `a034eb483e5a92d06eb30e8c2b3a60bf67e97970b87d16ad0dda5e033262a3b3` |

精确视频度量也来自 `opencli-media-results.jsonl`，指向给定示例的 320×568 MP4；不包含其他书签媒体地址。原版 CLI 的 HTTP 头未暴露，文件类型检查和随后独立 curl 状态分开记录。

<a id="s83"></a>

### 83. 本研究 E09 无秘密认证 contract

结果正文：[07-X登录与认证可行性.md](07-X登录与认证可行性.md)。临时证据根 `/tmp/snail-research-iKKC3rYb/`，只保留以下脚本/脱敏度量，原始敏感产物清理情况见第 4 节。

| 文件 | SHA-256 |
| --- | --- |
| `runtime/auth-contract.mjs` | `eb335547478f3b476c048fe9b1bf54171cce55697c01cc00625d4373ae60112d` |
| `runtime/run-auth-contract.mjs` | `d97a39370ae66262564c548633d2e5257747916a41a39fd4e6a3348636fc5743` |
| `opencli-auth/mock-contract-results.json` | `c80ac15ed355dbc9a9389b837b9f3210fb63d47238811f1a964218c0fb63f223` |

<a id="s84"></a>

### 84. Chrome Extensions Storage API

来源：[https://developer.chrome.com/docs/extensions/reference/api/storage](https://developer.chrome.com/docs/extensions/reference/api/storage)。

实取：2026-09-12T11:37:49.639126+00:00；HTTP **200**；`text/html; charset=utf-8`；体 **203,563** 字节；SHA-256 `dd38c0f2abddfe1b2abc950a3939326b0624f38f923f961e9a8dfb30eeee82d6`。

当前正文推荐敏感用户数据使用内存中的 storage.session，并描述浏览器重启等清理行为；没有引用本次正文中未出现的“local/sync 未加密”旧文案。

## 3. 失败访问与资料冲突

| 请求 / 资料 | 本次结果 | 处理 |
| --- | --- | --- |
| [cf_limits](https://developers.cloudflare.com/workers/platform/limits/) | curl exit 28，HTTP 000，未收到体 | 改用随后成功的官方页面；失败本身不作平台能力判断 |
| [cf_limits_retry](https://developers.cloudflare.com/workers/platform/limits/) | curl exit 28，HTTP 000，未收到体 | 改用随后成功的官方页面；失败本身不作平台能力判断 |
| [cf_r2_limits](https://developers.cloudflare.com/r2/platform/limits/) | curl exit 28，HTTP 000，未收到体 | 改用随后成功的官方页面；失败本身不作平台能力判断 |
| [cf_r2_lifecycle](https://developers.cloudflare.com/r2/buckets/object-lifecycles/) | curl exit 28，HTTP 000，未收到体 | 改用随后成功的官方页面；失败本身不作平台能力判断 |
| [cf_r2_presign](https://developers.cloudflare.com/r2/api/s3/presigned-urls/) | curl exit 35，HTTP 000，未收到体 | 改用随后成功的官方页面；失败本身不作平台能力判断 |
| [cf_r2_presign_retry](https://developers.cloudflare.com/r2/api/s3/presigned-urls/) | curl exit 28，HTTP 000，未收到体 | 改用随后成功的官方页面；失败本身不作平台能力判断 |
| [cf_r2_cors](https://developers.cloudflare.com/r2/buckets/cors/) | curl exit 28，HTTP 000，未收到体 | 改用随后成功的官方页面；失败本身不作平台能力判断 |
| [cf_queues_limits](https://developers.cloudflare.com/queues/platform/limits/) | curl exit 28，HTTP 000，未收到体 | 改用随后成功的官方页面；失败本身不作平台能力判断 |
| [cf_queues_pricing](https://developers.cloudflare.com/queues/platform/pricing/) | curl exit 28，HTTP 000，未收到体 | 改用随后成功的官方页面；失败本身不作平台能力判断 |
| [cf_queues_pricing_retry](https://developers.cloudflare.com/queues/platform/pricing/) | curl exit 28，HTTP 000，未收到体 | 改用随后成功的官方页面；失败本身不作平台能力判断 |
| [cf_best_practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/) | curl exit 28，HTTP 000，未收到体 | 改用随后成功的官方页面；失败本身不作平台能力判断 |
| [cf_multipart](https://developers.cloudflare.com/r2/objects/multipart-objects/) | curl exit 35，HTTP 000，未收到体 | 改用随后成功的官方页面；失败本身不作平台能力判断 |
| [cf_node_child](https://developers.cloudflare.com/workers/runtime-apis/nodejs/child_process/) | HTTP 404，307 字节 | 以 Node 兼容总表为准，不推断子进程可运行 |
| [x_media_docs](https://docs.x.com/x-api/data-dictionary/object-model/media) | HTTP 404，725 字节 | 使用当前 data dictionary 与 OpenAPI |
| [x_web_index](https://docs.x.com/x-for-websites/llms.txt) | HTTP 404，15 字节 | 保留失败，未补造结果 |
| [gh_twitterapi_release](https://api.github.com/repos/trevorhobenshield/twitter-api-client/releases/latest) | HTTP 404，130 字节 | 保留失败，未补造结果 |

认证相关冲突已在 07 列明：官方 OAuth authorize URL 差异、旧 mapping 的路径/OAuth 1 信息、残缺 integration 正文、无法据页大小保证全历史。真实登录并不消除这些文档与服务差异。

OpenCLI 文件夹 404 是登录后真实内部接口失败；原版 download 的 exit 0/HTML 是工具质量失败；二者均未归因为密码错误，也未通过更换身份规避。

## 4. 临时证据与清理

**清理已完成：2026-09-12T11:51:43.122477+00:00。**只清理本研究自己的临时目录，没有退出用户 X 会话或删除其他进程的文件。

| 类别 | 已删除 |
| --- | --- |
| 原始 HTTP body/headers 及提取文本 | 247 个产物，11,904,879 字节；保留 URL、状态、MIME、大小、哈希度量 |
| 私人书签原始结果、CLI 原始 stdout/stderr、精确下载媒体 | 7 个产物，636,278 字节 |
| 两份 Miniflare R2 持久化目录 | 总计 4,388,265 字节，包括实际视频/封面对象 |
| 较早删除的原版 download 无效/范围不符文件 | 11 个；大小/哈希记录保留，未用于发布 |
| 本次原命令的 cookie 临时导出 | 按命令时间窗口只检查文件存在性，剩余 0；没有打开其内容 |

本地清理记录：`/tmp/snail-research-iKKC3rYb/cleanup-report.json`，SHA-256 `842290f70cdbaa8913d335eb382221bc932fe1acd0180b3c3d79ab44b6a94a32`。只保留脱敏测量、公开来源 URL 清单、实验脚本与临时运行时依赖；临时目录本身不是持久交付或应分享的诊断包。

`snail` 只含 `docs/` 下 11 个 Markdown 文档；未初始化 Git/远端、未 commit/push、未配置云资源。本机 OpenCLI 的 15 个已记录源码文件 hash 未改变；五个独立 reference clone 的工作树均干净。

## 5. 结论的可复核边界

任何读者可用固定 commit 和编号官方来源复核源码/契约；真实账号结果只能证明本次授权账号在本次环境的有限操作。重新测试需要用户自己合法授权，不能要求分享 cookie、密码、token 或原始私人响应。部署、长期可用率、完整书签历史、官方账号 grant、视频复制许可都没有被单次 200 或 mock 通过替代。
