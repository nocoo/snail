import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Input,
} from "@nocoo/basalt";
import { Download, ExternalLink, Heart, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Asset, Category, Tag } from "../../shared/types";
import { api } from "../lib/api";
import { formatBytes, formatDate, formatDuration } from "../lib/format";

export function AssetPreview({
  asset,
  categories,
  tags,
  onClose,
  onSaved,
}: {
  asset: Asset | null;
  categories: Category[];
  tags: Tag[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [favorite, setFavorite] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [playError, setPlayError] = useState(false);
  useEffect(() => {
    if (asset) {
      setTitle(asset.title);
      setDescription(asset.description);
      setCategory(asset.categoryId ?? "");
      setSelectedTags(asset.tags.map((tag) => tag.id));
      setFavorite(asset.favorite);
      setError("");
      setSaved(false);
      setPlayError(false);
    }
  }, [asset]);
  async function save() {
    if (!asset) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/assets/${asset.id}`, {
        method: "PATCH",
        body: { title, description, categoryId: category || null, tagIds: selectedTags, favorite },
      });
      setSaved(true);
      onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : "保存失败。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={!!asset}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent size="xl" className="preview-dialog">
        {asset && (
          <>
            <div className="preview-heading">
              <div>
                <DialogTitle>{asset.title}</DialogTitle>
                <DialogDescription>收藏里的每一个片刻</DialogDescription>
              </div>
              <Button variant="ghost" size="icon" aria-label="关闭预览" onClick={onClose}>
                <X size={18} />
              </Button>
            </div>
            <div className="video-stage">
              {/* biome-ignore lint/a11y/useMediaCaption: User-owned originals may not contain captions; no fabricated caption track. */}
              <video
                key={asset.id}
                src={`/api/assets/${asset.id}/media`}
                poster={asset.hasPoster ? `/api/assets/${asset.id}/poster` : undefined}
                controls
                playsInline
                preload="metadata"
                onError={() => setPlayError(true)}
                aria-label={asset.title}
              />
              {playError && (
                <p role="status">当前浏览器无法播放此编码。你可以下载文件，用本机播放器打开。</p>
              )}
            </div>
            <div className="preview-meta">
              <span>{formatDuration(asset.duration)}</span>
              <span>
                {asset.width && asset.height ? `${asset.width} × ${asset.height}` : asset.mime}
              </span>
              <span>{formatBytes(asset.size)}</span>
              <span>{formatDate(asset.createdAt)}</span>
              <a
                href={`/api/assets/${asset.id}/media`}
                download={`${asset.title}.${asset.mime === "video/webm" ? "webm" : asset.mime === "video/quicktime" ? "mov" : "mp4"}`}
                aria-label="下载视频"
              >
                <Download size={15} />
                下载
              </a>
              {asset.sourceUrl && (
                <a href={asset.sourceUrl} target="_blank" rel="noreferrer">
                  <ExternalLink size={15} />
                  原帖
                </a>
              )}
            </div>
            <div className="preview-form">
              <label className="field" htmlFor="asset-title">
                标题
                <Input
                  id="asset-title"
                  aria-label="标题"
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    setSaved(false);
                  }}
                  maxLength={300}
                />
              </label>
              <label className="field">
                分类
                <select
                  aria-label="视频分类"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  <option value="">未分类</option>
                  {categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field wide">
                笔记
                <textarea
                  aria-label="笔记"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  maxLength={5000}
                  placeholder="是什么让你想留下这个片段？"
                />
              </label>
              <div className="field wide">
                <span>标签</span>
                <div className="tag-options">
                  {tags.length ? (
                    tags.map((tag) => (
                      <label key={tag.id} className="tag-choice">
                        <input
                          type="checkbox"
                          checked={selectedTags.includes(tag.id)}
                          onChange={(event) =>
                            setSelectedTags((current) =>
                              event.target.checked
                                ? [...current, tag.id]
                                : current.filter((id) => id !== tag.id),
                            )
                          }
                        />
                        {tag.name}
                      </label>
                    ))
                  ) : (
                    <span className="muted">在「整理与设置」中创建标签。</span>
                  )}
                </div>
              </div>
            </div>
            {error && (
              <p role="alert" className="error-message">
                {error}
              </p>
            )}
            <div className="preview-footer">
              <Button
                variant={favorite ? "secondary" : "ghost"}
                icon={<Heart size={16} fill={favorite ? "currentColor" : "none"} />}
                onClick={() => setFavorite(!favorite)}
              >
                {favorite ? "已收藏" : "加入收藏"}
              </Button>
              <span className="muted" role="status">
                {saved ? "修改已保存" : ""}
              </span>
              <Button onClick={() => void save()} loading={busy} disabled={!title.trim()}>
                保存修改
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
