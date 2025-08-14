import dotenv from "dotenv";
import path from "node:path";
import { existsSync } from "node:fs";
import { ICONS } from "../utils/icons";
import { parseEnv, envSchema } from "../validations/env";

function loadEnvVariables() {
  const envFile = `.env.${process.env.NODE_EN || "development"}`;
  const envPath = path.resolve(process.cwd(), envFile);

  if (!existsSync(envPath)) {
    console.error(
      `${ICONS.FAILURE} LoadEnvError: Env path - ${envPath} was not found`
    );
    process.exit(1);
  }

  dotenv.config({ path: envPath });
}

loadEnvVariables();

export const GAME_CONFIG = parseEnv(envSchema.gameEnvSchema);
export const DB_CONFIG = parseEnv(envSchema.dbEnvSchema);

console.error(`${ICONS.SUCCESS} All env variables were loaded successfully`);
