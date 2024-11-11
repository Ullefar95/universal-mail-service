import dotenv from "dotenv";
dotenv.config();
console.log(process.env);

import express from "express";
import cors from "cors";
import path from "path";
import { emailRoutes } from "./routes/emailRoutes";
import { templateRoutes } from "./routes/templateRoutes";
import authRoutes from "./routes/authRoutes";
import { errorHandler } from "./middleware/errorHandler";
import { setupDatabase } from "./config/database";
import { Logger } from "./utils/Logger";

const app = express();
const PORT = process.env.PORT;
const logger = new Logger();

// Middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());

// API Routes
app.use("/api/v1/emails", emailRoutes);
app.use("/api/v1/templates", templateRoutes);
app.use("/api/v1/auth", authRoutes); // Tilføjet auth-ruter

// Serve static files from the React build directory
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../public")));
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
