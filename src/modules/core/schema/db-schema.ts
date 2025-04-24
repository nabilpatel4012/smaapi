import { Schema, model } from "mongoose";

const ApiSchema = new Schema({
  api_id: { type: Number, required: true },
  user_id: { type: Number, required: true },
  project_id: { type: Number, required: true },
  api_name: { type: String, required: true },
  api_description: String,
  endpoint_path: { type: String, required: true },
  http_method: { type: String, required: true },
  endpoint_description: String,
  middleware_config: Schema.Types.Mixed,
  parameters: Schema.Types.Mixed,
  allowedFilters: [String],
  responses: Schema.Types.Mixed,
  version_number: { type: Number, required: true },
  api_status: String,
  created_at: { type: Date, required: true },
  isDeleted: { type: Boolean, default: false },
  versions: [
    {
      version_number: Number,
      api_name: String,
      api_description: String,
      endpoint_path: String,
      http_method: String,
      endpoint_description: String,
      middleware_config: Schema.Types.Mixed,
      parameters: Schema.Types.Mixed,
      allowedFilters: [String],
      responses: Schema.Types.Mixed,
      created_at: Date,
    },
  ],
});

export const Api = model("Api", ApiSchema);
