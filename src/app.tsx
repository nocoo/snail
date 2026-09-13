import {
  Button,
  ContentIsland,
  Input,
  LayerCard,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  ThemeToggle,
} from "@nocoo/basalt";
import { AppHeader } from "@nocoo/basalt/components/app-header";
import { AppMain, AppShell, AppSkipLink } from "@nocoo/basalt/components/app-shell";
import { LoadingScreen } from "@nocoo/basalt/components/loading-screen";
import { Bookmark, Folder, Heart, LibraryBig, Link2, Menu, Settings2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Category, UploadProgress } from "../shared/types";
import { NavigationContext } from "./components/app-link";
import { AppSidebar, type NavigationGroup } from "./components/app-sidebar";
import { BrandMark } from "./components/brand";
import { GithubMark } from "./components/github-mark";
import { UploadTray } from "./components/upload-tray";
import { api } from "./lib/api";
import { uploadFile } from "./lib/upload";
import { ConnectPage } from "./pages/connect";
import { LibraryPage } from "./pages/library";
import { SettingsPage } from "./pages/settings";
import { SignInPage } from "./pages/sign-in";
import type { Filters } from "./viewmodels/use-library";

function useMobile() {
  const query = "(max-width: 767px)";
  return useSyncExternalStore(
    (callback) => {
      const media = matchMedia(query);
      media.addEventListener("change", callback);
      return () => media.removeEventListener("change", callback);
    },
    () => matchMedia(query).matches,
    () => false,
  );
}

export function App() {
  const mobile = useMobile();
  const [path, setPath] = useState(location.pathname);
  const [collapsed, setCollapsed] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [identity, setIdentity] = useState<{ email: string } | null>(null);
  const [authError, setAuthError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [revision, setRevision] = useState(0);
  const [filters, setFilters] = useState<Filters>({
    q: "",
    favorite: false,
    category: "",
    tag: "",
    sort: "newest",
    page: 1,
  });
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const menu = useRef<HTMLButtonElement>(null);
  const controllers = useRef(new Map<string, AbortController>());
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    const changed = () => {
      setPath(location.pathname);
      setNavOpen(false);
    };
    addEventListener("popstate", changed);
    return () => removeEventListener("popstate", changed);
  }, []);
  useEffect(() => {
    if (!mobile) setNavOpen(false);
  }, [mobile]);
  useEffect(() => {
    if (!mobile || !navOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobile, navOpen]);
  useEffect(() => {
    void api<{ email: string }>("/api/me")
      .then(setIdentity)
      .catch((error) => setAuthError(error instanceof Error ? error.message : "请登录后继续。"));
  }, []);
  useEffect(() => {
    void revision;
    void api<Category[]>("/api/categories")
      .then(setCategories)
      .catch(() => {});
  }, [revision]);
  function navigate(next: string, patch?: Partial<Filters>) {
    history.pushState(null, "", next);
    setPath(location.pathname);
    setNavOpen(false);
    if (patch) setFilters((current) => ({ ...current, ...patch, page: 1 }));
  }
  function updateUpload(progress: UploadProgress) {
    setUploads((items) =>
      items.some((item) => item.id === progress.id)
        ? items.map((item) => (item.id === progress.id ? progress : item))
        : [progress, ...items],
    );
  }
  async function runUpload(file: File, id: string = crypto.randomUUID()) {
    const controller = new AbortController();
    controllers.current.set(id, controller);
    const asset = await uploadFile(file, id, updateUpload, controller.signal);
    controllers.current.delete(id);
    if (asset) refresh();
  }
  async function acceptFiles(files: FileList | File[]) {
    for (const file of Array.from(files)) await runUpload(file);
  }
  const section = path === "/connect" ? "connect" : path === "/settings" ? "settings" : "library";
  const title =
    section === "connect"
      ? "连接本机"
      : section === "settings"
        ? "整理与设置"
        : filters.favorite
          ? "我的收藏"
          : filters.category
            ? (categories.find((item) => item.id === filters.category)?.name ?? "未分类")
            : "全部视频";
  const groups: NavigationGroup[] = [
    {
      label: "资料库",
      items: [
        {
          id: "all",
          label: "全部视频",
          icon: LibraryBig,
          active: section === "library" && !filters.favorite && !filters.category,
          onClick: () => navigate("/", { favorite: false, category: "" }),
        },
        {
          id: "favorites",
          label: "我的收藏",
          icon: Heart,
          active: section === "library" && filters.favorite,
          onClick: () => navigate("/", { favorite: true, category: "" }),
        },
        {
          id: "uncategorized",
          label: "未分类",
          icon: Bookmark,
          active: section === "library" && filters.category === "uncategorized",
          onClick: () => navigate("/", { favorite: false, category: "uncategorized" }),
        },
      ],
    },
    {
      label: "分类",
      items: categories.map((category) => ({
        id: category.id,
        label: `${category.parentId ? "↳ " : ""}${category.name}`,
        icon: Folder,
        active: section === "library" && filters.category === category.id,
        onClick: () => navigate("/", { favorite: false, category: category.id }),
      })),
    },
    {
      label: "工作台",
      items: [
        {
          id: "connect",
          label: "连接本机",
          icon: Link2,
          active: section === "connect",
          onClick: () => navigate("/connect"),
        },
        {
          id: "settings",
          label: "整理与设置",
          icon: Settings2,
          active: section === "settings",
          onClick: () => navigate("/settings"),
        },
      ],
    },
  ];
  if (authError) return <SignInPage error={authError} />;
  if (!identity) return <LoadingScreen label="正在打开 Snail…" mark={<BrandMark size={32} />} />;
  return (
    <NavigationContext.Provider
      value={(next) =>
        navigate(next, next === "/" ? { favorite: false, category: "", q: "", tag: "" } : undefined)
      }
    >
      <AppShell
        className="relative"
        onDragOver={(event) => {
          if (event.dataTransfer.types.includes("Files")) {
            event.preventDefault();
            setDragging(true);
          }
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void acceptFiles(event.dataTransfer.files);
        }}
      >
        <AppSkipLink>跳转到资料库</AppSkipLink>
        {!mobile && (
          <AppSidebar
            collapsed={collapsed}
            onToggle={() => setCollapsed((value) => !value)}
            email={identity.email}
            groups={groups}
          />
        )}
        {mobile && (
          <Sheet open={navOpen} onOpenChange={setNavOpen}>
            <SheetContent
              side="left"
              className="w-[260px] max-w-[260px] border-0 bg-basalt-background p-0"
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                menu.current?.focus();
              }}
            >
              <SheetTitle className="sr-only">主导航</SheetTitle>
              <SheetDescription className="sr-only">
                选择资料库、分类或工作台页面。
              </SheetDescription>
              <AppSidebar
                collapsed={false}
                toggleLabel="关闭导航"
                onToggle={() => setNavOpen(false)}
                email={identity.email}
                groups={groups}
              />
            </SheetContent>
          </Sheet>
        )}
        <AppMain id="main-content" tabIndex={-1}>
          <AppHeader
            title={title}
            breadcrumbs={title === "全部视频" ? undefined : [{ href: "/", label: "资料库" }]}
            leading={
              mobile ? (
                <Button
                  ref={menu}
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label="打开导航"
                  aria-expanded={navOpen}
                  onClick={() => setNavOpen(true)}
                >
                  <Menu className="size-5" strokeWidth={1.5} aria-hidden="true" />
                </Button>
              ) : undefined
            }
            actions={
              <>
                <Button variant="ghost" size="icon" asChild>
                  <a
                    href="https://github.com/nocoo/snail"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="GitHub 仓库"
                  >
                    <GithubMark className="size-[18px]" />
                  </a>
                </Button>
                <ThemeToggle aria-label="切换外观" />
              </>
            }
          />
          <div className="flex min-h-0 flex-1 flex-col px-2 pb-2 md:px-3 md:pb-3">
            <ContentIsland className="relative">
              {section === "library" ? (
                <LibraryPage
                  revision={revision}
                  filters={filters}
                  onFilters={(patch) => setFilters((current) => ({ ...current, ...patch }))}
                  title={title}
                  onUpload={() => input.current?.click()}
                />
              ) : section === "connect" ? (
                <ConnectPage />
              ) : (
                <SettingsPage onChanged={refresh} />
              )}
            </ContentIsland>
          </div>
        </AppMain>
        <Input
          ref={input}
          className="hidden"
          type="file"
          accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
          multiple
          aria-label="上传视频文件"
          onChange={(event) => {
            if (event.target.files) void acceptFiles(event.target.files);
            event.target.value = "";
          }}
        />
        {dragging && (
          <LayerCard
            className="pointer-events-none fixed inset-3 z-60 flex flex-col items-center justify-center gap-4"
            outlined
          >
            <Upload className="size-10 text-basalt-primary" strokeWidth={1.5} aria-hidden="true" />
            <h2 className="text-xl font-semibold">放下视频，开始收藏。</h2>
            <p className="text-sm text-basalt-muted-foreground">仅保存你拥有或获准保存的视频</p>
          </LayerCard>
        )}
        <UploadTray
          items={uploads}
          onPause={(id) => controllers.current.get(id)?.abort()}
          onRetry={(item) => void runUpload(item.file, item.id)}
          onDismiss={() =>
            setUploads((items) =>
              items.filter((item) => !["ready", "failed", "paused"].includes(item.phase)),
            )
          }
        />
      </AppShell>
    </NavigationContext.Provider>
  );
}
