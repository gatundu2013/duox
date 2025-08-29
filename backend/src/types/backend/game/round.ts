import { RoundPhaseEnum, TopStakersI } from "../../shared/game/round";

export interface InitialRoundStateI {
  roundPhase: RoundPhaseEnum;
  topStakers: TopStakersI[];
  roundId: string;
}
