import "@nocoo/basalt/styles/standalone";
import "@fontsource-variable/space-grotesk";
import "./styles.css";
import { LinkProvider, ThemeProvider, TooltipProvider } from "@nocoo/basalt";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";

const root = document.getElementById("root");
if (!root) throw new Error("App root missing");
createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      <LinkProvider>
        <TooltipProvider>
          <App />
        </TooltipProvider>
      </LinkProvider>
    </ThemeProvider>
  </StrictMode>,
);
