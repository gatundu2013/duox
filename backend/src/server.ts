import { initApp } from "./app";
import { roundStateManager } from "./services/game/engine/round-manager";
import { RoundPhaseEnum } from "./types/shared/game/round";

initApp();

roundStateManager.generateServerSeeds();
roundStateManager.setRoundPhase(RoundPhaseEnum.RUNNING);
roundStateManager.generateFinalRoundResults();
roundStateManager.incrementMultipliers();
