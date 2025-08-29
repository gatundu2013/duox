import { initApp } from "./app";
import { roundManager } from "./services/game/engine/round-manager";
import { RoundPhaseEnum } from "./types/shared/game/round";

initApp();

roundManager.generateServerSeeds();
roundManager.setRoundPhase(RoundPhaseEnum.RUNNING);
roundManager.generateFinalRoundResults();
roundManager.incrementMultipliers();
