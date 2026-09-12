import { Button } from "@nocoo/basalt";
import { Check, Pause, RotateCcw, X } from "lucide-react";
import type { UploadProgress } from "../../shared/types";

const phases = {
  hashing: "校验文件",
  uploading: "正在上传",
  verifying: "验证视频",
  ready: "已保存",
  failed: "上传失败",
  paused: "已暂停",
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
    <section className="upload-tray" aria-label="上传进度">
      <div className="upload-tray-heading">
        <strong>
          传输 · {items.filter((item) => item.phase === "ready").length}/{items.length}
        </strong>
        <Button variant="ghost" size="icon" aria-label="收起已完成传输" onClick={onDismiss}>
          <X size={16} />
        </Button>
      </div>
      <div className="upload-items">
        {items.map((item) => (
          <div className="upload-item" key={item.id}>
            <div className="upload-item-top">
              <span title={item.name}>{item.name}</span>
              {item.phase === "ready" ? (
                <Check size={16} />
              ) : item.phase === "failed" || item.phase === "paused" ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`重试 ${item.name}`}
                  onClick={() => onRetry(item)}
                >
                  <RotateCcw size={16} />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`暂停 ${item.name}`}
                  onClick={() => onPause(item.id)}
                >
                  <Pause size={16} />
                </Button>
              )}
            </div>
            <progress value={item.percent} max={100} aria-label={item.name} />
            <div className="upload-item-status">
              <span>{phases[item.phase]}</span>
              <span>{Math.round(item.percent)}%</span>
            </div>
            {item.error && <p className="muted">{item.error}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
