import { initApp } from "./app";
import { gameLoop } from "./services/game/engine/game-loop";

initApp();

gameLoop.startGameLoop();
