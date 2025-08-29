import { initApp } from "./app";
import { roundStateManager } from "./services/game/engine/round-manager";
import { VehicleManager } from "./services/game/engine/vehicle-manager";
import { VehicleTypeEnum } from "./types/shared/game/vehicle";

initApp();

console.log(roundStateManager);
