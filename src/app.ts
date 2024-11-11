import express from "express";
import cors from "cors";
import path from "path";
import { emailRoutes } from "./routes/emailRoutes";
import { templateRoutes } from "./routes/templateRoutes";
import { errorHandler } from "./middleware/errorHandler";
import { setupDatabase } from "./config/database";
import { rateLimitMiddleware, authMiddleware } from "./security/auth"; // Samlet import for at undgå duplikerede imports
import { Logger } from "./utils/Logger"; // Korrekt import af Logger-klassen

const app = express();
const PORT = process.env.PORT ?? 3000;
const logger = new Logger(); // Instansér loggeren

// Middleware
app.use(cors());
app.use(express.json());
app.use(rateLimitMiddleware); // Rate limiting middleware

// Authentication middleware for secure routes
app.use(authMiddleware);

// API Routes
app.use("/api/v1/emails", emailRoutes);
app.use("/api/v1/templates", templateRoutes);

// Serve static files from the React build directory
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../public")));

  // Handle React routing, return all requests to React app
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
