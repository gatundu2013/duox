import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { DB_CONFIG } from "../../config/env";
import { ICONS } from "../../utils/icons";

const pool = new Pool({
  connectionString: DB_CONFIG.DATABASE_URL,
  max: 20,
});
export const db = drizzle({ client: pool });

export async function connectDatabase(maxRetries = 5, retryDelayMs = 2000) {
  let retries = 1;

  while (retries <= maxRetries) {
    try {
      await db.execute("select 1");
      console.log(`${ICONS.SUCCESS} Database connected successfully`);
      break;
    } catch (err: any) {
      console.error(
        `${ICONS.FAILURE} Database connection retry ${retries}/${maxRetries}`,
        err.message
      );

      if (retries === maxRetries) {
        console.error(`${ICONS.FAILURE} Database failed completely`);
        throw new Error("Database connection failed");
      }

      // Exponential backoff
      await new Promise((res) => setTimeout(res, retryDelayMs * retries));
      retries++;
    }
  }
}
