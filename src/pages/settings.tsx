import { Button, DescriptionList, Field, Input, LayerCard } from "@nocoo/basalt";
import { Banner } from "@nocoo/basalt/components/banner";
import { PageHeader } from "@nocoo/basalt/components/page-header";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { version } from "../../package.json";
import type { Category, Tag } from "../../shared/types";
import { OptionSelect } from "../components/option-select";
import { api } from "../lib/api";

export function SettingsPage({ onChanged }: { onChanged: () => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [category, setCategory] = useState("");
  const [parent, setParent] = useState("");
  const [tag, setTag] = useState("");
  const [edit, setEdit] = useState<{ id: string; type: string; name: string } | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const [categories, tags] = await Promise.all([
        api<Category[]>("/api/categories"),
        api<Tag[]>("/api/tags"),
      ]);
      setCategories(categories);
      setTags(tags);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "无法读取分类。");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function mutate(type: string, method: string, id?: string, body?: unknown) {
    setBusy(true);
    setMessage("");
    try {
      await api(`/api/${type}${id ? `/${id}` : ""}`, { method, body });
      setEdit(null);
      if (!id) {
        if (type === "categories") setCategory("");
        else setTag("");
      }
      await load();
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败。");
    } finally {
      setBusy(false);
    }
  }
  const row = (item: Tag, type: string) => (
    <div className="taxonomy-row flex min-w-0 items-center gap-2" key={item.id}>
      {edit?.id === item.id ? (
        <>
          <Input
            aria-label="修改名称"
            value={edit.name}
            onChange={(event) => setEdit({ ...edit, name: event.target.value })}
          />
          <Button
            size="icon"
            variant="ghost"
            className="shrink-0"
            aria-label="保存名称"
            disabled={busy || !edit.name.trim()}
            onClick={() => void mutate(type, "PATCH", item.id, { name: edit.name })}
          >
            <Check className="size-4" strokeWidth={1.5} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="shrink-0"
            aria-label="取消修改"
            onClick={() => setEdit(null)}
          >
            <X className="size-4" strokeWidth={1.5} />
          </Button>
        </>
      ) : (
        <>
          <span className="min-w-0 flex-1 break-words text-sm">
            {item.name}
            {type === "categories" &&
              categories.find((category) => category.id === item.id)?.parentId && (
                <small className="text-basalt-muted-foreground">
                  {" "}
                  ·{" "}
                  {
                    categories.find(
                      (category) =>
                        category.id === categories.find((c) => c.id === item.id)?.parentId,
                    )?.name
                  }
                </small>
              )}
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="shrink-0"
            aria-label={`重命名 ${item.name}`}
            onClick={() => setEdit({ id: item.id, type, name: item.name })}
          >
            <Pencil className="size-4" strokeWidth={1.5} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="shrink-0"
            aria-label={`删除 ${item.name}`}
            disabled={busy}
            onClick={() => void mutate(type, "DELETE", item.id)}
          >
            <Trash2 className="size-4" strokeWidth={1.5} />
          </Button>
        </>
      )}
    </div>
  );
  return (
    <div className="space-y-6">
      <PageHeader title="整理与设置" description="给收藏留一个清楚的位置。" />
      {message && <Banner variant="error" role="alert" size="sm" description={message} />}
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <LayerCard>
          <LayerCard.Header>
            <h2 className="text-sm font-medium text-basalt-foreground">分类</h2>
          </LayerCard.Header>
          <LayerCard.Well className="space-y-5">
            <p className="text-sm text-basalt-muted-foreground">
              按项目、主题或用途归档。删除分类不会删除视频。
            </p>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void mutate("categories", "POST", undefined, {
                  name: category,
                  parentId: parent || null,
                });
              }}
            >
              <Field label="新分类名称" htmlFor="new-category-name">
                <Input
                  id="new-category-name"
                  aria-label="新分类名称"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  maxLength={100}
                />
              </Field>
              <Field label="上级分类" htmlFor="category-parent">
                <OptionSelect
                  id="category-parent"
                  aria-label="上级分类"
                  value={parent}
                  onValueChange={setParent}
                  options={[
                    { value: "", label: "无上级分类" },
                    ...categories.map((item) => ({ value: item.id, label: item.name })),
                  ]}
                />
              </Field>
              <Button
                type="submit"
                disabled={!category.trim()}
                loading={busy}
                icon={<Plus className="size-4" strokeWidth={1.5} />}
              >
                创建分类
              </Button>
            </form>
            <div className="space-y-2">
              {categories.length ? (
                categories.map((item) => row(item, "categories"))
              ) : (
                <p className="text-xs text-basalt-muted-foreground">还没有分类。</p>
              )}
            </div>
          </LayerCard.Well>
        </LayerCard>
        <LayerCard>
          <LayerCard.Header>
            <h2 className="text-sm font-medium text-basalt-foreground">标签</h2>
          </LayerCard.Header>
          <LayerCard.Well className="space-y-5">
            <p className="text-sm text-basalt-muted-foreground">
              一个视频可以有多个标签，也可以跨分类搜索。
            </p>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void mutate("tags", "POST", undefined, { name: tag });
              }}
            >
              <Field label="新标签名称" htmlFor="new-tag-name">
                <Input
                  id="new-tag-name"
                  aria-label="新标签名称"
                  value={tag}
                  onChange={(event) => setTag(event.target.value)}
                  maxLength={100}
                />
              </Field>
              <Button
                type="submit"
                disabled={!tag.trim()}
                loading={busy}
                icon={<Plus className="size-4" strokeWidth={1.5} />}
              >
                创建标签
              </Button>
            </form>
            <div className="space-y-2">
              {tags.length ? (
                tags.map((item) => row(item, "tags"))
              ) : (
                <p className="text-xs text-basalt-muted-foreground">还没有标签。</p>
              )}
            </div>
          </LayerCard.Well>
        </LayerCard>
      </div>
      <LayerCard>
        <LayerCard.Header>
          <h2 className="text-sm font-medium text-basalt-foreground">存储与隐私</h2>
        </LayerCard.Header>
        <LayerCard.Well className="space-y-4">
          <DescriptionList columns={2}>
            <DescriptionList.Item term="单个视频上限">512 MiB</DescriptionList.Item>
            <DescriptionList.Item term="资料库上限">50 GiB</DescriptionList.Item>
            <DescriptionList.Item term="断点续传">24 小时内重新选择同一文件</DescriptionList.Item>
            <DescriptionList.Item term="重复文件">复用已保存的副本</DescriptionList.Item>
          </DescriptionList>
          <p className="text-sm text-basalt-muted-foreground">
            删除视频后会立即撤下访问入口，未被引用的文件会在下一轮清理中移除。不会自动删除 X
            原帖或书签。
          </p>
        </LayerCard.Well>
        <LayerCard.Footer className="justify-between">
          <span className="text-xs text-basalt-muted-foreground">Snail {version} · MIT</span>
          <Button variant="ghost" size="sm" asChild>
            <a href="/cdn-cgi/access/logout">退出登录</a>
          </Button>
        </LayerCard.Footer>
      </LayerCard>
    </div>
  );
}
