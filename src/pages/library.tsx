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
  TablePager,
} from "@nocoo/basalt";
import { Banner } from "@nocoo/basalt/components/banner";
import { PageHeader } from "@nocoo/basalt/components/page-header";
import { ToggleGroup, ToggleGroupItem } from "@nocoo/basalt/components/toggle-group";
import {
  Bookmark,
  CheckSquare,
  Film,
  Grid2X2,
  Heart,
  LayoutList,
  Link2,
  Plus,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useState } from "react";
import type { Asset } from "../../shared/types";
import { AssetCard } from "../components/asset-card";
import { AssetPreview } from "../components/asset-preview";
import { OptionSelect } from "../components/option-select";
import { api } from "../lib/api";
import { useDialogFocus } from "../lib/use-dialog-focus";
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
  const [filtersOpen, setFiltersOpen] = useState(true);
  const deleteFocus = useDialogFocus();
  const importFocus = useDialogFocus();
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
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={`${library.total} 个视频 · 留住值得再看的片刻`}
        actions={
          <>
            <Button
              variant={filtersOpen ? "secondary" : "outline"}
              icon={<SlidersHorizontal className="size-4" strokeWidth={1.5} />}
              aria-expanded={filtersOpen}
              aria-controls="library-filters"
              onClick={() => setFiltersOpen((open) => !open)}
            >
              筛选
            </Button>
            <Button
              variant="outline"
              icon={<Link2 className="size-4" strokeWidth={1.5} />}
              onClick={() => setImportOpen(true)}
            >
              收藏链接
            </Button>
            <Button icon={<Plus className="size-4" strokeWidth={1.5} />} onClick={onUpload}>
              上传视频
            </Button>
          </>
        }
      />
      {filtersOpen && (
        <LayerCard id="library-filters" role="region" aria-label="视频筛选">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Field label="搜索" htmlFor="library-search" className="col-span-2 lg:col-span-1">
              <Input
                id="library-search"
                placeholder="搜索标题、笔记或标签…"
                value={filters.q}
                onChange={(event) => onFilters({ q: event.target.value, page: 1 })}
                aria-label="搜索视频"
              />
            </Field>
            <Field label="分类" htmlFor="library-category">
              <OptionSelect
                id="library-category"
                aria-label="筛选分类"
                value={filters.category}
                onValueChange={(category) => onFilters({ category, page: 1 })}
                options={[
                  { value: "", label: "所有分类" },
                  { value: "uncategorized", label: "未分类" },
                  ...library.categories.map((item) => ({ value: item.id, label: item.name })),
                ]}
              />
            </Field>
            <Field label="标签" htmlFor="library-tag">
              <OptionSelect
                id="library-tag"
                aria-label="筛选标签"
                value={filters.tag}
                onValueChange={(tag) => onFilters({ tag, page: 1 })}
                options={[
                  { value: "", label: "所有标签" },
                  ...library.tags.map((item) => ({ value: item.id, label: item.name })),
                ]}
              />
            </Field>
            <Field label="排序" htmlFor="library-sort" className="col-span-2 lg:col-span-1">
              <OptionSelect
                id="library-sort"
                aria-label="视频排序"
                value={filters.sort}
                onValueChange={(sort) => onFilters({ sort, page: 1 })}
                options={[
                  { value: "newest", label: "最新收藏" },
                  { value: "oldest", label: "最早收藏" },
                  { value: "title", label: "标题 A–Z" },
                  { value: "duration", label: "时长优先" },
                  { value: "size", label: "文件大小" },
                ]}
              />
            </Field>
          </div>
        </LayerCard>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            icon={<CheckSquare className="size-4" strokeWidth={1.5} />}
            onClick={() => setSelected(selected.length ? [] : library.items.map((item) => item.id))}
          >
            {selected.length ? `已选 ${selected.length}` : "选择"}
          </Button>
          <Badge variant="secondary" className="hidden sm:inline-flex">
            私人资料库
          </Badge>
        </div>
        <ToggleGroup
          type="single"
          value={layout}
          aria-label="视频布局"
          onValueChange={(value) => {
            if (!value) return;
            setLayout(value as Layout);
            try {
              localStorage.setItem("snail-layout", value);
            } catch {}
          }}
        >
          {layouts.map((item) => (
            <ToggleGroupItem
              key={item.id}
              value={item.id}
              title={item.label}
              aria-label={`${item.label}布局`}
            >
              <item.icon className="size-4" strokeWidth={1.5} aria-hidden="true" />
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      {selected.length > 0 && (
        <LayerCard role="group" aria-label="批量操作" className="flex flex-wrap items-center gap-2">
          <strong className="text-sm">{selected.length} 个视频</strong>
          <Button
            size="sm"
            variant="secondary"
            icon={<Heart className="size-4" strokeWidth={1.5} />}
            onClick={() => void bulk("favorite")}
            loading={busy}
          >
            收藏
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void bulk("unfavorite")} disabled={busy}>
            取消收藏
          </Button>
          <OptionSelect
            aria-label="批量分类"
            size="sm"
            className="w-40"
            value={batchCategory}
            onValueChange={setBatchCategory}
            options={[
              { value: "", label: "未分类" },
              ...library.categories.map((item) => ({ value: item.id, label: item.name })),
            ]}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => void bulk("category", { categoryId: batchCategory || null })}
            disabled={busy}
          >
            移动
          </Button>
          <OptionSelect
            aria-label="批量标签"
            size="sm"
            className="w-40"
            value={batchTag}
            onValueChange={setBatchTag}
            options={[
              { value: "", label: "选择标签" },
              ...library.tags.map((item) => ({ value: item.id, label: item.name })),
            ]}
          />
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
            icon={<Trash2 className="size-4" strokeWidth={1.5} />}
            onClick={() => setDeleteOpen(true)}
            disabled={busy}
          >
            删除
          </Button>
          <Button variant="ghost" size="icon" aria-label="取消选择" onClick={() => setSelected([])}>
            <X className="size-4" strokeWidth={1.5} />
          </Button>
        </LayerCard>
      )}
      {(message || library.error) && (
        <Banner
          variant={library.error ? "error" : "secondary"}
          role={library.error ? "alert" : "status"}
          size="sm"
          description={library.error || message}
          action={
            library.error ? (
              <Banner.Action onClick={() => void library.refresh()}>重试</Banner.Action>
            ) : undefined
          }
        />
      )}
      {library.loading && !library.items.length ? (
        <LayerCard>
          <LayerCard.Loading label="正在打开资料库…" />
        </LayerCard>
      ) : !library.items.length ? (
        <LayerCard>
          <LayerCard.Empty
            icon={<Bookmark className="size-8" strokeWidth={1.5} />}
            title={
              filters.q || filters.category || filters.tag || filters.favorite
                ? "还没有匹配的视频"
                : "好片段，慢慢收藏。"
            }
            description={
              filters.q || filters.category || filters.tag || filters.favorite
                ? "试试其他关键词，或调整筛选条件。"
                : "把喜欢的视频放在一起。上传、整理，然后随时回来看看。"
            }
            action={
              <Button icon={<Upload className="size-4" strokeWidth={1.5} />} onClick={onUpload}>
                上传第一个视频
              </Button>
            }
          >
            <p className="text-xs text-basalt-muted-foreground">
              MP4 / WebM / MOV · 每个视频最大 512 MiB
            </p>
          </LayerCard.Empty>
        </LayerCard>
      ) : (
        <section
          data-layout={layout}
          className={`video-library layout-${layout}`}
          aria-label="视频资料库"
        >
          {layout === "cinema" && current && (
            <LayerCard className="mb-4">
              <LayerCard.Well className="cinema-stage p-0">
                {/* biome-ignore lint/a11y/useMediaCaption: User-owned originals may not contain captions; no fabricated caption track. */}
                <video
                  key={current.id}
                  controls
                  playsInline
                  preload="metadata"
                  src={`/api/assets/${current.id}/media`}
                  poster={current.hasPoster ? `/api/assets/${current.id}/poster` : undefined}
                />
              </LayerCard.Well>
              <LayerCard.Footer className="justify-between">
                <h2 className="min-w-0 flex-1 truncate text-sm font-medium">{current.title}</h2>
                <Button variant="outline" size="sm" onClick={() => setPreview(current)}>
                  查看详情
                </Button>
              </LayerCard.Footer>
            </LayerCard>
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
        <TablePager
          page={filters.page}
          pageSize={library.limit}
          totalCount={library.total}
          onPageChange={(page) => onFilters({ page })}
          formatRange={({ start, end, totalCount }) => `${start}–${end} / ${totalCount} 个视频`}
        />
      )}
      <p className="text-center text-xs text-basalt-muted-foreground">
        仅保存你拥有或获准保存的内容。视频保持私有，可随时删除。
      </p>
      <AssetPreview
        asset={preview}
        categories={library.categories}
        tags={library.tags}
        onClose={() => setPreview(null)}
        onSaved={() => void library.refresh()}
      />
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent {...deleteFocus}>
          <DialogHeader>
            <DialogTitle>删除这 {selected.length} 个视频？</DialogTitle>
            <DialogDescription>
              视频会立即从资料库移除，未被其他条目使用的文件将一并清理。此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              保留视频
            </Button>
            <Button variant="destructive" loading={busy} onClick={() => void bulk("delete")}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent size="lg" className="space-y-5" {...importFocus}>
          <DialogHeader>
            <DialogTitle>收藏 X 视频链接</DialogTitle>
            <DialogDescription>
              本机 Connector 会用已登录的浏览器解析这条帖子。电脑离线时，链接会留在队列中。
            </DialogDescription>
          </DialogHeader>
          <Field label="帖子链接" htmlFor="import-url">
            <Input
              id="import-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://x.com/…/status/…"
              aria-label="X 帖子链接"
            />
          </Field>
          <div className="flex items-start gap-2">
            <Checkbox
              id="import-consent"
              checked={approved}
              onCheckedChange={(checked) => setApproved(checked === true)}
            />
            <Label htmlFor="import-consent" className="leading-5">
              我拥有或已获准保存这条视频。
            </Label>
          </div>
          {message && <Banner variant="secondary" role="status" size="sm" description={message} />}
          <DialogFooter>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
