import mongoose, { Schema, Document } from "mongoose";

interface IAuthToken extends Document {
  token: string;
  userId: string; // Link it to the user
  name: string; // Name to identify token
  createdAt: Date;
}

const AuthTokenSchema = new Schema<IAuthToken>({
  token: { type: String, required: true },
  userId: { type: String, required: true }, // Reference to the user, could also be a `Schema.Types.ObjectId`
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const AuthToken = mongoose.model<IAuthToken>(
  "AuthToken",
  AuthTokenSchema
);
