import { Button, LayerCard } from "@nocoo/basalt";
import { type UploadFile, UploadItem } from "@nocoo/basalt/components/upload-queue";
import { X } from "lucide-react";
import type { UploadProgress } from "../../shared/types";

const phases = {
  hashing: "校验文件",
  uploading: "正在上传",
  verifying: "验证视频",
  ready: "已保存",
  failed: "上传失败",
  paused: "已暂停",
};
const statuses: Record<UploadProgress["phase"], UploadFile["status"]> = {
  hashing: "queued",
  uploading: "uploading",
  verifying: "uploading",
  ready: "success",
  failed: "error",
  paused: "cancelled",
};
export function UploadTray({
  items,
  onPause,
  onRetry,
  onDismiss,
}: {
  items: UploadProgress[];
  onPause: (id: string) => void;
  onRetry: (item: UploadProgress) => void;
  onDismiss: () => void;
}) {
  if (!items.length) return null;
  return (
    <LayerCard role="region" className="upload-tray" aria-label="上传进度" outlined>
      <LayerCard.Header className="items-center">
        <strong className="text-sm font-medium text-basalt-foreground">
          传输 · {items.filter((item) => item.phase === "ready").length}/{items.length}
        </strong>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="收起已完成传输"
          onClick={onDismiss}
        >
          <X className="size-4" strokeWidth={1.5} />
        </Button>
      </LayerCard.Header>
      <LayerCard.Body className="max-h-[40vh] space-y-2 overflow-y-auto">
        {items.map((item) => (
          <UploadItem
            key={item.id}
            file={{
              id: item.id,
              name: item.name,
              status: statuses[item.phase],
              progress: item.percent,
              error: item.error,
            }}
            labels={{
              queued: `校验文件 ${Math.round(item.percent)}%`,
              uploading: `${phases[item.phase]} ${Math.round(item.percent)}%`,
              success: "已保存",
              error: "上传失败",
              cancelled: "已暂停",
              cancel: "暂停",
              retry: "重试",
            }}
            onCancel={onPause}
            onRetry={() => onRetry(item)}
          />
        ))}
      </LayerCard.Body>
    </LayerCard>
  );
}
