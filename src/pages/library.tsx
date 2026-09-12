import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Input,
} from "@nocoo/basalt";
import { PageHeader } from "@nocoo/basalt/components/page-header";
import {
  Bookmark,
  CheckSquare,
  Film,
  Grid2X2,
  Heart,
  LayoutList,
  Link2,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useState } from "react";
import type { Asset } from "../../shared/types";
import { AssetCard } from "../components/asset-card";
import { AssetPreview } from "../components/asset-preview";
import { api } from "../lib/api";
import type { Filters } from "../viewmodels/use-library";
import { useLibrary } from "../viewmodels/use-library";

type Layout = "grid" | "masonry" | "list" | "cinema";
const layouts = [
  { id: "grid", label: "网格", icon: Grid2X2 },
  { id: "masonry", label: "瀑布", icon: SlidersHorizontal },
  { id: "list", label: "列表", icon: LayoutList },
  { id: "cinema", label: "影院", icon: Film },
] as const;
export function LibraryPage({
  revision,
  onUpload,
  filters,
  onFilters,
  title,
}: {
  revision: number;
  onUpload: () => void;
  filters: Filters;
  onFilters: (next: Partial<Filters>) => void;
  title: string;
}) {
  const library = useLibrary(filters, revision);
  const [layout, setLayout] = useState<Layout>(() => {
    try {
      const stored = localStorage.getItem("snail-layout");
      return layouts.some((item) => item.id === stored) ? (stored as Layout) : "grid";
    } catch {
      return "grid";
    }
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [preview, setPreview] = useState<Asset | null>(null);
  const [cinema, setCinema] = useState<Asset | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [approved, setApproved] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [batchCategory, setBatchCategory] = useState("");
  const [batchTag, setBatchTag] = useState("");
  async function favorite(asset: Asset) {
    try {
      await api(`/api/assets/${asset.id}`, {
        method: "PATCH",
        body: { favorite: !asset.favorite },
      });
      await library.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败。");
    }
  }
  async function bulk(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setMessage("");
    try {
      await api("/api/assets/bulk", { method: "POST", body: { ids: selected, action, ...extra } });
      setSelected([]);
      setDeleteOpen(false);
      await library.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败。");
    } finally {
      setBusy(false);
    }
  }
  async function addLink() {
    setImportBusy(true);
    setMessage("");
    try {
      await api("/api/jobs", { method: "POST", body: { url, approved } });
      setImportOpen(false);
      setUrl("");
      setApproved(false);
      setMessage("链接已加入导入队列。连接的本机上线后会开始处理。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "导入失败。");
    } finally {
      setImportBusy(false);
    }
  }
  const current =
    (cinema && library.items.find((item) => item.id === cinema.id)) || library.items[0];
  return (
    <>
      <PageHeader
        title={title}
        description={`${library.total} 个视频 · 留住值得再看的片刻`}
        actions={
          <>
            <Button
              variant="outline"
              icon={<Link2 size={16} />}
              onClick={() => setImportOpen(true)}
            >
              收藏链接
            </Button>
            <Button icon={<Plus size={17} />} onClick={onUpload}>
              上传视频
            </Button>
          </>
        }
        filters={
          <div className="library-filters">
            <div className="search-field">
              <Search size={17} />
              <Input
                placeholder="搜索标题、笔记或标签…"
                value={filters.q}
                onChange={(event) => onFilters({ q: event.target.value, page: 1 })}
                aria-label="搜索视频"
              />
            </div>
            <select
              aria-label="筛选分类"
              value={filters.category}
              onChange={(event) => onFilters({ category: event.target.value, page: 1 })}
            >
              <option value="">所有分类</option>
              <option value="uncategorized">未分类</option>
              {library.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              aria-label="筛选标签"
              value={filters.tag}
              onChange={(event) => onFilters({ tag: event.target.value, page: 1 })}
            >
              <option value="">所有标签</option>
              {library.tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
            <select
              aria-label="视频排序"
              value={filters.sort}
              onChange={(event) => onFilters({ sort: event.target.value, page: 1 })}
            >
              <option value="newest">最新收藏</option>
              <option value="oldest">最早收藏</option>
              <option value="title">标题 A–Z</option>
              <option value="duration">时长优先</option>
              <option value="size">文件大小</option>
            </select>
          </div>
        }
      />
      <div className="library-toolbar">
        <div className="toolbar-left">
          <Button
            variant="ghost"
            size="sm"
            icon={<CheckSquare size={16} />}
            onClick={() => setSelected(selected.length ? [] : library.items.map((item) => item.id))}
          >
            {selected.length ? `已选 ${selected.length}` : "选择"}
          </Button>
          <span className="saved-note">
            <span className="status-dot" />
            私人资料库
          </span>
        </div>
        <fieldset className="layout-switch" aria-label="视频布局">
          {layouts.map((item) => (
            <button
              type="button"
              key={item.id}
              title={item.label}
              aria-label={`${item.label}布局`}
              aria-pressed={layout === item.id}
              onClick={() => {
                setLayout(item.id);
                try {
                  localStorage.setItem("snail-layout", item.id);
                } catch {}
              }}
            >
              <item.icon size={17} />
            </button>
          ))}
        </fieldset>
      </div>
      {selected.length > 0 && (
        <fieldset className="bulk-toolbar" aria-label="批量操作">
          <strong>{selected.length} 个视频</strong>
          <Button
            size="sm"
            variant="secondary"
            icon={<Heart size={15} />}
            onClick={() => void bulk("favorite")}
            loading={busy}
          >
            收藏
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void bulk("unfavorite")} disabled={busy}>
            取消收藏
          </Button>
          <select
            aria-label="批量分类"
            value={batchCategory}
            onChange={(event) => setBatchCategory(event.target.value)}
          >
            <option value="">未分类</option>
            {library.categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void bulk("category", { categoryId: batchCategory || null })}
            disabled={busy}
          >
            移动
          </Button>
          <select
            aria-label="批量标签"
            value={batchTag}
            onChange={(event) => setBatchTag(event.target.value)}
          >
            <option value="">选择标签</option>
            {library.tags.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void bulk("tags", { tagIds: [batchTag] })}
            disabled={!batchTag || busy}
          >
            添加标签
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={<Trash2 size={15} />}
            onClick={() => setDeleteOpen(true)}
            disabled={busy}
          >
            删除
          </Button>
          <Button variant="ghost" size="icon" aria-label="取消选择" onClick={() => setSelected([])}>
            <X size={16} />
          </Button>
        </fieldset>
      )}
      {(message || library.error) && (
        <p role={library.error ? "alert" : "status"} className="notice">
          {library.error || message}
          {library.error && (
            <Button size="sm" variant="ghost" onClick={() => void library.refresh()}>
              重试
            </Button>
          )}
        </p>
      )}
      {library.loading && !library.items.length ? (
        <div className="empty-state" role="status">
          正在打开资料库…
        </div>
      ) : !library.items.length ? (
        <div className="empty-state">
          <div className="empty-symbol">
            <Bookmark size={38} strokeWidth={1.2} />
          </div>
          <span className="eyebrow">A PLACE FOR YOUR FAVORITES</span>
          <h2>
            {filters.q || filters.category || filters.tag || filters.favorite
              ? "还没有匹配的视频"
              : "好片段，慢慢收藏。"}
          </h2>
          <p>
            {filters.q || filters.category || filters.tag || filters.favorite
              ? "试试其他关键词，或调整筛选条件。"
              : "把喜欢的视频放在一起。上传、整理，然后随时回来看看。"}
          </p>
          <Button icon={<Upload size={16} />} onClick={onUpload}>
            上传第一个视频
          </Button>
          <span className="muted empty-hint">MP4 / WebM / MOV · 每个视频最大 512 MiB</span>
        </div>
      ) : (
        <section
          data-layout={layout}
          className={`video-library layout-${layout}`}
          aria-label="视频资料库"
        >
          {layout === "cinema" && current && (
            <div className="cinema-player">
              <div className="cinema-stage">
                {/* biome-ignore lint/a11y/useMediaCaption: User-owned originals may not contain captions; no fabricated caption track. */}
                <video
                  key={current.id}
                  controls
                  playsInline
                  preload="metadata"
                  src={`/api/assets/${current.id}/media`}
                  poster={current.hasPoster ? `/api/assets/${current.id}/poster` : undefined}
                />
              </div>
              <div className="cinema-heading">
                <h2>{current.title}</h2>
                <Button variant="outline" size="sm" onClick={() => setPreview(current)}>
                  查看详情
                </Button>
              </div>
            </div>
          )}
          <div className="asset-collection">
            {library.items.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                selected={selected.includes(asset.id)}
                onSelect={() =>
                  setSelected((items) =>
                    items.includes(asset.id)
                      ? items.filter((id) => id !== asset.id)
                      : [...items, asset.id],
                  )
                }
                onPlay={() => (layout === "cinema" ? setCinema(asset) : setPreview(asset))}
                onFavorite={() => void favorite(asset)}
              />
            ))}
          </div>
        </section>
      )}
      {library.total > library.limit && (
        <div className="pagination">
          <Button
            variant="outline"
            disabled={filters.page <= 1}
            onClick={() => onFilters({ page: filters.page - 1 })}
          >
            上一页
          </Button>
          <span>
            {filters.page} / {Math.ceil(library.total / library.limit)}
          </span>
          <Button
            variant="outline"
            disabled={filters.page * library.limit >= library.total}
            onClick={() => onFilters({ page: filters.page + 1 })}
          >
            下一页
          </Button>
        </div>
      )}
      <p className="library-footnote">仅保存你拥有或获准保存的内容。视频保持私有，可随时删除。</p>
      <AssetPreview
        asset={preview}
        categories={library.categories}
        tags={library.tags}
        onClose={() => setPreview(null)}
        onSaved={() => void library.refresh()}
      />
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogTitle>删除这 {selected.length} 个视频？</DialogTitle>
          <DialogDescription>
            视频会立即从资料库移除，未被其他条目使用的文件将一并清理。此操作无法撤销。
          </DialogDescription>
          <div className="dialog-actions">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              保留视频
            </Button>
            <Button variant="destructive" loading={busy} onClick={() => void bulk("delete")}>
              确认删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent size="lg">
          <DialogTitle>收藏 X 视频链接</DialogTitle>
          <DialogDescription>
            本机 Connector 会用已登录的浏览器解析这条帖子。电脑离线时，链接会留在队列中。
          </DialogDescription>
          <label className="field" htmlFor="import-url">
            帖子链接
            <Input
              id="import-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://x.com/…/status/…"
              aria-label="X 帖子链接"
            />
          </label>
          <label className="consent">
            <input
              type="checkbox"
              checked={approved}
              onChange={(event) => setApproved(event.target.checked)}
            />
            我拥有或已获准保存这条视频。
          </label>
          {message && <p role="status">{message}</p>}
          <div className="dialog-actions">
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              取消
            </Button>
            <Button
              disabled={!approved || !url.trim()}
              loading={importBusy}
              onClick={() => void addLink()}
            >
              加入导入队列
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
