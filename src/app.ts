import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import { emailRoutes } from "./routes/emailRoutes";
import { templateRoutes } from "./routes/templateRoutes";
import authRoutes from "./routes/authRoutes";
import { errorHandler } from "./middleware/errorHandler";
import { setupDatabase } from "./config/database";
import { Logger } from "./utils/Logger";
import { setupSwagger } from "./config/swagger";

// Initialize app and logger
const app = express();
const PORT = process.env.PORT ?? 3000;
const logger = new Logger();

// Middleware for CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000", // Set allowed origin
    methods: ["GET", "POST", "PUT", "DELETE"], // Allowed methods
    credentials: true, // Allow credentials
  })
);

// Middleware to parse incoming requests with JSON payloads
app.use(express.json());

// Set up Swagger documentation
setupSwagger(app);

// Register API routes
app.use("/api/v1/emails", emailRoutes);
app.use("/api/v1/templates", templateRoutes);
app.use("/api/v1/auth", authRoutes);

// Serve static files for production
if (process.env.NODE_ENV === "production") {
  const publicPath = path.join(__dirname, "../public");
  app.use(express.static(publicPath));
  app.get("*", (req, res) => {
    if (!req.path.startsWith("/api")) {
      res.sendFile(path.join(publicPath, "index.html"));
    }
  });
}

// Error handling middleware
app.use(errorHandler);

// Function to start the server
const startServer = async () => {
  try {
    // Setup database connection
    await setupDatabase();

    // Start listening on specified port
    app.listen(PORT, () => {
      logger.info(`🚀 Server is running at http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error("❌ Failed to start server:", error);
    process.exit(1); // Exit process on failure
  }
};

startServer();

export default app;
