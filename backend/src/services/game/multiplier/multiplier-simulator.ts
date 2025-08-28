import {
  MultiplierDistributionBucketT,
  MultiplierDistributionKeyT,
  MultiplierRangeT,
} from "../../../types/game";
import { toFixedDecimals } from "../../../utils/to-fixed-decimals";
import { MultiplierGenerator } from "./multiplier-generator";

export class MultiplierSimulator {
  public static readonly MULTIPLIER_DISTRIBUTION: Record<
    MultiplierDistributionKeyT,
    MultiplierRangeT
  > = {
    "1-2": { minInc: 1, maxExc: 2 },
    "2-3": { minInc: 2, maxExc: 3 },
    "3-5": { minInc: 3, maxExc: 5 },
    "5-10": { minInc: 5, maxExc: 10 },
    "10-30": { minInc: 10, maxExc: 30 },
    "30-50": { minInc: 30, maxExc: 50 },
    "50-100": { minInc: 50, maxExc: 100 },
    "100-500": { minInc: 100, maxExc: 500 },
    "500-1000": { minInc: 500, maxExc: 1000 },
    "1000-5000": { minInc: 1000, maxExc: 5000 },
    "5000+": { minInc: 5000, maxExc: Infinity },
  };

  private rounds: number;
  private sampleSize: number;

  constructor() {
    this.rounds = 1000;
    // Use a reasonable sample size, capped at 10,000 for memory efficiency
    this.sampleSize = 10000;
  }

  private generateDistributionBucket() {
    const bucket = {} as MultiplierDistributionBucketT;

    for (const key in MultiplierSimulator.MULTIPLIER_DISTRIBUTION) {
      const typedKey = key as MultiplierDistributionKeyT;
      bucket[typedKey] = { count: 0, probability: 0 };
    }

    return bucket;
  }

  private runSimulation() {
    const distribution = this.generateDistributionBucket();
    let minSeen = Infinity;
    let maxSeen = -Infinity;
    let multiplierTotal = 0;

    // Reservoir sampling for memory-efficient median calculation
    const reservoir: number[] = [];

    const multiplierGen = new MultiplierGenerator();

    for (let i = 0; i < this.rounds; i++) {
      multiplierGen.generateServerSeed();
      const { finalMultiplier } = multiplierGen.generateFinalResults(
        "duox:testing",
        []
      );

      const value = finalMultiplier!;
      multiplierTotal += value;

      // Track min and max
      if (value > maxSeen) maxSeen = value;
      if (value < minSeen) minSeen = value;

      // Reservoir sampling
      if (reservoir.length < this.sampleSize) {
        reservoir.push(value);
      }

      // Update bucket counts
      for (const [key, { minInc, maxExc }] of Object.entries(
        MultiplierSimulator.MULTIPLIER_DISTRIBUTION
      )) {
        const typedKey = key as MultiplierDistributionKeyT;

        if (value >= minInc && value < maxExc) {
          const bucket = distribution[typedKey];
          bucket.count++;
          bucket.probability = toFixedDecimals(
            (bucket.count / this.rounds) * 100
          );
          break;
        }
      }
    }

    return { distribution, minSeen, maxSeen, multiplierTotal, reservoir };
  }

  private calculateMedianFromSample(sample: number[]) {
    if (sample.length === 0) return 0;

    const sorted = sample.slice().sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    }
    return sorted[middle];
  }

  public generateStats(rounds?: number, sampleSize?: number) {
    if (rounds) this.rounds = rounds;

    if (sampleSize) {
      this.sampleSize = Math.min(sampleSize, this.rounds);
    }

    const { distribution, minSeen, maxSeen, multiplierTotal, reservoir } =
      this.runSimulation();
    const mean = toFixedDecimals(multiplierTotal / this.rounds);
    const median = toFixedDecimals(this.calculateMedianFromSample(reservoir));

    return {
      distribution,
      minSeen: toFixedDecimals(minSeen),
      maxSeen: toFixedDecimals(maxSeen),
      mean,
      median,
      sampleSize: reservoir.length,
      totalRounds: this.rounds,
    };
  }
}
