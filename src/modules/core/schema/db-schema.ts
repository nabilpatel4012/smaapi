import mongoose from "mongoose";

const userApiSchema = new mongoose.Schema(
  {},
  { collection: "user-api-schema", strict: false } // Access collection without enforcing a schema
);

const UserApiSchema = mongoose.model("UserApiSchema", userApiSchema);

export default UserApiSchema;
