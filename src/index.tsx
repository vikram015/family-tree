import "./index.css";

import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./store";
import App from "./components/App/App";
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";

console.log("Index.tsx: App starting to render");

window.addEventListener("error", (event) => {
  console.error("Global error caught:", event.error, event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
});

createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <App />
  </Provider>,
);

console.log("Index.tsx: App rendered");

// Register the service worker (production only). On a new version, notify the
// app so it can prompt the user to reload rather than silently swapping.
serviceWorkerRegistration.register({
  onUpdate: (registration) => {
    window.dispatchEvent(
      new CustomEvent("sw-update-available", { detail: registration }),
    );
  },
});
