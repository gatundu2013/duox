import { initApp } from "./app";
import { gameLifeCycleManager } from "./services/game/game-life-cylcle-manager";

initApp();

gameLifeCycleManager.startGameLoop();
