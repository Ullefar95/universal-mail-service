import React from "react";
import { Routes, Route } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import TemplatesPage from "./pages/TemplatesPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import ApiKeysPage from "./pages/ApiKeysPage";
import SettingsPage from "./pages/SettingsPage";

export const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<DashboardPage />} />
    <Route path="/templates" element={<TemplatesPage />} />
    <Route path="/analytics" element={<AnalyticsPage />} />
    <Route path="/api-keys" element={<ApiKeysPage />} />
    <Route path="/settings" element={<SettingsPage />} />
  </Routes>
);

export default AppRoutes;
