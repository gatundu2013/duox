import crypto from "node:crypto";
import { toFixedDecimals } from "../../../utils/to-fixed-decimals";
import { ProvablyFairDataI, UserSeedI } from "../../../types/game";
import { GAME_CONFIG } from "../../../config/env";

/**
 * MultiplierGenerator handles generation of provably fair results.
 *
 * Usage:
 * 1. Call `generateServerSeed()` before betting starts (commitment).
 * 2. Call `generateResults(clientSeed, userSeeds)` after bets are placed.
 * 3. Reveal serverSeed at round end for verification.
 */
export class MultiplierGenerator {
  // Use 13 hex chars (~52 bits), safely below JS Number.MAX_SAFE_INTEGER (53 bits).
  // Prevents precision loss when converting multiplier hash to a number.
  private static readonly ROUND_HASH_SLICE_LEN = 13;

  private readonly provablyFairData: ProvablyFairDataI;

  constructor() {
    this.provablyFairData = {
      serverSeed: null,
      hashedServerSeed: null,
      multiplierHash: null,
      hashAsDecimal: null,
      normalizedValue: null,
      rawMultiplier: null,
      finalMultiplier: null,
      houseEdge: GAME_CONFIG.HOUSE_EDGE,
      clientSeed: null,
      clientSeedDetails: [],
    };
  }

  /**
   * Generates a cryptographically secure serverSeed and its SHA256 commitment.
   *
   * - hashedServerSeed (commitment) is revealed before the round starts(Betting Phase).
   * - serverSeed is revealed after the round for verification.
   * - Ensures fairness via commit–reveal: server cannot change seed mid-round.
   */
  public generateServerSeed(): void {
    const serverSeed = crypto.randomBytes(32).toString("hex");

    const hashedServerSeed = crypto
      .createHash("sha256")
      .update(serverSeed)
      .digest("hex");

    this.provablyFairData.serverSeed = serverSeed;
    this.provablyFairData.hashedServerSeed = hashedServerSeed;
  }

  /**
   * Generates multiplierHash from serverSeed + clientSeed.
   *
   * - Uses SHA256 for fixed-length, uniformly distributed output.
   * - Ensures small input changes produce unpredictable results
   *   (avalanche effect).
   * - Hashing is not for secrecy, but for standardization and fairness.
   */
  private generateMultiplierHash(): void {
    const { serverSeed, clientSeed } = this.provablyFairData;

    if (!serverSeed || !clientSeed) {
      throw new Error(
        "Server seed and client seed must be provided before generating multiplier hash"
      );
    }

    const combinedSeed = `${serverSeed}${clientSeed}`;

    const multiplierHash = crypto
      .createHash("sha256")
      .update(combinedSeed)
      .digest("hex");

    this.provablyFairData.multiplierHash = multiplierHash;
  }

  /**
   * Converts multiplierHash into finalMultiplier with house edge applied.
   * Uses inverse exponential distribution to calculate multipliers.
   */
  private calculateMultiplier(): void {
    if (!this.provablyFairData.multiplierHash) {
      throw new Error("Multiplier hash was not generated");
    }

    const { HOUSE_EDGE, MIN_MULTIPLIER, MAX_MULTIPLIER } = GAME_CONFIG;

    const slicedHash = this.provablyFairData.multiplierHash.slice(
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

    this.provablyFairData.rawMultiplier = rawMultiplier;
    this.provablyFairData.finalMultiplier = finalMultiplier;
    this.provablyFairData.hashAsDecimal = hashAsDecimal;
    this.provablyFairData.normalizedValue = normalizedValue;
  }

  // Generate complete multiplier results
  public generateFinalResults(
    clientSeed: string,
    userSeeds: UserSeedI[] | []
  ): ProvablyFairDataI {
    if (!clientSeed || !clientSeed.trim()) {
      throw new Error("MultiplierGenerator: Client seed is required");
    }

    this.provablyFairData.clientSeed = clientSeed;
    this.provablyFairData.clientSeedDetails = userSeeds;

    this.generateMultiplierHash();
    this.calculateMultiplier();

    return this.provablyFairData;
  }
}
