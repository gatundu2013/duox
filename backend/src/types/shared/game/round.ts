import { VehicleTypeEnum } from "./vehicle";

export enum RoundStatusEnum {
  PENDING = "pending",
  RUNNING = "running",
  ENDED = "ended",
}

export enum RoundPhaseEnum {
  IDLE = "idle",
  BETTING = "betting",
  RUNNING = "running",
  ENDED = "ended",
  PREPARING = "preparing",
  ERROR = "error",
}

export interface TopStakersI {
  userId: string;
  username: string;
  stake: number;
  vehicle: VehicleTypeEnum;
  cashoutMultiplier: number | null;
  payout: number | null;
}
