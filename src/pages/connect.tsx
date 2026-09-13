import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
  Label,
  LayerCard,
  Link,
  Separator,
} from "@nocoo/basalt";
import { Banner } from "@nocoo/basalt/components/banner";
import { CodeBlock } from "@nocoo/basalt/components/code";
import { PageHeader } from "@nocoo/basalt/components/page-header";
import { SectionRule } from "@nocoo/basalt/components/section-rule";
import { TagBadge } from "@nocoo/basalt/components/tag-badge";
import { ArrowUpRight, Check, Copy, Laptop, RefreshCw, ShieldCheck, Unplug } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Device, Job } from "../../shared/types";
import { api } from "../lib/api";
import { formatDate } from "../lib/format";
import { useDialogFocus } from "../lib/use-dialog-focus";

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
  const revokeFocus = useDialogFocus();
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
    <div className="space-y-6">
      <PageHeader
        title="连接本机"
        description="把浏览器里的收藏，带回你的私人资料库。"
        actions={
          <Button
            variant="outline"
            icon={<RefreshCw className="size-4" strokeWidth={1.5} />}
            onClick={() => void refresh()}
          >
            刷新状态
          </Button>
        }
      />
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <LayerCard>
          <LayerCard.Header>
            <h2 className="text-sm font-medium text-basalt-foreground">开始连接</h2>
          </LayerCard.Header>
          <LayerCard.Well className="space-y-5">
            <p className="text-sm text-basalt-muted-foreground">
              Connector 在你的电脑上运行，复用 OpenCLI
              已连接的浏览器。电脑休眠或离线后任务会保留，下次上线继续。
            </p>
            <ol className="list-decimal space-y-5 pl-5 text-sm">
              <li className="space-y-2 pl-1">
                <strong className="font-medium">在本机准备</strong>
                <p className="text-basalt-muted-foreground">
                  安装 Snail 的依赖与 OpenCLI Browser Bridge，确认 X 已登录。
                </p>
              </li>
              <li className="space-y-2 pl-1">
                <strong className="font-medium">发起设备配对</strong>
                <div className="flex min-w-0 items-start gap-2">
                  <CodeBlock className="min-w-0 flex-1 whitespace-pre-wrap break-all text-xs">
                    {command}
                  </CodeBlock>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    aria-label="复制配对命令"
                    onClick={() => {
                      void navigator.clipboard
                        .writeText(command)
                        .then(() => setCopied(true))
                        .catch(() => setMessage("请手动复制命令。"));
                    }}
                  >
                    {copied ? (
                      <Check className="size-4" strokeWidth={1.5} />
                    ) : (
                      <Copy className="size-4" strokeWidth={1.5} />
                    )}
                  </Button>
                </div>
              </li>
              <li className="space-y-2 pl-1">
                <strong className="font-medium">接收已批准的收藏</strong>
                <p className="text-basalt-muted-foreground">
                  配对完成后在本机运行 watch，在资料库点击「收藏链接」，提交你有权保存的视频。
                </p>
                <CodeBlock className="whitespace-pre-wrap break-all text-xs">
                  bun run connector -- watch
                </CodeBlock>
              </li>
            </ol>
            <Link
              href="https://github.com/nocoo/snail/blob/main/docs/13-Connector安装与协议.md"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm"
            >
              打开本机连接指南
              <ArrowUpRight className="size-4" strokeWidth={1.5} />
            </Link>
          </LayerCard.Well>
        </LayerCard>
        <LayerCard className="pair-card">
          <LayerCard.Header>
            <h2 className="flex items-center gap-2 text-sm font-medium text-basalt-foreground">
              <Laptop className="size-4" strokeWidth={1.5} />
              批准一台设备
            </h2>
          </LayerCard.Header>
          <LayerCard.Well className="space-y-4">
            <p className="text-sm text-basalt-muted-foreground">
              输入终端显示的配对码，先核对设备名称与权限。
            </p>
            <Field label="设备配对码" htmlFor="device-pair-code">
              <Input
                id="device-pair-code"
                aria-label="设备配对码"
                size="lg"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.toUpperCase());
                  setPairing(null);
                  setPairMessage("");
                }}
                placeholder="ABCD-1234"
                maxLength={9}
              />
            </Field>
            {pairing ? (
              <>
                <div className="space-y-1 text-sm">
                  <strong className="font-medium">{pairing.name}</strong>
                  <p className="text-xs text-basalt-muted-foreground">
                    仅批准你刚刚发起配对的设备。
                  </p>
                </div>
                <Checkbox.Group value={allowed} onValueChange={setAllowed} className="space-y-3">
                  <Checkbox.Legend>批准的权限</Checkbox.Legend>
                  {pairing.scopes.map((scope) => (
                    <div key={scope} className="flex items-start gap-2">
                      <Checkbox.Item id={`scope-${scope}`} value={scope} />
                      <Label htmlFor={`scope-${scope}`} className="leading-5">
                        {scopeNames[scope] ?? scope}
                      </Label>
                    </div>
                  ))}
                </Checkbox.Group>
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
              <Banner variant="secondary" role="status" size="sm" description={pairMessage} />
            )}
            <Separator />
            <p className="flex items-start gap-2 text-xs leading-5 text-basalt-muted-foreground">
              <ShieldCheck className="size-4 shrink-0" strokeWidth={1.5} />
              <span>X 登录态只留在本机。Snail 接收获准的元数据与视频，不接收 X cookie。</span>
            </p>
          </LayerCard.Well>
        </LayerCard>
      </div>
      {message && <Banner variant="secondary" role="status" size="sm" description={message} />}
      <SectionRule
        title="我的设备"
        actions={
          <Badge variant="secondary">
            {devices.filter((device) => !device.revokedAt).length} 台已配对
          </Badge>
        }
      >
        <div className="space-y-3">
          {devices.length ? (
            devices.map((device) => {
              const online =
                !device.revokedAt &&
                device.expiresAt > Date.now() &&
                !!device.lastSeenAt &&
                Date.now() - device.lastSeenAt < 120_000;
              return (
                <LayerCard key={device.id} className="flex flex-wrap items-center gap-4">
                  <Laptop
                    className="size-5 shrink-0 text-basalt-muted-foreground"
                    strokeWidth={1.5}
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <strong className="block break-words text-sm font-medium">{device.name}</strong>
                    <p className="text-xs text-basalt-muted-foreground">
                      {device.scopes.map((scope) => scopeNames[scope] ?? scope).join(" · ")}
                    </p>
                    <p className="text-xs text-basalt-muted-foreground">
                      凭据到期：{formatDate(device.expiresAt)}
                    </p>
                  </div>
                  <TagBadge
                    name={
                      device.revokedAt
                        ? "已撤销"
                        : device.expiresAt <= Date.now()
                          ? "已过期"
                          : online
                            ? "在线"
                            : "离线"
                    }
                    color={online ? "success" : "slate"}
                    size="sm"
                  />
                  {!device.revokedAt && (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Unplug className="size-4" strokeWidth={1.5} />}
                      onClick={() => setRevoke(device)}
                    >
                      断开
                    </Button>
                  )}
                </LayerCard>
              );
            })
          ) : (
            <LayerCard>
              <LayerCard.Empty
                title="还没有连接设备"
                description="先在本机发起配对。"
                icon={<Laptop className="size-6" strokeWidth={1.5} />}
              />
            </LayerCard>
          )}
        </div>
      </SectionRule>
      <SectionRule title="导入队列" hint="电脑离线时任务会保留，本机上线后继续处理。">
        <div className="space-y-3">
          {jobs.length ? (
            jobs.map((job) => (
              <LayerCard key={job.id} className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <Link
                    href={job.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-sm"
                  >
                    {job.sourceUrl}
                  </Link>
                  <p className="text-xs text-basalt-muted-foreground">
                    {formatDate(job.createdAt)} · {jobStates[job.status]}
                  </p>
                  {job.errorCode && (
                    <p className="text-xs text-basalt-muted-foreground">
                      请检查本机登录状态、视频可用性与保存权限。
                    </p>
                  )}
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
            <LayerCard>
              <LayerCard.Empty title="队列为空" description="收藏一个 X 链接后，它会出现在这里。" />
            </LayerCard>
          )}
        </div>
      </SectionRule>
      <Dialog
        open={!!revoke}
        onOpenChange={(open) => {
          if (!open) setRevoke(null);
        }}
      >
        <DialogContent {...revokeFocus}>
          <DialogHeader>
            <DialogTitle>断开 {revoke?.name}？</DialogTitle>
            <DialogDescription>
              设备凭据立即失效，正在接收的上传无法再发布。之后可重新配对。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevoke(null)}>
              保留连接
            </Button>
            <Button variant="destructive" loading={busy} onClick={() => void disconnect()}>
              确认断开
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
