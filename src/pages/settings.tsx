import { Button, Input, LayerCard } from "@nocoo/basalt";
import { PageHeader } from "@nocoo/basalt/components/page-header";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Category, Tag } from "../../shared/types";
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
    <div className="taxonomy-row" key={item.id}>
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
            aria-label="保存名称"
            disabled={busy || !edit.name.trim()}
            onClick={() => void mutate(type, "PATCH", item.id, { name: edit.name })}
          >
            <Check size={16} />
          </Button>
          <Button size="icon" variant="ghost" aria-label="取消修改" onClick={() => setEdit(null)}>
            <X size={16} />
          </Button>
        </>
      ) : (
        <>
          <span>
            {item.name}
            {type === "categories" &&
              categories.find((category) => category.id === item.id)?.parentId && (
                <small className="muted">
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
            aria-label={`重命名 ${item.name}`}
            onClick={() => setEdit({ id: item.id, type, name: item.name })}
          >
            <Pencil size={15} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label={`删除 ${item.name}`}
            disabled={busy}
            onClick={() => void mutate(type, "DELETE", item.id)}
          >
            <Trash2 size={15} />
          </Button>
        </>
      )}
    </div>
  );
  return (
    <>
      <PageHeader title="整理与设置" description="给收藏留一个清楚的位置。" />
      {message && (
        <p role="alert" className="notice">
          {message}
        </p>
      )}
      <div className="settings-grid">
        <LayerCard className="settings-card">
          <h2>分类</h2>
          <p className="muted">按项目、主题或用途归档。删除分类不会删除视频。</p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void mutate("categories", "POST", undefined, {
                name: category,
                parentId: parent || null,
              });
            }}
          >
            <label className="field" htmlFor="new-category-name">
              新分类名称
              <Input
                id="new-category-name"
                aria-label="新分类名称"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                maxLength={100}
              />
            </label>
            <label className="field" htmlFor="category-parent">
              上级分类
              <select
                id="category-parent"
                aria-label="上级分类"
                value={parent}
                onChange={(event) => setParent(event.target.value)}
              >
                <option value="">无上级分类</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="submit"
              disabled={!category.trim()}
              loading={busy}
              icon={<Plus size={16} />}
            >
              创建分类
            </Button>
          </form>
          <div className="taxonomy-list">
            {categories.length ? (
              categories.map((item) => row(item, "categories"))
            ) : (
              <span className="muted">还没有分类。</span>
            )}
          </div>
        </LayerCard>
        <LayerCard className="settings-card">
          <h2>标签</h2>
          <p className="muted">一个视频可以有多个标签，也可以跨分类搜索。</p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void mutate("tags", "POST", undefined, { name: tag });
            }}
          >
            <label className="field" htmlFor="new-tag-name">
              新标签名称
              <Input
                id="new-tag-name"
                aria-label="新标签名称"
                value={tag}
                onChange={(event) => setTag(event.target.value)}
                maxLength={100}
              />
            </label>
            <Button type="submit" disabled={!tag.trim()} loading={busy} icon={<Plus size={16} />}>
              创建标签
            </Button>
          </form>
          <div className="taxonomy-list">
            {tags.length ? (
              tags.map((item) => row(item, "tags"))
            ) : (
              <span className="muted">还没有标签。</span>
            )}
          </div>
        </LayerCard>
      </div>
      <LayerCard className="storage-note">
        <h2>私有，且由你掌握</h2>
        <p>
          每个视频最大 512 MiB，当前资料库上限 50 GiB。上传中断后，24
          小时内重新选择同一文件即可续传。重复文件会复用已保存的副本。
        </p>
        <p>
          删除视频后会立即撤下访问入口，未被引用的文件会在下一轮清理中移除。不会自动删除 X
          原帖或书签。
        </p>
        <p className="muted">Snail 0.1.0 · MIT · 只保存你拥有或获准保存的内容。</p>
        <a className="text-link" href="/cdn-cgi/access/logout">
          退出登录
        </a>
      </LayerCard>
    </>
  );
}
