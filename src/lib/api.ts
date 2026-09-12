export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(errorMessage(code));
  }
}

const messages: Record<string, string> = {
  authentication_required: "登录已过期，请重新登录。",
  csrf_rejected: "请求未通过验证，请刷新页面。",
  invalid_input: "请检查输入内容、文件大小与格式。",
  hash_mismatch: "文件校验失败，请重新选择视频。",
  invalid_video_signature: "这不是有效的视频文件，请检查文件内容。",
  invalid_poster_signature: "海报格式不受支持。",
  body_too_large: "文件超过允许的大小。",
  upload_quota_exceeded: "上传任务或资料库空间已达上限，请稍后重试或清理空间。",
  rate_limited: "操作较频繁，请稍后重试。",
  pairing_not_found: "配对码无效或已过期，请在本机重新发起配对。",
  scope_not_requested: "只能批准设备申请的权限。",
  device_revoked: "设备凭据已失效，请重新配对。",
  category_exists: "分类名称已存在。",
  tag_exists: "标签名称已存在。",
  name_exists: "名称已存在。",
  media_unavailable: "暂时无法获取视频，请确认本机 X 已登录并重试。",
  invalid_media_response: "来源没有返回有效视频。",
  parts_missing: "还有分片未完成，请继续上传。",
  upload_expired: "上传会话已过期，请重新选择文件。",
};
export function errorMessage(code: string) {
  return messages[code] ?? "操作未完成，请稍后重试。";
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; raw?: Blob; signal?: AbortSignal } = {},
): Promise<T> {
  const headers: Record<string, string> = { "X-Snail-Request": "1" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.raw) headers["Content-Type"] = options.raw.type || "application/octet-stream";
  const response = await fetch(path, {
    method: options.method ?? "GET",
    credentials: "same-origin",
    headers,
    body: options.raw ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
    signal: options.signal,
  });
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new ApiError(401, "authentication_required");
  const result = await response.json();
  if (!response.ok) throw new ApiError(response.status, result.error?.code ?? "request_failed");
  return result as T;
}

export async function retryTransient<T>(
  action: () => Promise<T>,
  signal?: AbortSignal,
  sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    signal?.throwIfAborted();
    try {
      return await action();
    } catch (error) {
      const status =
        error && typeof error === "object" && "status" in error ? Number(error.status) : 0;
      const retry = error instanceof TypeError || status === 429 || status >= 500;
      if (!retry || attempt >= 3 || signal?.aborted) throw error;
      await sleep(status === 429 ? 60_000 : 400 * 2 ** attempt);
    }
  }
}
