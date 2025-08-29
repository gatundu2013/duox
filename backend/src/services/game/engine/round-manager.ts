import { InitialRoundStateI } from "../../../types/backend/game/round";
import { RoundPhaseEnum, TopStakersI } from "../../../types/shared/game/round";
import { VehicleTypeEnum } from "../../../types/shared/game/vehicle";
import { VehicleManager } from "./vehicle-manager";
import crypto from "node:crypto";

class RoundManager {
  private static instance: RoundManager;

  private topStakers: TopStakersI[];
  private roundId: string | null;
  private roundPhase: RoundPhaseEnum;
  private vehicles: Record<VehicleTypeEnum, VehicleManager>;

  private constructor() {
    const initialState = this.initializeState();
    const vehicles = this.createVehicles();

    this.topStakers = initialState.topStakers;
    this.roundId = initialState.roundId;
    this.roundPhase = initialState.roundPhase;
    this.vehicles = vehicles;
  }

  public static getInstance() {
    if (!RoundManager.instance) {
      RoundManager.instance = new RoundManager();
    }
    return RoundManager.instance;
  }

  private createVehicles() {
    let vehicles: Record<VehicleTypeEnum, VehicleManager> = {} as any;
    for (let key of Object.values(VehicleTypeEnum)) {
      const typedKey = key as VehicleTypeEnum;
      vehicles[typedKey] = new VehicleManager(typedKey);
    }
    return vehicles;
  }

  private initializeState(): InitialRoundStateI {
    return {
      roundPhase: RoundPhaseEnum.BETTING,
      topStakers: [],
      roundId: crypto.randomUUID(),
    };
  }

  public resetState() {
    const state = this.initializeState();

    this.roundPhase = state.roundPhase;
    this.topStakers = state.topStakers;
    this.roundId = state.roundId;
  }
}

export const roundStateManager = RoundManager.getInstance();
