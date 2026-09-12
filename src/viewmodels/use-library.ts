import { useCallback, useEffect, useState } from "react";
import type { AssetPage, Category, Tag } from "../../shared/types";
import { api } from "../lib/api";

export interface Filters {
  q: string;
  favorite: boolean;
  category: string;
  tag: string;
  sort: string;
  page: number;
}
export function useLibrary(filters: Filters, revision: number) {
  const [data, setData] = useState<AssetPage>({ items: [], total: 0, page: 1, limit: 48 });
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const query = new URLSearchParams({
    q: filters.q,
    favorite: String(filters.favorite),
    category: filters.category,
    tag: filters.tag,
    sort: filters.sort,
    page: String(filters.page),
  }).toString();
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      setError("");
      try {
        const [assets, categories, tags] = await Promise.all([
          api<AssetPage>(`/api/assets?${query}`, { signal }),
          api<Category[]>("/api/categories", { signal }),
          api<Tag[]>("/api/tags", { signal }),
        ]);
        setData(assets);
        setCategories(categories);
        setTags(tags);
      } catch (error) {
        if (!signal?.aborted) setError(error instanceof Error ? error.message : "无法加载资料库。");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [query],
  );
  useEffect(() => {
    void revision;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      void refresh(controller.signal);
    }, 150);
    const interval = setInterval(() => void refresh(controller.signal), 30_000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      controller.abort();
    };
  }, [refresh, revision]);
  return { ...data, categories, tags, loading, error, refresh };
}
