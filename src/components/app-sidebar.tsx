import {
  Avatar,
  AvatarFallback,
  Button,
  Sidebar,
  SidebarFooter,
  SidebarHeader,
  SidebarIconItem,
  SidebarItem,
  SidebarNav,
  SidebarPartition,
  SidebarUser,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@nocoo/basalt";
import { LogOut, type LucideIcon, PanelLeft } from "lucide-react";
import { Brand } from "./brand";

export interface NavigationGroup {
  label: string;
  items: { id: string; label: string; icon: LucideIcon; active: boolean; onClick: () => void }[];
}

export function AppSidebar({
  collapsed,
  onToggle,
  email,
  groups,
  toggleLabel,
}: {
  collapsed: boolean;
  onToggle: () => void;
  email: string;
  groups: NavigationGroup[];
  toggleLabel?: string;
}) {
  const avatar = (
    <Avatar className="size-9 shrink-0">
      <AvatarFallback>{email.slice(0, 1).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
  return (
    <Sidebar collapsed={collapsed} aria-label="Snail 导航">
      <SidebarHeader>
        <div className="flex w-full items-center justify-between">
          <Brand compact={collapsed} />
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              aria-label={toggleLabel ?? "折叠侧栏"}
              aria-expanded
              onClick={onToggle}
            >
              <PanelLeft className="size-4" strokeWidth={1.5} aria-hidden="true" />
            </Button>
          )}
        </div>
      </SidebarHeader>
      {collapsed && (
        <Button
          variant="ghost"
          size="icon"
          className="mb-1 self-center"
          aria-label="展开侧栏"
          onClick={onToggle}
        >
          <PanelLeft className="size-4" strokeWidth={1.5} aria-hidden="true" />
        </Button>
      )}
      <SidebarNav
        aria-label="主导航"
        className={collapsed ? "w-full items-center gap-1 pt-1" : "pt-1"}
      >
        {collapsed
          ? groups
              .flatMap((group) => group.items)
              .map((item) => (
                <Tooltip key={item.id} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <SidebarIconItem
                      active={item.active}
                      aria-label={item.label}
                      className="shrink-0 self-center"
                      onClick={item.onClick}
                    >
                      <item.icon className="size-4" strokeWidth={1.5} aria-hidden="true" />
                    </SidebarIconItem>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              ))
          : groups.map((group) => (
              <div key={group.label}>
                <SidebarPartition>{group.label}</SidebarPartition>
                <div className="flex flex-col gap-0.5 px-3">
                  {group.items.map((item) => (
                    <SidebarItem key={item.id} active={item.active} onClick={item.onClick}>
                      <item.icon className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                    </SidebarItem>
                  ))}
                </div>
                {!group.items.length && (
                  <p className="px-6 py-2 text-xs text-basalt-muted-foreground">
                    在整理中创建第一个分类
                  </p>
                )}
              </div>
            ))}
      </SidebarNav>
      <SidebarFooter className={collapsed ? "flex w-full justify-center px-0" : undefined}>
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" asChild>
                <a href="/cdn-cgi/access/logout" aria-label="退出登录">
                  {avatar}
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">退出登录</TooltipContent>
          </Tooltip>
        ) : (
          <SidebarUser
            name="我的资料库"
            email={email}
            avatar={avatar}
            action={
              <Button variant="ghost" size="icon" className="size-8 shrink-0" asChild>
                <a href="/cdn-cgi/access/logout" aria-label="退出登录">
                  <LogOut className="size-4" strokeWidth={1.5} aria-hidden="true" />
                </a>
              </Button>
            }
          />
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
