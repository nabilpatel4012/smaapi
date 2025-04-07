import mongoose, { Document, Schema } from "mongoose";

// API Schema
export interface IApi extends Document {
  api_id: number;
  user_id: number;
  project_id: number;
  api_name: string;
  api_description?: string;
  created_at: Date;
  updated_at?: Date;
  api_status: "draft" | "active" | "inactive" | "suspended";
  method?: string;
  endpoint?: string;
  endpoint_description?: string;
  parameters?: any;
  allowedFilters?: any;
  responses?: any;
}

const apiSchema = new Schema<IApi>({
  api_id: { type: Number, required: true, unique: true },
  user_id: { type: Number, required: true },
  project_id: { type: Number, required: true },
  api_name: { type: String, required: true },
  api_description: String,
  created_at: { type: Date, required: true, default: Date.now },
  updated_at: Date,
  api_status: {
    type: String,
    required: true,
    enum: ["draft", "active", "inactive", "suspended"],
    default: "draft",
  },
  method: String,
  endpoint: String,
  endpoint_description: String,
  parameters: Schema.Types.Mixed,
  allowedFilters: Schema.Types.Mixed,
  responses: Schema.Types.Mixed,
});

// API Version Schema
export interface IApiVersion extends Document {
  version_id: number;
  api_id: number;
  version_number: string;
  created_at: Date;
  is_current: boolean;
}

const apiVersionSchema = new Schema<IApiVersion>({
  version_id: { type: Number, required: true, unique: true },
  api_id: { type: Number, required: true },
  version_number: { type: String, required: true },
  created_at: { type: Date, required: true, default: Date.now },
  is_current: { type: Boolean, required: true, default: false },
});

// Create models
export const Api = mongoose.model<IApi>("Api", apiSchema);
export const ApiVersion = mongoose.model<IApiVersion>(
  "ApiVersion",
  apiVersionSchema
);

// Other schemas can be added similarly for all tables in the relational database
