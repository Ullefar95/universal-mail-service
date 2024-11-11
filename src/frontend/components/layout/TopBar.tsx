import React from "react";
import { Bell, User } from "lucide-react";
import "../../styles/globals.css";

export const TopBar: React.FC = () => {
  return (
    <header className="bg-white shadow-sm">
      <div className="flex justify-between items-center px-6 py-4">
        <div className="flex items-center">
          <h1 className="text-xl font-semibold text-gray-800">
            Universal Mail Service
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <button className="p-2 text-gray-500 hover:text-gray-700">
            <Bell className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-500 hover:text-gray-700">
            <User className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
