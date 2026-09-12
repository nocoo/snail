import { ConnectorError, canonicalOrigin } from "./core";
export interface RequestOptions {
  method?: string;
  body?: unknown;
  raw?: Uint8Array;
  contentType?: "image/jpeg";
  idempotencyKey?: string;
  signal?: AbortSignal;
}
export class DeviceClient {
  readonly origin: string;
  constructor(
    origin: string,
    private token: string,
    private fetcher: typeof fetch = fetch,
    localTest = false,
  ) {
    this.origin = canonicalOrigin(origin, localTest);
    if (!/^snail_device_[a-f0-9]{64}$/.test(token))
      throw new ConnectorError("invalid_device_credential");
  }
  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    if (!/^\/[a-z0-9/_-]+$/.test(path)) throw new ConnectorError("invalid_device_path");
    const headers: Record<string, string> = { Authorization: `Bearer ${this.token}` };
    if (options.body !== undefined) headers["Content-Type"] = "application/json";
    if (options.raw) headers["Content-Type"] = options.contentType ?? "application/octet-stream";
    if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;
    const timeout = AbortSignal.timeout(150_000);
    let response: Response;
    try {
      response = await this.fetcher(`${this.origin}/api/connectors/me${path}`, {
        method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
        headers,
        body: options.raw
          ? new Uint8Array(options.raw).buffer
          : options.body !== undefined
            ? JSON.stringify(options.body)
            : undefined,
        redirect: "manual",
        signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
      });
    } catch {
      throw new ConnectorError(options.signal?.aborted ? "interrupted" : "network_unavailable");
    }
    if (response.status >= 300 && response.status < 400)
      throw new ConnectorError("access_misconfigured", response.status);
    if (!response.headers.get("content-type")?.includes("application/json"))
      throw new ConnectorError("invalid_server_response", response.status);
    if (!response.body) throw new ConnectorError("invalid_server_response");
    const reader = response.body.getReader(),
      chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 1_048_576) throw new ConnectorError("response_too_large");
        chunks.push(value);
      }
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const raw = new TextDecoder().decode(bytes);
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new ConnectorError("invalid_server_response");
    }
    if (!response.ok) {
      const error = data && typeof data === "object" && "error" in data ? data.error : undefined;
      const code =
        error &&
        typeof error === "object" &&
        "code" in error &&
        typeof error.code === "string" &&
        /^[a-z_]{1,80}$/.test(error.code)
          ? error.code
          : "server_error";
      throw new ConnectorError(code, response.status);
    }
    return data as T;
  }
  async rotate() {
    const result = await this.request<{ token: string; expiresAt: number }>("/rotate", {
      body: {},
    });
    if (!/^snail_device_[a-f0-9]{64}$/.test(result.token))
      throw new ConnectorError("invalid_device_credential");
    this.token = result.token;
    return result;
  }
}
