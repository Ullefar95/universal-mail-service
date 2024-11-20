import mongoose, { Schema, Document } from "mongoose";

interface ISmtpSettings extends Document {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    from: string;
}

const SmtpSettingsSchema: Schema = new Schema({
    host: { type: String, required: true },
    port: { type: Number, required: true },
    secure: { type: Boolean, required: true },
    user: { type: String, required: true },
    pass: { type: String, required: true },
    from: { type: String, required: true },
});

export const SmtpSettings = mongoose.model<ISmtpSettings>(
    "SmtpSettings",
    SmtpSettingsSchema
);
