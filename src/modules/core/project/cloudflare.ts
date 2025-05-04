// services/cloudflare.ts
import { Cloudflare } from "cloudflare";
import { logger } from "../../../utils/logger";

interface CloudflareConfig {
  apiToken: string;
  zoneId: string;
  baseDomain: string; // e.g., example.com
  targetIp: string; // IP address for the A record
}

export class CloudflareService {
  private client: Cloudflare;
  private config: CloudflareConfig;

  constructor(config: CloudflareConfig) {
    this.config = config;
    this.client = new Cloudflare({ apiToken: config.apiToken });
  }

  async createSubdomain(subdomain: string): Promise<string> {
    const fullDomain = `${subdomain}.${this.config.baseDomain}`;
    try {
      await this.client.dns.records.create({
        zone_id: this.config.zoneId,
        type: "A",
        name: fullDomain,
        content: this.config.targetIp,
        ttl: 3600,
        proxied: true,
      });
      logger.info(
        { subdomain: fullDomain },
        "Created DNS record in Cloudflare"
      );
      return fullDomain;
    } catch (error) {
      logger.error(
        { error, subdomain: fullDomain },
        "Failed to create DNS record"
      );
      throw new Error(`Failed to create DNS record for ${fullDomain}`);
    }
  }
}

// Initialize with environment variables or configuration
export const cloudflareService = new CloudflareService({
  apiToken: process.env.CLOUDFLARE_API_TOKEN!,
  zoneId: process.env.CLOUDFLARE_ZONE_ID!,
  baseDomain: process.env.BASE_DOMAIN!, // e.g., example.com
  targetIp: process.env.TARGET_IP!, // e.g., your server IP
});
