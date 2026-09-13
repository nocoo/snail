import { useRef } from "react";

// Data-driven dialogs can open from several controls, without a single DialogTrigger.
export function useDialogFocus() {
  const opener = useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus() {
      opener.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
    },
    onCloseAutoFocus(event: Event) {
      event.preventDefault();
      const target = opener.current?.isConnected
        ? opener.current
        : document.getElementById("main-content");
      target?.focus({ preventScroll: true });
    },
  };
}
