import "dotenv/config";
import { up, down } from "./migration";
import { db } from "./db";

const [, , command] = process.argv;

async function runMigration() {
  try {
    if (command === "up") {
      console.log("Running migration UP...");
      await up(db);
      console.log("Migration UP completed.");
    } else if (command === "down") {
      console.log("Running migration DOWN...");
      await down(db);
      console.log("Migration DOWN completed.");
    } else {
      console.error("Invalid command. Use 'up' or 'down'.");
      process.exit(1);
    }
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

runMigration();
