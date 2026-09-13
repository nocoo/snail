import "@fontsource-variable/space-grotesk";
import "./styles.css";
import { LinkProvider, ThemeProvider, TooltipProvider } from "@nocoo/basalt";
import { AccentProvider } from "@nocoo/basalt/providers/accent";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import { AppLink } from "./components/app-link";

const root = document.getElementById("root");
if (!root) throw new Error("App root missing");
createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      <AccentProvider
        defaultAccent="orange"
        persist={false}
        paletteOverrides={{
          orange: { light: "14.656 52.191% 49.216%", dark: "19.160 71.257% 67.255%" },
        }}
      >
        <LinkProvider render={AppLink}>
          <TooltipProvider>
            <App />
          </TooltipProvider>
        </LinkProvider>
      </AccentProvider>
    </ThemeProvider>
  </StrictMode>,
);
