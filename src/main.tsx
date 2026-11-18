import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BootScreen, Root } from "./AppRoot";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <React.Suspense fallback={<BootScreen />}>
      <Root />
    </React.Suspense>
  </React.StrictMode>
);
