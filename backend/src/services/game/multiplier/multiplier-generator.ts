import crypto from "node:crypto";
import { toFixedDecimals } from "../../../utils/to-fixed-decimals";
import {
  ClientSeedContributorI,
  MultiplierDetailsI,
} from "../../../types/game";
import { GAME_CONFIG } from "../../../config/env";

/***
 * Handles generation of multipliers that a provably fair
 */
export class MultiplierGenerator {
  // Use 13 hex chars (~52 bits), safely below JS Number.MAX_SAFE_INTEGER (53 bits).
  // Prevents precision loss when converting multiplier hash to a number.
  private static readonly ROUND_HASH_SLICE_LEN = 13;

  private multiplierDetails: MultiplierDetailsI;

  constructor() {
    this.multiplierDetails = this.createInitialMultiplierDetails();
  }

  private createInitialMultiplierDetails(): MultiplierDetailsI {
    return {
      serverSeed: null,
      hashedServerSeed: null,
      multiplierHash: null,
      hashAsDecimal: null,
      normalizedValue: null,
      rawMultiplier: null,
      finalMultiplier: null,
      houseEdge: GAME_CONFIG.HOUSE_EDGE,
      clientSeed: null,
      clientSeedContributions: [],
    };
  }

  public generateServerSeed(): void {
    const serverSeed = crypto.randomBytes(32).toString("hex");

    const hashedServerSeed = crypto
      .createHash("sha256")
      .update(serverSeed)
      .digest("hex");

    this.multiplierDetails.serverSeed = serverSeed;
    this.multiplierDetails.hashedServerSeed = hashedServerSeed;
  }

  private generateMultiplierHash(): void {
    const { serverSeed, clientSeed } = this.multiplierDetails;

    if (!serverSeed || !clientSeed) {
      throw new Error(
        "Failed to generate multiplier - server or client seed were not generated"
      );
    }

    const combinedSeed = `${serverSeed}${clientSeed}`.trim();

    const multiplierHash = crypto
      .createHash("sha256")
      .update(combinedSeed)
      .digest("hex");

    this.multiplierDetails.multiplierHash = multiplierHash;
  }

  private calculateMultiplier(): void {
    if (!this.multiplierDetails.multiplierHash) {
      throw new Error(
        "Failed to generate multiplier - Multiplier hash was not generated"
      );
    }

    const { HOUSE_EDGE, MIN_MULTIPLIER, MAX_MULTIPLIER } = GAME_CONFIG;

    const slicedHash = this.multiplierDetails.multiplierHash.slice(
      0,
      MultiplierGenerator.ROUND_HASH_SLICE_LEN
    );

    const numBytes = slicedHash.length / 2; // 1 byte = 2 hex chars
    const numBits = numBytes * 8;
    const maxHashValue = Math.pow(2, numBits) - 1;

    // Normalize the hash in range [0, 1)
    const hashAsDecimal = parseInt(slicedHash, 16);
    const normalizedValue = hashAsDecimal / maxHashValue;

    // Calculate raw multiplier using inverse exponential distribution
    let rawMultiplier = 1 / (1 - normalizedValue);
    rawMultiplier = toFixedDecimals(rawMultiplier);

    // Apply house edge
    let finalMultiplier = rawMultiplier * (1 - HOUSE_EDGE);
    finalMultiplier = toFixedDecimals(finalMultiplier);

    // Cap finalMultiplier
    finalMultiplier = Math.max(
      MIN_MULTIPLIER,
      Math.min(MAX_MULTIPLIER, finalMultiplier)
    );

    this.multiplierDetails.rawMultiplier = rawMultiplier;
    this.multiplierDetails.finalMultiplier = finalMultiplier;
    this.multiplierDetails.hashAsDecimal = hashAsDecimal;
    this.multiplierDetails.normalizedValue = normalizedValue;
  }

  public generateFinalResults(
    clientSeed: string,
    userSeeds: ClientSeedContributorI[] | []
  ): MultiplierDetailsI {
    if (!clientSeed || !clientSeed.trim()) {
      throw new Error(
        "Failed to generate multiplier - client seed was not provided"
      );
    }

    this.multiplierDetails.clientSeed = clientSeed;
    this.multiplierDetails.clientSeedContributions = userSeeds;

    this.generateMultiplierHash();
    this.calculateMultiplier();

    return this.multiplierDetails;
  }

  public getState() {
    return this.multiplierDetails;
  }
}
