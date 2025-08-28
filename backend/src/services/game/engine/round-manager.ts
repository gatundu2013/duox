import { RoundPhaseEnum, VehicleTypeEnum } from "../../../types/shared/enums";
import { VehicleManager } from "./vehicle-manager";

class RoundManager {
  private static instance: RoundManager;
  private static readonly MAX_LIVE_BETS: 20;

  private vehicles: Record<VehicleTypeEnum, VehicleManager>;
  private roundPhase: RoundPhaseEnum;
  private globalLiveStats = {
    topStakers: [],
  };

  private constructor() {
    this.roundPhase = RoundPhaseEnum.IDLE;
    this.vehicles = {
      [VehicleTypeEnum.BODABODA]: new VehicleManager(VehicleTypeEnum.BODABODA),
      [VehicleTypeEnum.MATATU]: new VehicleManager(VehicleTypeEnum.MATATU),
    };
  }

  public static getInstance() {
    if (!RoundManager.instance) {
      RoundManager.instance = new RoundManager();
    }
    return RoundManager.instance;
  }

  public preGenerateServerSeeds() {
    for (const value of Object.values(this.vehicles)) {
      value.generateServerSeed();
    }
  }

  public generateRoundResults() {
    for (const value of Object.values(this.vehicles)) {
      value.generateFinalResults();
    }
  }

  public allVehiclesCrashed() {
    return Object.values(this.vehicles).every(
      (vehicle) => vehicle.getState().crashed
    );
  }
}

export const roundStateManager = RoundManager.getInstance();
