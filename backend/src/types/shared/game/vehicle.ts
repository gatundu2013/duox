export enum VehicleStatusEnum {
  PENDING = "pending",
  RUNNING = "running",
  CRASHED = "crashed",
}

export enum VehicleTypeEnum {
  MATATU = "matatu",
  BODABODA = "bodaboda",
}

export interface VehicleLiveStateI {
  type: VehicleTypeEnum;
  currentMultiplier: number;
  status: VehicleStatusEnum;
  totalPlayers: number;
  totalBetAmount: number;
  finalMultiplier?: number | null;
}

export interface ClientSeedContributorI {
  userId: string;
  seed: string;
}
