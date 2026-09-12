import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Input,
  LayerCard,
} from "@nocoo/basalt";
import { PageHeader } from "@nocoo/basalt/components/page-header";
import { ArrowUpRight, Check, Copy, Laptop, RefreshCw, ShieldCheck, Unplug } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Device, Job } from "../../shared/types";
import { api } from "../lib/api";
import { formatDate } from "../lib/format";

const scopeNames: Record<string, string> = {
  "media:write": "上传已批准的视频与元数据",
  "jobs:read": "读取你提交的导入任务",
  "library:read": "读取资料库元数据",
};
const jobStates: Record<string, string> = {
  queued: "等待本机上线",
  claimed: "正在导入",
  ready: "已保存",
  failed: "导入失败",
  cancelled: "已取消",
};
export function ConnectPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [code, setCode] = useState(() => new URLSearchParams(location.search).get("code") ?? "");
  const [pairing, setPairing] = useState<{
    name: string;
    scopes: string[];
    expiresAt: number;
  } | null>(null);
  const [allowed, setAllowed] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [pairMessage, setPairMessage] = useState("");
  const [revoke, setRevoke] = useState<Device | null>(null);
  const [copied, setCopied] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const [devices, jobs] = await Promise.all([
        api<Device[]>("/api/devices"),
        api<Job[]>("/api/jobs"),
      ]);
      setDevices(devices);
      setJobs(jobs);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "无法读取连接状态。");
    }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 10_000);
    return () => clearInterval(timer);
  }, [refresh]);
  async function inspect() {
    setBusy(true);
    setPairMessage("");
    try {
      const result = await api<{ name: string; scopes: string[]; expiresAt: number }>(
        `/api/me/connector-pairings?code=${encodeURIComponent(code.trim().toUpperCase())}`,
      );
      setPairing(result);
      setAllowed(result.scopes);
    } catch (error) {
      setPairing(null);
      setPairMessage(error instanceof Error ? error.message : "配对失败。");
    } finally {
      setBusy(false);
    }
  }
  async function approve() {
    setBusy(true);
    setPairMessage("");
    try {
      await api("/api/me/connector-pairings/approve", {
        method: "POST",
        body: { userCode: code.trim().toUpperCase(), scopes: allowed },
      });
      setPairing(null);
      setCode("");
      history.replaceState(null, "", "/connect");
      setPairMessage("已批准连接。请回到本机终端完成配对。");
      await refresh();
    } catch (error) {
      setPairMessage(error instanceof Error ? error.message : "配对失败。");
    } finally {
      setBusy(false);
    }
  }
  async function disconnect() {
    if (!revoke) return;
    setBusy(true);
    try {
      await api(`/api/devices/${revoke.id}`, { method: "DELETE" });
      setRevoke(null);
      setMessage("设备已断开，原凭据立即失效。");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "断开失败。");
    } finally {
      setBusy(false);
    }
  }
  async function updateJob(job: Job, action: "retry" | "cancel") {
    try {
      await api(`/api/jobs/${job.id}/${action}`, { method: "POST" });
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败。");
    }
  }
  const command = `bun run connector -- pair ${location.origin}`;
  return (
    <>
      <PageHeader
        title="连接本机"
        description="把浏览器里的收藏，带回你的私人资料库。"
        actions={
          <Button variant="outline" icon={<RefreshCw size={16} />} onClick={() => void refresh()}>
            刷新状态
          </Button>
        }
      />
      <div className="connect-grid">
        <LayerCard className="instruction-card">
          <span className="eyebrow">LOCAL CONNECTOR</span>
          <h2>一次配对，收藏慢慢归档。</h2>
          <p>
            Connector 在你的电脑上运行，复用 OpenCLI
            已连接的浏览器。电脑休眠或离线后任务会保留，下次上线继续。
          </p>
          <ol className="connect-steps">
            <li>
              <strong>在本机准备</strong>
              <span>安装 Snail 的依赖与 OpenCLI Browser Bridge，确认 X 已登录。</span>
            </li>
            <li>
              <strong>发起设备配对</strong>
              <div className="copy-command">
                <code>{command}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="复制配对命令"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(command)
                      .then(() => setCopied(true))
                      .catch(() => setMessage("请手动复制命令。"));
                  }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </Button>
              </div>
            </li>
            <li>
              <strong>批准权限后同步</strong>
              <span>
                在本机运行同步命令，并明确批准你有权保存的视频。完整步骤见仓库的 Connector 说明。
              </span>
            </li>
          </ol>
          <a
            href="https://github.com/nocoo/snail#connector"
            target="_blank"
            rel="noreferrer"
            className="text-link"
          >
            打开本机连接指南
            <ArrowUpRight size={16} />
          </a>
        </LayerCard>
        <LayerCard className="pair-card">
          <Laptop size={26} strokeWidth={1.4} />
          <h2>批准一台设备</h2>
          <p className="muted">输入终端显示的配对码，先核对设备名称与权限。</p>
          <label className="field" htmlFor="device-pair-code">
            设备配对码
            <Input
              id="device-pair-code"
              aria-label="设备配对码"
              value={code}
              onChange={(event) => {
                setCode(event.target.value.toUpperCase());
                setPairing(null);
                setPairMessage("");
              }}
              placeholder="ABCD-1234"
              maxLength={9}
            />
          </label>
          {pairing ? (
            <>
              <div className="pairing-device">
                <strong>{pairing.name}</strong>
                <span>仅批准你刚刚发起配对的设备。</span>
              </div>
              <div className="permission-list">
                {pairing.scopes.map((scope) => (
                  <label key={scope}>
                    <input
                      type="checkbox"
                      checked={allowed.includes(scope)}
                      onChange={(event) =>
                        setAllowed((items) =>
                          event.target.checked
                            ? [...items, scope]
                            : items.filter((item) => item !== scope),
                        )
                      }
                    />
                    {scopeNames[scope] ?? scope}
                  </label>
                ))}
              </div>
              <Button loading={busy} disabled={!allowed.length} onClick={() => void approve()}>
                批准这台设备
              </Button>
            </>
          ) : (
            <Button
              loading={busy}
              disabled={!/^[A-F0-9]{4}-[A-F0-9]{4}$/.test(code)}
              onClick={() => void inspect()}
            >
              查看设备
            </Button>
          )}
          {pairMessage && (
            <p role="status" className="notice">
              {pairMessage}
            </p>
          )}
          <div className="privacy-note">
            <ShieldCheck size={18} />
            <span>X 登录态只留在本机。Snail 接收获准的元数据与视频，不接收 X cookie。</span>
          </div>
        </LayerCard>
      </div>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      <div className="section-title">
        <h2>我的设备</h2>
        <span>{devices.filter((device) => !device.revokedAt).length} 台已配对</span>
      </div>
      <div className="device-list">
        {devices.length ? (
          devices.map((device) => {
            const online =
              !device.revokedAt &&
              device.expiresAt > Date.now() &&
              !!device.lastSeenAt &&
              Date.now() - device.lastSeenAt < 120_000;
            return (
              <LayerCard key={device.id} className="device-row">
                <div className="device-symbol">
                  <Laptop size={23} />
                </div>
                <div className="device-description">
                  <strong>{device.name}</strong>
                  <span>{device.scopes.map((scope) => scopeNames[scope]).join(" · ")}</span>
                  <small>凭据到期：{formatDate(device.expiresAt)}</small>
                </div>
                <span className={`device-status ${online ? "online" : ""}`}>
                  <span className="status-dot" />
                  {device.revokedAt
                    ? "已撤销"
                    : device.expiresAt <= Date.now()
                      ? "已过期"
                      : online
                        ? "在线"
                        : "离线"}
                </span>
                {!device.revokedAt && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Unplug size={15} />}
                    onClick={() => setRevoke(device)}
                  >
                    断开
                  </Button>
                )}
              </LayerCard>
            );
          })
        ) : (
          <div className="quiet-empty">还没有连接设备。先在本机发起配对。</div>
        )}
      </div>
      <div className="section-title">
        <h2>导入队列</h2>
        <span>离线任务会保留</span>
      </div>
      <div className="job-list">
        {jobs.length ? (
          jobs.map((job) => (
            <LayerCard key={job.id} className="job-row">
              <div>
                <a href={job.sourceUrl} target="_blank" rel="noreferrer">
                  {job.sourceUrl}
                </a>
                <span className="muted">
                  {formatDate(job.createdAt)} · {jobStates[job.status]}
                </span>
                {job.errorCode && <small>请检查本机登录状态、视频可用性与保存权限。</small>}
              </div>
              {job.status === "failed" && (
                <Button size="sm" variant="outline" onClick={() => void updateJob(job, "retry")}>
                  重试
                </Button>
              )}
              {["queued", "claimed", "failed"].includes(job.status) && (
                <Button size="sm" variant="ghost" onClick={() => void updateJob(job, "cancel")}>
                  取消
                </Button>
              )}
            </LayerCard>
          ))
        ) : (
          <div className="quiet-empty">收藏一个 X 链接后，它会出现在这里。</div>
        )}
      </div>
      <Dialog
        open={!!revoke}
        onOpenChange={(open) => {
          if (!open) setRevoke(null);
        }}
      >
        <DialogContent>
          <DialogTitle>断开 {revoke?.name}？</DialogTitle>
          <DialogDescription>
            设备凭据立即失效，正在接收的上传无法再发布。之后可重新配对。
          </DialogDescription>
          <div className="dialog-actions">
            <Button variant="outline" onClick={() => setRevoke(null)}>
              保留连接
            </Button>
            <Button variant="destructive" loading={busy} onClick={() => void disconnect()}>
              确认断开
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
