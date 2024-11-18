// src/models/Template.ts
import mongoose, { Document, Schema, Model } from "mongoose";

// Define Content interface for the structure of the `content` field
export interface Content {
  html: string;
  text?: string;
}

export interface ITemplate extends Document {
  name: string;
  description?: string;
  subject: string;
  content: Content; // Updated to use Content interface
  version: number;
  isActive: boolean;
  variables: string[];
  createdAt: Date;
  updatedAt: Date;
  isValidForSend(providedVariables: string[]): boolean;
}

interface ITemplateModel extends Model<ITemplate> {
  findActive(): Promise<ITemplate[]>;
  findByNameAndVersion(
    name: string,
    version?: number
  ): Promise<ITemplate | null>;
}

const templateSchema = new Schema<ITemplate, ITemplateModel>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: {
        html: { type: String, required: true },
        text: { type: String, required: false },
      },
      required: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    variables: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Pre-save hook for automatic variable extraction from HTML content
templateSchema.pre("save", function (next) {
  const variableRegex = /{{(.*?)}}/g;
  const matches = this.content.html.match(variableRegex) || []; // Use `html` field in `content`
  this.variables = [
    ...new Set(matches.map((match) => match.replace(/{{|}}/g, "").trim())),
  ];
  next();
});

// Virtuals
templateSchema.virtual("variableCount").get(function (this: ITemplate) {
  return this.variables.length;
});

// Instance methods
templateSchema.methods.isValidForSend = function (
  this: ITemplate,
  providedVariables: string[]
): boolean {
  const missingVariables = this.variables.filter(
    (variable: string) => !providedVariables.includes(variable)
  );
  return missingVariables.length === 0;
};

// Static methods
templateSchema.statics.findActive = function (
  this: ITemplateModel
): Promise<ITemplate[]> {
  return this.find({ isActive: true });
};

templateSchema.statics.findByNameAndVersion = function (
  this: ITemplateModel,
  name: string,
  version?: number
): Promise<ITemplate | null> {
  const query: { name: string; isActive: boolean; version?: number } = {
    name,
    isActive: true,
  };

  if (version) {
    query.version = version;
  }

  return this.findOne(query).sort({ version: -1 });
};

// Add indexes
templateSchema.index({ name: 1, version: -1 });
templateSchema.index({ isActive: 1 });

// Create and export the model
export const Template = mongoose.model<ITemplate, ITemplateModel>(
  "Template",
  templateSchema
);

export const TemplateModel = {
  async createTemplate(data: Partial<ITemplate>): Promise<ITemplate> {
    return Template.create(data);
  },

  async getTemplateById(id: string): Promise<ITemplate | null> {
    return Template.findById(id);
  },

  async getActiveTemplates(): Promise<ITemplate[]> {
    return Template.findActive();
  },

  async updateTemplate(
    id: string,
    data: Partial<ITemplate>
  ): Promise<ITemplate | null> {
    return Template.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  },

  async deleteTemplate(id: string): Promise<ITemplate | null> {
    return Template.findByIdAndUpdate(id, { isActive: false }, { new: true });
  },

  async getTemplateByNameAndVersion(
    name: string,
    version?: number
  ): Promise<ITemplate | null> {
    return Template.findByNameAndVersion(name, version);
  },
};
