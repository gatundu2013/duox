// ---------- Simulate Multipliers ------------
export type MultiplierDistributionKeyT =
  | "1-2"
  | "2-3"
  | "3-5"
  | "5-10"
  | "10-30"
  | "30-50"
  | "50-100"
  | "100-500"
  | "500-1000"
  | "1000-5000"
  | "5000+";

export type MultiplierRangeT = {
  minInc: number;
  maxExc: number;
};

export type MultiplierDistributionBucketT = Record<
  MultiplierDistributionKeyT,
  { count: number; probability: number }
>;

// ----------- Multiplier Generator -----------
export interface ClientSeedContributorI {
  userId: string;
  seed: string;
}

export interface MultiplierDetailsI {
  serverSeed: string | null;
  hashedServerSeed: string | null;
  multiplierHash: string | null;
  hashAsDecimal: number | null;
  normalizedValue: number | null;
  rawMultiplier: number | null;
  finalMultiplier: number | null;
  houseEdge: number;
  clientSeed: string | null;
  clientSeedContributions: ClientSeedContributorI[] | [];
}
