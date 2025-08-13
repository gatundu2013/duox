import dotenv from "dotenv";
import path from "node:path";
import { existsSync } from "node:fs";
import { gameEnvSchema, GameConfigT } from "../validations/env";
import { ICONS } from "../utils/icons";

const envFile = `.env.${process.env.NODE_EN || "development"}`;
const envPath = path.resolve(process.cwd(), envFile);
if (!existsSync(envPath)) {
  console.error(
    `${ICONS.FAILURE} LoadEnvError: Env path - ${envPath} was not found`
  );
  process.exit(1);
}

dotenv.config({ path: envPath }); // Load env varaibles

// Game varaibles
const gameEnv = gameEnvSchema.safeParse(process.env);
if (gameEnv.error) {
  console.error(
    `${ICONS.FAILURE} LoadEnvError: ${gameEnv.error.issues[0].message}`
  );
  process.exit(1);
}
export const GAME_CONFIG: GameConfigT = gameEnv.data;

console.log(`${ICONS.SUCCESS} All Env Variables were loaded successfully`);
