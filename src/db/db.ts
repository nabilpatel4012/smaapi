import { Database } from "./kysely.schema";
import { Kysely, MysqlDialect, sql } from "kysely";
import { config } from "../config";
import "dotenv/config";
import Redis from "ioredis";
import mongoose from "mongoose";
import { createPool } from "mysql2";

const dialect = new MysqlDialect({
  pool: createPool({
    database: config.DATABASE_NAME,
    host: config.DATABASE_HOST,
    user: config.DATABASE_USERNAME,
    password: config.DATABASE_PASSWORD,
    port: config.DATABASE_PORT,
    waitForConnections: true,
    connectionLimit: 300,
    queueLimit: 0,
  }),
});

export const valkey = new Redis({
  host: config.VALKEY_HOST,
  port: config.VALKEY_PORT,
  password: config.VALKEY_PASSWORD,
  commandTimeout: 5000,
  lazyConnect: true,
  tls: {
    allowPartialTrustChain: true,
  },
});

export const db = new Kysely<Database>({
  dialect,
});

// MongoDB Singleton Connection
let mongoConnection: typeof mongoose | null = null;

export async function connectMongoDB() {
  if (mongoConnection) {
    console.log("MongoDB already connected.");
    return mongoConnection;
  }

  try {
    mongoose.connection.on("connected", () => {
      console.log("CORE_API_MONGO DB CONNECTION SUCCESS");
    });

    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
      process.exit(1);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("MongoDB disconnected! Attempting reconnect...");
    });

    mongoConnection = await mongoose.connect(config.MONGO_URI, {});

    return mongoConnection;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
}

// Function to check all database connections
export async function ping() {
  try {
    // Test SQL Connection
    const query = sql`SELECT 1`.compile(db);
    await db.executeQuery(query);
    console.log("CORE_SQL DB CONNECTION SUCCESS");

    // Test Redis Connection
    await valkey.ping((err, res) => {
      if (res) console.log("CORE_CACHE CONNECTION SUCCESS");
      else {
        throw new Error("Valkey ping failed");
      }
    });

    // Test MongoDB Connection
    await connectMongoDB();
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
}

// Graceful Shutdown Handling
process.on("SIGINT", async () => {
  console.log("Shutting down...");

  // Close MongoDB connection
  if (mongoConnection) {
    await mongoose.connection.close();
    console.log("MongoDB connection closed.");
  }

  // Close Redis connection
  valkey.quit();

  process.exit(0);
});
