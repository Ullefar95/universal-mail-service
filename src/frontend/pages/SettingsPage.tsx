import React, { useState } from "react";
import { Button } from "../components/common/Button";

interface SMTPSettings {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

const SettingsPage: React.FC = () => {
  const [smtpSettings, setSmtpSettings] = useState<SMTPSettings>({
    host: "",
    port: 587,
    secure: false,
    user: "",
    pass: "",
    from: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setSmtpSettings((prev) => ({
      ...prev,
      [name]: type === "number" ? parseInt(value, 10) : value,
    }));
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch("/api/v1/settings/smtp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(smtpSettings),
      });

      if (!response.ok) {
        throw new Error("Failed to save SMTP settings");
      }

      alert("SMTP settings updated successfully");
    } catch (error) {
      console.error("Error updating SMTP settings:", error);
      alert("Failed to update SMTP settings");
    }
  };

  return (
    <div className="settings-page">
      <h1>SMTP Settings</h1>
      <div>
        <label htmlFor="host">SMTP Host:</label>
        <input
          type="text"
          id="host"
          name="host"
          value={smtpSettings.host}
          onChange={handleChange}
        />
      </div>
      <div>
        <label htmlFor="port">SMTP Port:</label>
        <input
          type="number"
          id="port"
          name="port"
          value={smtpSettings.port}
          onChange={handleChange}
        />
      </div>
      <div>
        <label htmlFor="secure">Secure Connection:</label>
        <select
          id="secure"
          name="secure"
          value={smtpSettings.secure ? "true" : "false"}
          onChange={(e) =>
            setSmtpSettings((prev) => ({
              ...prev,
              secure: e.target.value === "true",
            }))
          }
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </div>
      <div>
        <label htmlFor="user">SMTP User:</label>
        <input
          type="text"
          id="user"
          name="user"
          value={smtpSettings.user}
          onChange={handleChange}
        />
      </div>
      <div>
        <label htmlFor="pass">SMTP Password:</label>
        <input
          type="password"
          id="pass"
          name="pass"
          value={smtpSettings.pass}
          onChange={handleChange}
        />
      </div>
      <div>
        <label htmlFor="from">From Address:</label>
        <input
          type="email"
          id="from"
          name="from"
          value={smtpSettings.from}
          onChange={handleChange}
        />
      </div>
      <Button onClick={handleSubmit}>Save Settings</Button>
    </div>
  );
};

export default SettingsPage;
