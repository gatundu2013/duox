import { RoundPhaseEnum } from "../../../types/shared/game/round";
import { roundManager } from "./round-manager";

class GameLoop {
  private static instance: GameLoop;

  private isRunning: boolean;

  private constructor() {
    this.isRunning = false;
  }

  public static getInstance(): GameLoop {
    if (!GameLoop.instance) {
      GameLoop.instance = new GameLoop();
    }
    return GameLoop.instance;
  }

  public async startGameLoop() {
    if (this.isRunning) {
      console.log(
        "Attempted to run game loop twice. Game loop is already running"
      );
      return;
    }

    this.isRunning = true;

    while (true) {
      try {
        await this.bettingPhase();
        await this.preparingPhase();
        await this.runningPhase();
        await this.endPhase();
      } catch (err) {
        console.error("Failed to run game loop", err);
        roundManager.setRoundPhase(RoundPhaseEnum.ERROR);
        throw err;
      }
    }
  }

  private async bettingPhase() {
    roundManager.setRoundPhase(RoundPhaseEnum.BETTING);
  }
  private async preparingPhase() {
    roundManager.setRoundPhase(RoundPhaseEnum.BETTING);
  }
  private async runningPhase() {
    roundManager.setRoundPhase(RoundPhaseEnum.BETTING);
  }
  private async endPhase() {
    roundManager.setRoundPhase(RoundPhaseEnum.BETTING);
  }
}

export const gameLoop = GameLoop.getInstance();
