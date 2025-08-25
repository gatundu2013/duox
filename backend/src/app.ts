import "./config/env"; // Load all env varaibles as early as possible
import express from "express";
import { ICONS } from "./utils";
import { connectPostgres, connectRedis } from "./db";
import { SERVER_CONFIG } from "./config/env";
import { v1Router } from "./routes/v1";

const app = express();

app.use(express.json());

app.use("/api/v1", v1Router);

export async function initApp() {
  try {
    await connectPostgres();
    await connectRedis();
    app.listen(SERVER_CONFIG.PORT, () => {
      console.log(
        `${ICONS.SUCCESS} The server is running on port ${SERVER_CONFIG.PORT}`
      );
    });
  } catch (err) {
    console.error(`${ICONS.FAILURE} Failed to start the server`, err);
    process.exit(1);
  }
}
