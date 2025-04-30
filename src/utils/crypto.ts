import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16; // AES block size

export function encrypt(text: string, key: string): string {
  // Ensure key is 32 bytes for AES-256
  const keyBuffer = Buffer.from(key.padEnd(32, "0").slice(0, 32));
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, keyBuffer, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

export function decrypt(encryptedText: string, key: string): string {
  // Ensure key is 32 bytes for AES-256
  const keyBuffer = Buffer.from(key.padEnd(32, "0").slice(0, 32));
  const [ivHex, encrypted] = encryptedText.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, keyBuffer, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
