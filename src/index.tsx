import "./index.css";

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./components/App/App";

console.log("Index.tsx: App starting to render");

window.addEventListener("error", (event) => {
  console.error("Global error caught:", event.error, event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
});

createRoot(document.getElementById("root")!).render(<App />);

console.log("Index.tsx: App rendered");
