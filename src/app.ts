// src/app.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { errorHandler } from "./middleware/errorHandler";
import { emailRoutes } from "./routes/emailRoutes";
import { templateRoutes } from "./routes/templateRoutes";
import { setupDatabase } from "./config/database";
import { Logger } from "./utils/Logger";

dotenv.config();

const app = express();
const logger = new Logger();
const port = process.env.PORT ?? 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/v1/email", emailRoutes);
app.use("/api/v1/templates", templateRoutes);

// Error handling
app.use(errorHandler);

// Database setup
setupDatabase().catch((error) => {
  logger.error("Failed to connect to database", { error });
  process.exit(1);
});

// Start server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});

export default app;
