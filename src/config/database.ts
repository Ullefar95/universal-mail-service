import mongoose from "mongoose";
import { Logger } from "../utils/Logger";
import dotenv from "dotenv";
import { MongoError } from "mongodb";

dotenv.config();

const logger = new Logger();

export async function setupDatabase(): Promise<void> {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    await mongoose.connect(mongoUri);

    logger.info("Connected to MongoDB");

    mongoose.connection.on("error", (error: MongoError) => {
      logger.error("MongoDB connection error", { error });
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected");
    });

    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
  } catch (error: unknown) {
    logger.error("Failed to connect to MongoDB", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}
