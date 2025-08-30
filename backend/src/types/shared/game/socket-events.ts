import { RoundPhaseEnum } from "./round";
import { VehicleTypeEnum } from "./vehicle";

export enum SocketEmitEventName {
  ROUND_HASHED_SERVER_SEED = "round:hashedServerSeed",
  ROUND_COUNTDOWN = "round:countdown",
  ROUND_PREPARING = "round:preparing",
  ROUND_MULTIPLIER = "round:multiplier",
  ROUND_END = "round:end",
}

export interface ServerToClientPayloadsI {
  [SocketEmitEventName.ROUND_HASHED_SERVER_SEED]: {
    seeds: Record<VehicleTypeEnum, string>;
    phase: RoundPhaseEnum.BETTING;
  };
  [SocketEmitEventName.ROUND_COUNTDOWN]: {
    countdown: number;
    phase: RoundPhaseEnum.BETTING;
  };
  [SocketEmitEventName.ROUND_PREPARING]: {
    phase: RoundPhaseEnum.PREPARING;
  };
  [SocketEmitEventName.ROUND_MULTIPLIER]: {
    multipliers: Record<VehicleTypeEnum, string | number>;
    phase: RoundPhaseEnum.RUNNING;
  };
  [SocketEmitEventName.ROUND_END]: {
    multipliers: Record<VehicleTypeEnum, string | number>;
    phase: RoundPhaseEnum;
  };
}
