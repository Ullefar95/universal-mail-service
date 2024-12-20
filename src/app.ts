﻿import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import path from "path";
import { emailRoutes } from "./routes/emailRoutes";
import { templateRoutes } from "./routes/templateRoutes";
import authRoutes from "./routes/authRoutes";
import { settingsRoutes } from "./routes/settingsRoutes";
import { errorHandler } from "./middleware/errorHandler";
import { setupDatabase } from "./config/database";
import { Logger } from "./utils/Logger";
import { setupSwagger } from "./config/swagger";

const app = express();
const PORT = process.env.BACKEND_PORT ?? 3000;
const logger = new Logger();

// Middleware
app.use(
    cors({
        origin: ["http://localhost:3001"],
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
        credentials: true,
    })
);

app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));
// Setup Swagger documentation
setupSwagger(app);

// API Routes
app.use("/api/v1/emails", emailRoutes);
app.use("/api/v1/templates", templateRoutes);
app.use("/api/v1/settings", settingsRoutes);
app.use("/api/v1/auth", authRoutes);

interface RouteLayer {
    route?: {
        path: string;
        methods: Record<string, boolean>;
    };
}

app._router.stack
    .filter((layer: RouteLayer) => layer.route)
    .forEach((layer: RouteLayer) => {
        if (layer.route) {
            console.log(
                `Registered Route: ${Object.keys(layer.route.methods)
                    .join(", ")
                    .toUpperCase()} ${layer.route.path}`
            );
        }
    });

// Serve static files from the React build directory
if (process.env.NODE_ENV === "production") {
    app.get("*", (req, res) => {
        if (!req.path.startsWith("/api")) {
            res.sendFile(path.join(__dirname, "../public", "index.html"));
        }
    });
}

// Error handling
app.use(errorHandler);

// Start server
const startServer = async () => {
    try {
        await setupDatabase();
        app.listen(PORT, () => {
            logger.info(`Server is running on http://localhost:${PORT}`);
        });
    } catch (error) {
        logger.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();
export default app;
