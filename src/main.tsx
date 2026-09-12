import "@nocoo/basalt/styles/standalone";
import "@fontsource-variable/space-grotesk";
import "./styles.css";
import { LinkProvider, ThemeProvider, TooltipProvider } from "@nocoo/basalt";
import { AccentProvider } from "@nocoo/basalt/providers/accent";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";

const root = document.getElementById("root");
if (!root) throw new Error("App root missing");
createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      <AccentProvider
        defaultAccent="orange"
        paletteOverrides={{ orange: { light: "18 40% 49%", dark: "18 52% 61%" } }}
      >
        <LinkProvider>
          <TooltipProvider>
            <App />
          </TooltipProvider>
        </LinkProvider>
      </AccentProvider>
    </ThemeProvider>
  </StrictMode>,
);
