import React from "react";
import { createRoot } from "react-dom/client";
import FrontendApp from "./frontend/FrontendApp";
import "./frontend/styles/globals.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Failed to find the root element");
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <FrontendApp />
  </React.StrictMode>
);
