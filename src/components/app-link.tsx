import { type ComponentProps, createContext, useContext } from "react";

export const NavigationContext = createContext<((path: string) => void) | undefined>(undefined);

export function AppLink({ href, onClick, ...props }: ComponentProps<"a"> & { href: string }) {
  const navigate = useContext(NavigationContext);
  return (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (
          !navigate ||
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          (event.currentTarget.target && event.currentTarget.target !== "_self") ||
          event.currentTarget.hasAttribute("download")
        )
          return;
        const url = new URL(href, location.href);
        if (
          url.origin !== location.origin ||
          url.hash ||
          !["/", "/connect", "/settings"].includes(url.pathname)
        )
          return;
        event.preventDefault();
        navigate(url.pathname + url.search);
      }}
    />
  );
}
