import React, { useState, useEffect } from "react";
import { Button } from "../components/common/Button";

const API_BASE_URL =
    process.env.REACT_APP_API_URL ?? "http://localhost:3000/api/v1";

interface SmtpSettings {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    from: string;
}

const defaultSettings: SmtpSettings = {
    host: "",
    port: 587,
    secure: false,
    user: "",
    pass: "",
    from: "",
};

const getFieldValue = (
    type: string,
    name: string,
    value: string
): string | number | boolean => {
    if (type === "number") {
        return Number(value);
    }
    if (name === "secure") {
        return value === "true";
    }
    return value;
};

const renderStatusMessages = (statusText: string) => {
    return statusText
        .split("\n")
        .map((line, index) => <div key={`status-${index}`}>{line}</div>);
};

const SettingsPage: React.FC = () => {
    const [smtpSettings, setSmtpSettings] =
        useState<SmtpSettings>(defaultSettings);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<string>("");

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/settings/smtp`);
            if (!response.ok) {
                throw new Error("Failed to fetch SMTP settings");
            }
            const data = await response.json();

            setSmtpSettings({
                ...defaultSettings,
                ...data,
                port: Number(data.port) || 587,
                secure: Boolean(data.secure),
                pass: "", // Don't show existing password
            });
        } catch (error) {
            console.error("Error fetching settings:", error);
            setStatus("Failed to load existing settings");
        }
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value, type } = e.target;
        const newValue = getFieldValue(type, name, value);

        setSmtpSettings((prev) => ({
            ...prev,
            [name]: newValue,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus("");

        try {
            console.log("Sending settings:", {
                ...smtpSettings,
                pass: "****", // Hide password in logs
            });

            const response = await fetch(`${API_BASE_URL}/settings/smtp`, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(smtpSettings),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.message || "Failed to save SMTP settings"
                );
            }

            setStatus("Settings saved successfully!");
            await testConnection();
        } catch (error) {
            console.error("Error updating SMTP settings:", error);
            setStatus(
                error instanceof Error
                    ? error.message
                    : "Failed to update settings"
            );
        } finally {
            setLoading(false);
        }
    };

    const testConnection = async () => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/settings/smtp/status`
            );

            if (!response.ok) {
                throw new Error("SMTP connection test failed");
            }

            const data = await response.json();
            setStatus((prev) => prev + "\nConnection test: " + data.message);
        } catch (error) {
            setStatus(
                (prev) =>
                    prev +
                    "\nConnection test failed: " +
                    (error instanceof Error ? error.message : "Unknown error")
            );
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">SMTP Settings</h1>
            <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
                <div className="space-y-4">
                    <div>
                        <label
                            htmlFor="host"
                            className="block text-sm font-medium mb-1"
                        >
                            SMTP Host:
                        </label>
                        <input
                            type="text"
                            id="host"
                            name="host"
                            value={smtpSettings.host}
                            onChange={handleChange}
                            className="w-full p-2 border rounded"
                            required
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="port"
                            className="block text-sm font-medium mb-1"
                        >
                            SMTP Port:
                        </label>
                        <input
                            type="number"
                            id="port"
                            name="port"
                            value={smtpSettings.port}
                            onChange={handleChange}
                            className="w-full p-2 border rounded"
                            required
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="secure"
                            className="block text-sm font-medium mb-1"
                        >
                            Secure Connection:
                        </label>
                        <select
                            id="secure"
                            name="secure"
                            value={String(smtpSettings.secure)}
                            onChange={handleChange}
                            className="w-full p-2 border rounded"
                        >
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                        </select>
                    </div>

                    <div>
                        <label
                            htmlFor="user"
                            className="block text-sm font-medium mb-1"
                        >
                            SMTP User:
                        </label>
                        <input
                            type="text"
                            id="user"
                            name="user"
                            value={smtpSettings.user}
                            onChange={handleChange}
                            className="w-full p-2 border rounded"
                            required
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="pass"
                            className="block text-sm font-medium mb-1"
                        >
                            SMTP Password:
                        </label>
                        <input
                            type="password"
                            id="pass"
                            name="pass"
                            value={smtpSettings.pass}
                            onChange={handleChange}
                            className="w-full p-2 border rounded"
                            required
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="from"
                            className="block text-sm font-medium mb-1"
                        >
                            From Address:
                        </label>
                        <input
                            type="email"
                            id="from"
                            name="from"
                            value={smtpSettings.from}
                            onChange={handleChange}
                            className="w-full p-2 border rounded"
                            required
                        />
                    </div>
                </div>

                {status && (
                    <div
                        className={`p-4 rounded ${
                            status.includes("success")
                                ? "bg-green-100"
                                : "bg-yellow-100"
                        }`}
                    >
                        {renderStatusMessages(status)}
                    </div>
                )}

                <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Saving..." : "Save Settings"}
                </Button>
            </form>
        </div>
    );
};

export default SettingsPage;
