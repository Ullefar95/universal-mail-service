import React from "react";
import { NavLink } from "react-router-dom";
import { Mail, Settings, Layout, Users, Activity } from "lucide-react";
import "../../styles/globals.css";

export const Sidebar: React.FC = () => {
  const menuItems = [
    { icon: Layout, label: "Dashboard", path: "/" },
    { icon: Mail, label: "Email Templates", path: "/templates" },
    { icon: Activity, label: "Analytics", path: "/analytics" },
    { icon: Users, label: "API Keys", path: "/api-keys" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  return (
    <aside className="w-64 min-h-screen bg-white shadow-lg">
      <div className="p-4">
        <h2 className="text-xl font-semibold text-gray-800">Mail Service</h2>
      </div>
      <nav className="mt-4">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 ${
                isActive ? "font-bold text-blue-600" : ""
              }`
            }
          >
            <item.icon className="w-5 h-5 mr-3" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};
