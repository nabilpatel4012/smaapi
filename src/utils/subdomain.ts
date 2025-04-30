import { createHash } from "crypto";

export function generateSubdomain(
  user_id: number,
  project_id: number,
  timestamp: number
): string {
  const input = `${user_id}-${project_id}-${timestamp}`;
  const hash = createHash("sha256").update(input).digest("hex");
  let subdomain = hash
    .slice(0, 16)
    .replace(/[^a-zA-Z0-9]/g, "-")
    .toLowerCase();
  if (!/^[a-zA-Z]/.test(subdomain)) {
    subdomain = "p" + subdomain.slice(1);
  }
  return subdomain;
}
