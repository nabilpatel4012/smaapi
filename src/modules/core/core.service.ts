import UserApiSchema from "./schema/db-schema";

export async function getSmaapiStructure() {
  const result = UserApiSchema.find();
  return result;
}
