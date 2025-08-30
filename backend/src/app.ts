import "./config/env"; // Load all env varaibles as early as possible
import express from "express";
import { SERVER_CONFIG } from "./config/env";
import { connectPostgres } from "./db/connection/postgres";
import { connectRedis } from "./db/connection/redis";
import { v1Router } from "./routes/v1/v1-router";
import { ICONS } from "./utils/icons";
import { gameLoop } from "./services/game/engine/game-loop";
import { createServer } from "http";
import { socketGateway } from "./websocket/socket-gateway";

const app = express();
const httpServer = createServer(app);

app.use(express.json());
app.use("/api/v1", v1Router);

export async function initApp() {
  try {
    await connectPostgres();
    await connectRedis();
    gameLoop.startGameLoop();

    socketGateway.init(httpServer);
    httpServer.listen(SERVER_CONFIG.PORT, () => {
      console.log(
        `${ICONS.SUCCESS} The server is running on port ${SERVER_CONFIG.PORT}`
      );
    });
  } catch (err) {
    console.error(`${ICONS.FAILURE} Failed to start the server`, err);
    process.exit(1);
  }
}
