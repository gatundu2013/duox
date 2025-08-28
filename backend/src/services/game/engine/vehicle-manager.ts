import { ClientSeedContributorI } from "../../../types/game";
import { VehicleTypeEnum } from "../../../types/shared/enums";
import { MultiplierGenerator } from "../multiplier/multiplier-generator";

export class VehicleManager {
  private static readonly MULTIPLIER_GROWTH_RATE = 0.0045;
  private static readonly INITIAL_MULTIPLIER = 1.0;
  private static readonly DEFAULT_SEED_PREFIX = "duox";
  private static readonly MAX_SEEDS_PER_VEHICLE = 2;

  private readonly type: VehicleTypeEnum;

  private liveStats = {
    totalPlayers: 0,
    totalBetAmount: 0,
  };

  private crashed: boolean;
  private currentMultiplier: number;
  private finalMultiplier: number | null;
  private clientSeedDetails: {
    clientSeed: string;
    clientSeedContributions: ClientSeedContributorI[];
  } | null = null;
  private multiplierGenerator: MultiplierGenerator | null;

  constructor(vehicleType: VehicleTypeEnum) {
    if (!vehicleType) {
      throw new Error("Vehicle type was not provided");
    }

    this.type = vehicleType;
    this.crashed = false;
    this.multiplierGenerator = null;
    this.currentMultiplier = VehicleManager.INITIAL_MULTIPLIER;
    this.finalMultiplier = null;
  }

  public incrementMultiplier() {
    if (this.crashed) return;

    if (!this.finalMultiplier) {
      throw new Error("Final multiplier has not been set yet");
    }

    this.currentMultiplier *= 1 + VehicleManager.MULTIPLIER_GROWTH_RATE;

    console.log("running");
    if (this.currentMultiplier >= this.finalMultiplier) {
      this.currentMultiplier = this.finalMultiplier;
      this.crashed = true;
    }
  }

  /** Generate a new server seed (provably fair commitment). */
  public generateServerSeed(): void {
    this.multiplierGenerator = new MultiplierGenerator();
    this.multiplierGenerator.generateServerSeed();
  }

  /** Finalize round results, ensuring a default client seed exists. */
  public generateFinalResults(): void {
    if (!this.multiplierGenerator) {
      throw new Error("Multiplier Generator was not initialized");
    }

    // Client seed is provided - server generated default onces
    if (!this.clientSeedDetails) {
      this.clientSeedDetails = {
        clientSeed: `${VehicleManager.DEFAULT_SEED_PREFIX}:${this.type}`,
        clientSeedContributions: [],
      };
    }

    this.multiplierGenerator.generateFinalResults(
      this.clientSeedDetails.clientSeed,
      this.clientSeedDetails.clientSeedContributions
    );

    this.finalMultiplier = this.multiplierGenerator.getState().finalMultiplier;
  }

  /**
   * Allow a user to contribute a client seed.
   * Rules:
   * - Only contributions for the same vehicle are accepted.
   * - Max contributions per vehicle is enforced.
   * - Each user can only contribute once.
   */
  public updateClientSeed(
    vehicle: VehicleTypeEnum,
    seedInfo: ClientSeedContributorI
  ): boolean {
    // Other vehicles cannot contribute
    if (this.type !== vehicle) return false;

    if (!this.clientSeedDetails) {
      this.clientSeedDetails = { clientSeed: "", clientSeedContributions: [] };
    }

    const { clientSeed, clientSeedContributions } = this.clientSeedDetails;

    // Vehicle has max seeds,no more contributions
    const vehilceHasMaxSeeds =
      clientSeedContributions.length >= VehicleManager.MAX_SEEDS_PER_VEHICLE;
    if (vehilceHasMaxSeeds) return false;

    // User can only contribute to the client seed once
    const alreadyUsed = clientSeedContributions.some(
      ({ userId }) => userId === seedInfo.userId
    );
    if (alreadyUsed) return false;

    // Append new seed
    this.clientSeedDetails.clientSeed = `${clientSeed}${seedInfo.seed}`.trim();
    this.clientSeedDetails.clientSeedContributions.push(seedInfo);

    return true;
  }

  public getState() {
    return {
      multiplierData: {},
      crashed: this.crashed,
      currentMultiplier: this.currentMultiplier,
      finalMultiplier: this.finalMultiplier,
      clientSeedDetails: this.clientSeedDetails,
    };
  }
}
