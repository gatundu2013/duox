export interface UserSeedInfo {
  userId: string;
  clientSeed: string;
}

export interface MultiplierResult {
  serverSeed: string;
  hashedServerSeed: string;
  clientSeed: string;
  roundHash: string;
  hashAsDecimal: number;
  rawMultiplier: number;
  userSeeds: UserSeedInfo[] | null;
  normalizedValue: number;
  finalMultiplier: number;
  houseEdge: number;
}
