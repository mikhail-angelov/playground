import React from "react";
import { hydrateRoot } from "react-dom/client";
import "./index.css";
console.log(new Date());
// Lazy-load the App and hydrate only after bundle loads
const hydrate = async () => {
  const { default: App } = await import("./App");
  const { BrowserRouter } = await import("react-router-dom");
  console.log("hidrate", new Date());
  hydrateRoot(document.getElementById("root")!, <App />);
};

// Optionally defer hydration for performance
if ("requestIdleCallback" in window) {
  (window as any).requestIdleCallback(hydrate);
} else {
  setTimeout(hydrate, 1);
}
