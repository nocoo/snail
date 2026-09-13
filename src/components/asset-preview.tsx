import {
  Button,
  Checkbox,
  DescriptionList,
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
} from "@nocoo/basalt";
import { Banner } from "@nocoo/basalt/components/banner";
import { InputArea } from "@nocoo/basalt/components/input-area";
import { Download, ExternalLink, Heart, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Asset, Category, Tag } from "../../shared/types";
import { api } from "../lib/api";
import { formatBytes, formatDate, formatDuration } from "../lib/format";
import { useDialogFocus } from "../lib/use-dialog-focus";
import { OptionSelect } from "./option-select";

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
  const [saved, setSaved] = useState("");
  const [playError, setPlayError] = useState(false);
  const dialogFocus = useDialogFocus();
  const changes = {
    title,
    description,
    categoryId: category || null,
    tagIds: selectedTags,
    favorite,
  };
  const editSignature = JSON.stringify([asset?.id, changes]);
  useEffect(() => {
    if (asset) {
      setTitle(asset.title);
      setDescription(asset.description);
      setCategory(asset.categoryId ?? "");
      setSelectedTags(asset.tags.map((tag) => tag.id));
      setFavorite(asset.favorite);
      setError("");
      setSaved("");
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
        body: changes,
      });
      setSaved(editSignature);
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
      <DialogContent size="xl" className="space-y-5" {...dialogFocus}>
        {asset && (
          <>
            <div className="flex items-start justify-between gap-4">
              <DialogHeader className="min-w-0">
                <DialogTitle className="break-words">{asset.title}</DialogTitle>
                <DialogDescription>收藏里的每一个片刻</DialogDescription>
              </DialogHeader>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                aria-label="关闭预览"
                onClick={onClose}
              >
                <X className="size-4" strokeWidth={1.5} />
              </Button>
            </div>
            <LayerCard padding="none" className="video-stage">
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
                <Banner
                  variant="secondary"
                  role="status"
                  size="sm"
                  description="当前浏览器无法播放此编码。你可以下载文件，用本机播放器打开。"
                />
              )}
            </LayerCard>
            <DescriptionList columns={2}>
              <DescriptionList.Item term="时长">
                {formatDuration(asset.duration)}
              </DescriptionList.Item>
              <DescriptionList.Item term="画面">
                {asset.width && asset.height ? `${asset.width} × ${asset.height}` : asset.mime}
              </DescriptionList.Item>
              <DescriptionList.Item term="大小">{formatBytes(asset.size)}</DescriptionList.Item>
              <DescriptionList.Item term="收藏时间">
                {formatDate(asset.createdAt)}
              </DescriptionList.Item>
            </DescriptionList>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`/api/assets/${asset.id}/media`}
                  download={`${asset.title}.${asset.mime === "video/webm" ? "webm" : asset.mime === "video/quicktime" ? "mov" : "mp4"}`}
                  aria-label="下载视频"
                >
                  <Download className="size-4" strokeWidth={1.5} />
                  下载
                </a>
              </Button>
              {asset.sourceUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={asset.sourceUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-4" strokeWidth={1.5} />
                    原帖
                  </a>
                </Button>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="标题" htmlFor="asset-title">
                <Input
                  id="asset-title"
                  aria-label="标题"
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                  }}
                  maxLength={300}
                />
              </Field>
              <Field label="分类" htmlFor="asset-category">
                <OptionSelect
                  id="asset-category"
                  aria-label="视频分类"
                  value={category}
                  onValueChange={setCategory}
                  options={[
                    { value: "", label: "未分类" },
                    ...categories.map((item) => ({ value: item.id, label: item.name })),
                  ]}
                />
              </Field>
              <Field label="笔记" htmlFor="asset-notes" className="sm:col-span-2">
                <InputArea
                  id="asset-notes"
                  aria-label="笔记"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  maxLength={5000}
                  placeholder="是什么让你想留下这个片段？"
                />
              </Field>
              <Checkbox.Group
                value={selectedTags}
                onValueChange={setSelectedTags}
                className="sm:col-span-2"
              >
                <Checkbox.Legend>标签</Checkbox.Legend>
                <div className="flex flex-wrap gap-3">
                  {tags.length ? (
                    tags.map((tag) => (
                      <div key={tag.id} className="flex items-center gap-2">
                        <Checkbox.Item id={`asset-tag-${tag.id}`} value={tag.id} />
                        <Label htmlFor={`asset-tag-${tag.id}`}>{tag.name}</Label>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-basalt-muted-foreground">
                      在「整理与设置」中创建标签。
                    </span>
                  )}
                </div>
              </Checkbox.Group>
            </div>
            {error && <Banner variant="error" role="alert" size="sm" description={error} />}
            <DialogFooter className="sm:items-center">
              <Button
                variant={favorite ? "secondary" : "ghost"}
                icon={
                  <Heart
                    className="size-4"
                    fill={favorite ? "currentColor" : "none"}
                    strokeWidth={1.5}
                  />
                }
                onClick={() => setFavorite(!favorite)}
              >
                {favorite ? "已收藏" : "加入收藏"}
              </Button>
              <span className="text-xs text-basalt-muted-foreground sm:mr-auto" role="status">
                {saved === editSignature ? "修改已保存" : ""}
              </span>
              <Button onClick={() => void save()} loading={busy} disabled={!title.trim()}>
                保存修改
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
