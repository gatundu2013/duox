import { initApp } from "./app";
import { roundStateManager } from "./services/game/round-state-manager";

initApp();

roundStateManager.generateRoundResults();

console.log(roundStateManager);
