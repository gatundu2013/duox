import { MultiplierGenerator } from "../../../services/game/multiplier/multiplier-generator";
import {
  ClientSeedContributorI,
  VehicleLiveStateI,
} from "../../shared/game/vehicle";

export interface InitialVehicleStateI {
  liveState: VehicleLiveStateI;
  clientSeedDetails: ClientSeedDetailsI | null;
  multiplierGenerator: MultiplierGenerator | null;
}

export interface ClientSeedDetailsI {
  clientSeed: string;
  clientSeedContributors: ClientSeedContributorI[];
}
