import crypto from "node:crypto";
import { toFixedDecimals } from "../../../utils/to-fixed-decimals";
import { MultiplierResult, UserSeedInfo } from "../../../types/game";
import { GAME_CONFIG } from "../../../config/env";

export class MultiplierGenerator {
  private readonly config = {
    ROUND_HASH_SLICE_LEN: 13,
  };

  private serverSeed: string | null;
  private hashedServerSeed: string | null;
  private roundHash: string | null;
  private hashAsDecimal: number | null;
  private normalizedValue: number | null;
  private rawMultiplier: number | null;
  private finalMultiplier: number | null;
  private houseEdge: number | null;
  private clientSeed: string | null;
  private userSeeds: UserSeedInfo[] | [];

  constructor() {
    this.serverSeed = null;
    this.hashedServerSeed = null;
    this.clientSeed = null;
    this.roundHash = null;
    this.hashAsDecimal = null;
    this.normalizedValue = null;
    this.rawMultiplier = null;
    this.finalMultiplier = null;
    this.houseEdge = null;
    this.userSeeds = [];
  }

  /**
   * Generate cryptographically secure server seed
   */
  private generateServerSeed(): void {
    const serverSeed = crypto.randomBytes(32).toString("hex");
    const hashedServerSeed = crypto
      .createHash("sha256")
      .update(serverSeed)
      .digest("hex");

    this.serverSeed = serverSeed;
    this.hashedServerSeed = hashedServerSeed;
  }

  /**
   * Generate round hash from server and client seeds
   */
  private generateRoundHash(): void {
    if (!this.serverSeed || !this.clientSeed) {
      throw new Error(
        "MultiplierGenerator: Server seed and client seed must be set before generating round hash"
      );
    }

    const combinedSeed = `${this.serverSeed}${this.clientSeed}`;
    const roundHash = crypto
      .createHash("sha256")
      .update(combinedSeed)
      .digest("hex");

    this.roundHash = roundHash;
  }

  /**
   * Calculate multiplier from round hash
   */
  private calculateMultiplier(): void {
    if (!this.roundHash) {
      throw new Error("MultiplierGenerator: Round hash was not generated");
    }

    const { HOUSE_EDGE, MIN_MULTIPLIER, MAX_MULTIPLIER } = GAME_CONFIG;

    // 13 chars ≈ 52 bits, safely within Number.MAX_SAFE_INTEGER (53 bits)
    // This prevents precision issues
    const slicedHash = this.roundHash.slice(
      0,
      this.config.ROUND_HASH_SLICE_LEN
    );

    const numBytes = slicedHash.length / 2; // 1 byte = 2 hex chars
    const numBits = numBytes * 8;
    const maxHashValue = Math.pow(2, numBits) - 1;

    // Normalize the hash to range [0, 1)
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

    this.rawMultiplier = rawMultiplier;
    this.finalMultiplier = finalMultiplier;
    this.hashAsDecimal = hashAsDecimal;
    this.normalizedValue = normalizedValue;
    this.houseEdge = HOUSE_EDGE;
  }

  /**
   * Generate complete multiplier results
   */
  public generateResults(
    clientSeed: string,
    userSeeds: UserSeedInfo[] | []
  ): MultiplierResult {
    if (!clientSeed || !clientSeed.trim()) {
      throw new Error("MultiplierGenerator: Client seed is required");
    }

    this.clientSeed = clientSeed;
    this.userSeeds = userSeeds ?? [];

    this.generateServerSeed();
    this.generateRoundHash();
    this.calculateMultiplier();

    return {
      serverSeed: this.serverSeed!,
      hashedServerSeed: this.hashedServerSeed!,
      hashAsDecimal: this.hashAsDecimal!,
      clientSeed: this.clientSeed!,
      userSeeds: this.userSeeds!,
      roundHash: this.roundHash!,
      normalizedValue: this.normalizedValue!,
      rawMultiplier: this.rawMultiplier!,
      finalMultiplier: this.finalMultiplier!,
      houseEdge: this.houseEdge!,
    };
  }
}
