import { InitialRoundStateI } from "../../../types/backend/game/round";
import { RoundPhaseEnum, TopStakersI } from "../../../types/shared/game/round";
import { VehicleTypeEnum } from "../../../types/shared/game/vehicle";
import { VehicleManager } from "./vehicle-manager";
import crypto from "node:crypto";

/**
 * Coordinates a single game round lifecycle across all vehicles.
 *
 * Responsibilities:
 * - Initialize per-round state (id, phase, top stakers)
 * - Create and manage per-vehicle managers
 * - Orchestrate provably-fair steps: server seed, final results
 * - Advance multipliers during the RUNNING phase
 * - Report when all vehicles have crashed and reset round state
 */
class RoundManager {
  public readonly validRoundTransition: Record<
    RoundPhaseEnum,
    readonly RoundPhaseEnum[]
  > = {
    [RoundPhaseEnum.IDLE]: [RoundPhaseEnum.BETTING, RoundPhaseEnum.ERROR],
    [RoundPhaseEnum.BETTING]: [RoundPhaseEnum.PREPARING, RoundPhaseEnum.ERROR],
    [RoundPhaseEnum.PREPARING]: [RoundPhaseEnum.RUNNING, RoundPhaseEnum.ERROR],
    [RoundPhaseEnum.RUNNING]: [RoundPhaseEnum.ENDED, RoundPhaseEnum.ERROR],
    [RoundPhaseEnum.ENDED]: [RoundPhaseEnum.BETTING, RoundPhaseEnum.ERROR],
    [RoundPhaseEnum.ERROR]: [RoundPhaseEnum.ERROR],
  } as const;

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

  /**
   * Instantiate a manager for every vehicle type.
   */
  private createVehicles() {
    let vehicles: Record<VehicleTypeEnum, VehicleManager> = {} as any;
    for (let key of Object.values(VehicleTypeEnum)) {
      const typedKey = key as VehicleTypeEnum;
      vehicles[typedKey] = new VehicleManager(typedKey);
    }
    return vehicles;
  }

  /**
   * Create the initial round state.
   */
  private initializeState(): InitialRoundStateI {
    return {
      roundPhase: RoundPhaseEnum.IDLE,
      topStakers: [],
      roundId: crypto.randomUUID(),
    };
  }

  /**
   * Generate server seeds before the round starts (BETTING phase).
   * This allows publishing the seed hash early for provable fairness.
   */
  public generateServerSeeds() {
    if (this.roundPhase !== RoundPhaseEnum.BETTING) {
      throw new Error(
        "[RoundManager]- Server seeds can only be generated in betting phase"
      );
    }

    const hashedServerSeeds: Record<VehicleTypeEnum, string> = {} as any;

    for (let key in this.vehicles) {
      const typedKey = key as VehicleTypeEnum;
      const hashedServerSeed = this.vehicles[typedKey].startEngine();
      hashedServerSeeds[typedKey] = hashedServerSeed;
    }

    return hashedServerSeeds;
  }

  /**
   * Generate final round results in the PREPARING phase.
   * Uses collected client seeds + server seed to determine crash points.
   */
  public generateFinalRoundResults() {
    if (this.roundPhase !== RoundPhaseEnum.PREPARING) {
      throw new Error(
        "[RoundManager]- Final round results can only be generated in preparing phase"
      );
    }

    for (let key in this.vehicles) {
      const typedKey = key as VehicleTypeEnum;
      this.vehicles[typedKey].setDestination();
    }
  }

  /**
   * Advance all vehicle multipliers by one tick.
   * Should be called repeatedly by the outer game loop during RUNNING.
   */
  public incrementMultipliers() {
    for (let key in this.vehicles) {
      const typedKey = key as VehicleTypeEnum;
      this.vehicles[typedKey].accelerate();
    }
  }

  /**
   * Check whether all vehicles have finished (crashed) for this round.
   */
  public haveAllVehicleCrashed() {
    return Object.values(this.vehicles).every((vehicle) =>
      vehicle.hasCrashed()
    );
  }

  /**
   * Reset round to its initial state so a new round can begin.
   * Note: vehicles are preserved; their managers maintain their own reset.
   */
  public resetState() {
    const state = this.initializeState();

    this.roundPhase = state.roundPhase;
    this.topStakers = state.topStakers;
    this.roundId = state.roundId;

    for (let key in this.vehicles) {
      const typedKey = key as VehicleTypeEnum;
      this.vehicles[typedKey].reset();
    }
  }

  private isRoundPhaseTransitionValid(nextPhase: RoundPhaseEnum) {
    const allowedNextPhases = this.validRoundTransition[this.roundPhase];
    return allowedNextPhases.includes(nextPhase);
  }

  // -------- SETTERS -----------
  public setRoundPhase(roundPhase: RoundPhaseEnum) {
    if (!this.isRoundPhaseTransitionValid(roundPhase)) {
      throw new Error(
        `Invalid transition from ${this.roundPhase} to ${roundPhase}. ` +
          `Allowed transitions: ${this.getAllowedNextPhases()}`
      );
    }

    this.roundPhase = roundPhase;
  }

  // ---------- GETTERS ------------
  public getAllowedNextPhases(): readonly RoundPhaseEnum[] {
    return this.validRoundTransition[this.roundPhase];
  }

  public getRoundPhase(): RoundPhaseEnum {
    return this.roundPhase;
  }

  /**
   * Bets are allowed only in BETTING phase AND after server seeds exist for all vehicles.
   */
  public isPlacingBetAllowed() {
    if (this.roundPhase !== RoundPhaseEnum.BETTING) return false;
    return Object.values(this.vehicles).every((vehicle) => {
      const state = vehicle.getState().multiplierDetails?.serverSeed;
      return Boolean(state);
    });
  }
}

export const roundManager = RoundManager.getInstance();
