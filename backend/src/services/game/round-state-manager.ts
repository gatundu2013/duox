import {
  MultiplierResult,
  RoundPhaseEnum,
  UserSeedInfo,
  VehicleTypeEnum,
} from "../../types";
import { MultiplierGenerator } from "./multiplier/multiplier-generator";

interface VehicleRuntime {
  currentMultiplier: number;
  finalMultiplier: number | null;
  crashed: boolean;
}

interface VehicleUserSeedInfo {
  clientSeed: string;
  clientSeedDetails: UserSeedInfo[];
}

class RoundStateManager {
  private static instance: RoundStateManager;

  public static readonly MULTIPLIER_GROWTH_RATE = 0.0045;

  private roundPhase: RoundPhaseEnum;
  private vehicleRuntime: Record<VehicleTypeEnum, VehicleRuntime>;
  private vehicleProvablyFair: Record<VehicleTypeEnum, MultiplierResult | null>;
  private vehicleUserSeeds: Record<VehicleTypeEnum, VehicleUserSeedInfo | null>;

  private constructor() {
    const initialState = this.createInitialRoundState();
    this.roundPhase = RoundPhaseEnum.BETTING;
    this.vehicleRuntime = initialState.vehicleRuntime;
    this.vehicleProvablyFair = initialState.vehicleProvablyFair;
    this.vehicleUserSeeds = initialState.vehicleUserSeeds;
  }

  public static getInstance() {
    if (!RoundStateManager.instance) {
      RoundStateManager.instance = new RoundStateManager();
    }
    return RoundStateManager.instance;
  }

  private createInitialRoundState() {
    return {
      roundPhase: RoundPhaseEnum.BETTING,
      vehicleRuntime: {
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
      },
      vehicleProvablyFair: {
        [VehicleTypeEnum.BODABODA]: null,
        [VehicleTypeEnum.MATATU]: null,
      },
      vehicleUserSeeds: {
        [VehicleTypeEnum.BODABODA]: null,
        [VehicleTypeEnum.MATATU]: null,
      },
    };
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

  public incrementMultipliers() {
    for (const key in this.vehicleRuntime) {
      const typedKey = key as VehicleTypeEnum;
      const state = this.vehicleRuntime[typedKey];

      if (state.crashed) continue;

      const increment =
        state.currentMultiplier * RoundStateManager.MULTIPLIER_GROWTH_RATE;
      const nextMultiplier = state.currentMultiplier + increment;

      if (nextMultiplier >= state.finalMultiplier!) {
        state.currentMultiplier = state.finalMultiplier!;
        state.crashed = true;
      } else {
        state.currentMultiplier = nextMultiplier;
      }
    }
  }

  public haveAllVehiclesCrashed() {
    return Object.values(this.vehicleRuntime).every((v) => v.crashed);
  }

  // Setters
  public setRoundPhase(phase: RoundPhaseEnum) {
    this.roundPhase = phase;
  }

  public resetRoundState() {
    const initialState = this.createInitialRoundState();
    this.vehicleRuntime = initialState.vehicleRuntime;
    this.vehicleProvablyFair = initialState.vehicleProvablyFair;
    this.vehicleUserSeeds = initialState.vehicleUserSeeds;
  }
}

export const roundStateManager = RoundStateManager.getInstance();
