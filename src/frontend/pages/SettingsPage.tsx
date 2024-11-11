import React from "react";
import { Button } from "../components/common/Button";
import { authApi } from "../api/api";

const SettingsPage: React.FC = () => {
  const generateAuthToken = async () => {
    try {
      const response = await authApi.generateToken();
      console.log("Auth Token:", response.data.token);
      localStorage.setItem("token", response.data.token);
      alert("Token generated successfully");
    } catch (error) {
      console.error("Failed to generate auth token:", error);
    }
  };

  return (
    <div>
      <h1>Settings</h1>
      <Button onClick={generateAuthToken}>Generate Auth Token</Button>
    </div>
  );
};

export default SettingsPage;
