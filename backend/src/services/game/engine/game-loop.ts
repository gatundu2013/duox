import { RoundPhaseEnum } from "../../../types/shared/game/round";
import { toFixedDecimals } from "../../../utils/to-fixed-decimals";
import { roundManager } from "./round-manager";

class GameLoop {
  private static instance: GameLoop;
  private static readonly BETTING_WINDOW_SEC = 5;

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
    roundManager.resetState();
    roundManager.setRoundPhase(RoundPhaseEnum.BETTING);
    const hashedServerSeeds = roundManager.generateServerSeeds();

    /**
     * Emit hashed server seed to all users
     * EmitInfo = {[vehicleType]:"hashedServerSeed"}
     */

    // We can safely Accept bets

    // Start count down
    let countdown = GameLoop.BETTING_WINDOW_SEC;
    while (countdown > 0) {
      countdown = toFixedDecimals(countdown - 0.1);
      /**
       * Emit count down to all users(socket.io)
       * EmitInfo - {roundPhase,countdown}
       */
      console.log(countdown);
      await this.delay(100);
    }
  }

  private async preparingPhase() {
    roundManager.setRoundPhase(RoundPhaseEnum.PREPARING);

    roundManager.generateFinalRoundResults();
  }
  private async runningPhase() {
    roundManager.setRoundPhase(RoundPhaseEnum.RUNNING);
  }
  private async endPhase() {
    roundManager.setRoundPhase(RoundPhaseEnum.ENDED);
  }

  delay(delayMs: number) {
    return new Promise((res) => setTimeout(res, delayMs));
  }
}

export const gameLoop = GameLoop.getInstance();
