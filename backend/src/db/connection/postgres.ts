import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { DB_CONFIG } from "../../config/env";
import { ICONS } from "../../utils/icons";

// Initialize PostgreSQL connection pool
const pool = new Pool({
  connectionString: DB_CONFIG.DATABASE_URL,
  max: 20,
});

export const db = drizzle({ client: pool });

export async function connectPostgres(
  maxRetries = 5,
  retryDelay = 2000
): Promise<void> {
  let attempt = 1;

  while (attempt <= maxRetries) {
    try {
      await db.execute("SELECT 1");

      console.log(`${ICONS.SUCCESS} PostgreSQL connected successfully`);
      return;
    } catch (err) {
      console.error(
        `${ICONS.FAILURE} PostgreSQL connection attempt ${attempt}/${maxRetries} failed:`,
        err
      );

      if (attempt === maxRetries) {
        console.error(
          `${ICONS.FAILURE} All PostgreSQL connection attempts failed`
        );
        throw err;
      }

      // Exponential backoff delay
      const exponentialDelay = retryDelay * attempt;
      console.log(`${ICONS.INFO} Retrying in ${exponentialDelay}ms...`);

      await new Promise((resolve) => setTimeout(resolve, exponentialDelay));
      attempt++;
    }
  }
}
