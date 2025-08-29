import {
  ClientSeedContributorI,
  VehicleLiveStateI,
  VehicleStatusEnum,
  VehicleTypeEnum,
} from "../../../types/shared/game/vehicle";
import {
  ClientSeedDetailsI,
  InitialVehicleStateI,
} from "../../../types/backend/game/vehicle";
import { toFixedDecimals } from "../../../utils/to-fixed-decimals";
import { MultiplierGenerator } from "../multiplier/multiplier-generator";

/**
 * Manages vehicle's lifecycle and state.
 *
 * Handles:
 * - Vehicle state (type, multiplier, status, player counts)
 * - Client seed collection for fair results
 * - Multiplier generation and progression
 * - Crash detection and final results
 *
 * Usage:
 * 1) new VehicleManager(type)
 * 2) startEngine() - prepare server seed
 * 3) loadCargo() - collect client seeds
 * 4) setDestination() - generate final results
 * 5) accelerate() - increment multiplier until crash
 */
export class VehicleManager {
  private static readonly MULTIPLIER_GROWTH_RATE = 0.0045;
  private static readonly INITIAL_MULTIPLIER = 1.0;
  private static readonly DEFAULT_SEED_PREFIX = "duox";
  private static readonly MAX_SEEDS_PER_VEHICLE = 2;

  private liveState: VehicleLiveStateI;
  private clientSeedDetails: ClientSeedDetailsI | null;
  private multiplierGenerator: MultiplierGenerator | null;

  constructor(type: VehicleTypeEnum) {
    if (!type) {
      throw new Error("Vehicle type is required");
    }

    const state = this.initializeState(type);

    this.liveState = state.liveState;
    this.clientSeedDetails = state.clientSeedDetails;
    this.multiplierGenerator = null;
  }

  /**
   * Creates the initial state for the vehicle.
   * Sets up basic values but doesn't start the game yet.
   */
  private initializeState(type: VehicleTypeEnum): InitialVehicleStateI {
    return {
      liveState: {
        type,
        currentMultiplier: VehicleManager.INITIAL_MULTIPLIER,
        status: VehicleStatusEnum.PENDING,
        totalPlayers: 0,
        totalBetAmount: 0,
        finalMultiplier: null,
      },
      clientSeedDetails: null,
      multiplierGenerator: null,
    };
  }

  /**
   * Start the engine by generating a server seed and its hash.
   * Call this before loading cargo or setting destination.
   */
  public startEngine(): string {
    this.multiplierGenerator = new MultiplierGenerator();
    const hashedServerSeed = this.multiplierGenerator.generateServerSeed();
    return hashedServerSeed;
  }

  /**
   * Add a client seed contribution to this vehicle.
   * Combines all seeds to create fair final results.
   *
   * Rules:
   * - Only accepts seeds for this vehicle type
   * - Maximum 2 contributions per vehicle
   * - Each user can only contribute once
   */
  public loadCargo(
    vehicle: VehicleTypeEnum,
    seedInfo: ClientSeedContributorI
  ): boolean {
    // Check if engine was started
    if (!this.multiplierGenerator) {
      throw new Error(
        "loadCargo() failed: Engine not started. Call startEngine() first."
      );
    }

    // Only accept contributions for this vehicle type
    if (this.liveState.type !== vehicle) return false;

    if (!this.clientSeedDetails) {
      this.clientSeedDetails = { clientSeed: "", clientSeedContributors: [] };
    }

    const { clientSeed, clientSeedContributors } = this.clientSeedDetails;

    // Check if vehicle has reached max seed capacity
    const vehicleHasMaxSeeds =
      clientSeedContributors.length >= VehicleManager.MAX_SEEDS_PER_VEHICLE;
    if (vehicleHasMaxSeeds) return false;

    // Prevent user from contributing more than once
    const userAlreadyContributed = clientSeedContributors.some(
      ({ userId }) => userId === seedInfo.userId
    );
    if (userAlreadyContributed) return false;

    // Accept contribution: append seed and record contributor
    this.clientSeedDetails.clientSeed = `${clientSeed}${seedInfo.seed}`.trim();
    this.clientSeedDetails.clientSeedContributors.push(seedInfo);

    return true;
  }

  /**
   * Generate final results and set the crash multiplier.
   * Call this once after loading all cargo.
   * Uses a default seed if no client seeds were provided.
   */
  public setDestination(): void {
    if (!this.multiplierGenerator) {
      throw new Error(
        "setDestination() failed: Multiplier generator not initialized. Call startEngine() first."
      );
    }

    // Use default seed if no client contributions were made
    if (!this.clientSeedDetails) {
      this.clientSeedDetails = {
        clientSeed: `${VehicleManager.DEFAULT_SEED_PREFIX}:${this.liveState.type}`,
        clientSeedContributors: [],
      };
    }

    this.multiplierGenerator.generateFinalResults(
      this.clientSeedDetails.clientSeed,
      this.clientSeedDetails.clientSeedContributors
    );
    this.liveState.finalMultiplier =
      this.multiplierGenerator.getState().finalMultiplier;
  }

  /**
   * Move the multiplier forward by one step.
   * Crashes the vehicle when it reaches the final multiplier.
   * Call this repeatedly in a game loop after setDestination().
   */
  public accelerate(): void {
    const { currentMultiplier, finalMultiplier, status } = this.liveState;

    // Skip if already crashed
    if (status === VehicleStatusEnum.CRASHED) {
      return;
    }

    // Ensure provably fair results have been generated
    if (!this.multiplierGenerator || !finalMultiplier) {
      throw new Error(
        "accelerate() failed: Final results must be generated before acceleration. Call setDestination() first."
      );
    }

    // Calculate next multiplier
    const increment = currentMultiplier * VehicleManager.MULTIPLIER_GROWTH_RATE;
    const newMultiplier = currentMultiplier + increment;

    // Check if vehicle has crashed
    if (newMultiplier >= finalMultiplier) {
      this.liveState.status = VehicleStatusEnum.CRASHED;
      this.liveState.currentMultiplier = finalMultiplier;
      return;
    }

    if (status !== VehicleStatusEnum.RUNNING) {
      this.liveState.status = VehicleStatusEnum.RUNNING;
    }

    // Continue with new multiplier
    this.liveState.currentMultiplier = toFixedDecimals(newMultiplier, 3);
  }

  /**
   * Update player count and bet amount for this vehicle.
   * When players join, both values increase together.
   */
  public updatePlayerStats(totalPlayers: number, totalBetAmount: number): void {
    this.liveState.totalPlayers = totalPlayers;
    this.liveState.totalBetAmount = totalBetAmount;
  }

  public hasCrashed() {
    return this.liveState.status === VehicleStatusEnum.CRASHED;
  }

  /**
   * Reset the vehicle to initial state.
   * Clears all cargo, resets multiplier, and stops the engine.
   */
  public reset(): void {
    const initialState = this.initializeState(this.liveState.type);

    this.liveState = initialState.liveState;
    this.clientSeedDetails = initialState.clientSeedDetails;
    this.multiplierGenerator = null;
  }

  //-------- Getters -------------

  public getState() {
    return {
      liveState: this.liveState,
      multiplierDetails: this.multiplierGenerator?.getState(),
      clientSeedDetails: this.clientSeedDetails,
    };
  }

  public getCurrentMultiplier() {
    return this.liveState.currentMultiplier;
  }
}
