// src/utils/test-db.ts

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function testConnection() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("Successfully connected to MongoDB.");

    // Create a test collection
    const testCollection = mongoose.connection.collection("test");

    // Insert a test document
    await testCollection.insertOne({
      message: "Test connection",
      timestamp: new Date(),
    });
    console.log("Successfully inserted test document.");

    // Read the test document
    const doc = await testCollection.findOne({ message: "Test connection" });
    console.log("Retrieved document:", doc);

    // Clean up
    await testCollection.drop();
    console.log("Test collection cleaned up.");

    await mongoose.connection.close();
    console.log("Connection closed successfully.");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}

testConnection();
