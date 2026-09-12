import {
  Button,
  ContentIsland,
  Sheet,
  SheetContent,
  SheetTitle,
  Sidebar,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarNav,
  SidebarPartition,
  ThemeToggle,
} from "@nocoo/basalt";
import { AppHeader } from "@nocoo/basalt/components/app-header";
import { AppMain, AppShell, AppSkipLink } from "@nocoo/basalt/components/app-shell";
import { Bookmark, Folder, Heart, LibraryBig, Link2, Menu, Settings2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { version } from "../package.json";
import type { Category, UploadProgress } from "../shared/types";
import { UploadTray } from "./components/upload-tray";
import { api } from "./lib/api";
import { uploadFile } from "./lib/upload";
import { ConnectPage } from "./pages/connect";
import { LibraryPage } from "./pages/library";
import { SettingsPage } from "./pages/settings";
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
  const controllers = useRef(new Map<string, AbortController>());
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    const changed = () => setPath(location.pathname);
    addEventListener("popstate", changed);
    return () => removeEventListener("popstate", changed);
  }, []);
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
    setPath(next);
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
  const brand = (
    <div className="snail-brand">
      <span className="brand-slot" data-brand="provisional" aria-hidden="true">
        s
      </span>
      <span>
        Snail
        <span className="brand-dot" />
      </span>
      <span className="version-pill">{version}</span>
    </div>
  );
  const navigation = (
    <>
      <SidebarItem
        active={section === "library" && !filters.favorite && !filters.category}
        onClick={() => navigate("/", { favorite: false, category: "" })}
      >
        <LibraryBig size={18} />
        <span>全部视频</span>
      </SidebarItem>
      <SidebarItem
        active={section === "library" && filters.favorite}
        onClick={() => navigate("/", { favorite: true, category: "" })}
      >
        <Heart size={18} />
        <span>我的收藏</span>
      </SidebarItem>
      <SidebarItem
        active={section === "library" && filters.category === "uncategorized"}
        onClick={() => navigate("/", { favorite: false, category: "uncategorized" })}
      >
        <Bookmark size={18} />
        <span>未分类</span>
      </SidebarItem>
      <SidebarPartition>分类</SidebarPartition>
      {categories.length ? (
        categories.map((category) => (
          <SidebarItem
            key={category.id}
            active={section === "library" && filters.category === category.id}
            onClick={() => navigate("/", { favorite: false, category: category.id })}
          >
            <Folder size={17} />
            <span>
              {category.parentId ? "↳ " : ""}
              {category.name}
            </span>
          </SidebarItem>
        ))
      ) : (
        <p className="nav-hint">在整理中创建第一个分类</p>
      )}
      <SidebarPartition>工作台</SidebarPartition>
      <SidebarItem active={section === "connect"} onClick={() => navigate("/connect")}>
        <Link2 size={18} />
        <span>连接本机</span>
      </SidebarItem>
      <SidebarItem active={section === "settings"} onClick={() => navigate("/settings")}>
        <Settings2 size={18} />
        <span>整理与设置</span>
      </SidebarItem>
    </>
  );
  if (authError)
    return (
      <div className="login-state">
        {brand}
        <h1>你的私人视频库</h1>
        <p role="alert">{authError}</p>
        <Button onClick={() => location.assign("/cdn-cgi/access/login?redirect_url=%2F")}>
          登录 Snail
        </Button>
      </div>
    );
  if (!identity)
    return (
      <div className="login-state" role="status">
        {brand}
        <p>正在打开 Snail…</p>
      </div>
    );
  return (
    <AppShell
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
        <Sidebar className="snail-sidebar">
          <SidebarHeader>
            {brand}
            <span className="brand-caption">YOUR PRIVATE VIDEO LIBRARY</span>
          </SidebarHeader>
          <SidebarNav>{navigation}</SidebarNav>
          <SidebarFooter>
            <div className="sidebar-bottom">
              <span className="status-dot" />
              <span>只属于你的收藏</span>
            </div>
            <span className="sidebar-account" title={identity.email}>
              {identity.email}
            </span>
          </SidebarFooter>
        </Sidebar>
      )}
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="mobile-navigation">
          <SheetTitle>{brand}</SheetTitle>
          <nav aria-label="主导航">{navigation}</nav>
        </SheetContent>
      </Sheet>
      <AppMain id="main-content">
        <AppHeader
          title={title}
          leading={
            mobile ? (
              <Button
                variant="ghost"
                size="icon"
                aria-label="打开导航"
                onClick={() => setNavOpen(true)}
              >
                <Menu size={20} />
              </Button>
            ) : undefined
          }
          actions={
            <>
              <span className="header-wordmark">Snail</span>
              <ThemeToggle aria-label="切换外观" />
            </>
          }
        />
        <div className="island-wrap">
          <ContentIsland className="snail-island">
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
      <input
        ref={input}
        className="file-input"
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
        <div className="drop-overlay">
          <Upload size={40} />
          <h2>放下视频，开始收藏。</h2>
          <p>仅保存你拥有或获准保存的视频</p>
        </div>
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
  );
}
