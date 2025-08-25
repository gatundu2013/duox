import { MultiplierResult, UserSeedInfo, VehicleTypeEnum } from "../../types";
import { MultiplierGenerator } from "./multiplier/multiplier-generator";

interface VehicleRuntime {
  currentMultiplier: number | null;
  finalMultiplier: number | null;
  crashed: boolean;
}

interface VehicleUserSeedInfo {
  clientSeed: string;
  clientSeedDetails: UserSeedInfo[];
}

class RoundStateManager {
  private static instance: RoundStateManager;
  private vehicleRuntime: Record<VehicleTypeEnum, VehicleRuntime>;
  private vehicleProvablyFair: Record<VehicleTypeEnum, MultiplierResult | null>;
  private vehicleUserSeeds: Record<VehicleTypeEnum, VehicleUserSeedInfo | null>;

  private constructor() {
    this.vehicleRuntime = {
      [VehicleTypeEnum.BODABODA]: {
        currentMultiplier: 1.0,
        finalMultiplier: null,
        crashed: false,
      },
      [VehicleTypeEnum.MATATU]: {
        currentMultiplier: 1.0,
        finalMultiplier: null,
        crashed: false,
      },
    };

    this.vehicleProvablyFair = {
      [VehicleTypeEnum.BODABODA]: null,
      [VehicleTypeEnum.MATATU]: null,
    };

    this.vehicleUserSeeds = {
      [VehicleTypeEnum.BODABODA]: null,
      [VehicleTypeEnum.MATATU]: null,
    };
  }

  public static getInstance() {
    if (!RoundStateManager.instance) {
      RoundStateManager.instance = new RoundStateManager();
    }
    return RoundStateManager.instance;
  }

  /**
   * Generate provably fair results for this round.
   *
   * - Ensure each vehicle has a valid client seed (default to `duox:<vehicle>` if none provided).
   * - Use MultiplierGenerator to create the provably fair result.
   * - Store the result in `vehicleProvablyFair`.
   * - Mirror the `finalMultiplier` into `vehicleRuntime` for fast runtime checks.
   */
  public generateRoundResults() {
    for (const key in this.vehicleUserSeeds) {
      const typedKey = key as VehicleTypeEnum;

      // Ensure a seed exists for this vehicle
      if (this.vehicleUserSeeds[typedKey] === null) {
        this.vehicleUserSeeds[typedKey] = {
          clientSeed: `duox:${typedKey}`,
          clientSeedDetails: [],
        };
      }

      // Generate provably fair multiplier for this vehicle
      const { clientSeed, clientSeedDetails } =
        this.vehicleUserSeeds[typedKey]!;
      const multiplierGen = new MultiplierGenerator();
      const vehicleResults = multiplierGen.generateResults(
        clientSeed,
        clientSeedDetails
      );

      // Update states: provably fair truth + runtime copy
      this.vehicleProvablyFair[typedKey] = vehicleResults;
      this.vehicleRuntime[typedKey].finalMultiplier =
        vehicleResults.finalMultiplier;
    }
  }
}

export const roundStateManager = RoundStateManager.getInstance();
