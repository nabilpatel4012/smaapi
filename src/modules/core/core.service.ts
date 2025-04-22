import { Api } from "./schema/db-schema";

export async function getSmaapiStructure() {
  const result = Api.find();
  return result;
}
