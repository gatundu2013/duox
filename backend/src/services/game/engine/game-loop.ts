import { RoundPhaseEnum } from "../../../types/shared/game/round";
import { toFixedDecimals } from "../../../utils/to-fixed-decimals";
import { roundManager } from "./round-manager";

/**
 * Drives the round lifecycle by orchestrating phases in sequence.
 *
 * Phases: BETTING -> PREPARING -> RUNNING -> ENDED
 * - BETTING: seeds generated and countdown runs, bets accepted
 * - PREPARING: final results generated (provably fair)
 * - RUNNING: vehicle multipliers increment until all crash
 * - ENDED: broadcast results, brief UX delay, reset state
 */
class GameLoop {
  private static instance: GameLoop;
  private static readonly BETTING_WINDOW_SEC = 5;
  private static readonly COUNT_DOWN_TICK_MS = 100;
  private static readonly INCREMENT_MULTIPLIER_TICK_MS = 100;
  private static readonly NEXT_ROUND_DELAY_MS = 2500;

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

  /** Start continuous game loop. Safe to call once. */
  public async startGameLoop() {
    if (this.isRunning) {
      console.warn("[GameLoop] startGameLoop() called while already running");
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
        console.error(
          "[GameLoop] Unhandled error in loop. Entering ERROR phase",
          err
        );
        roundManager.setRoundPhase(RoundPhaseEnum.ERROR);
        throw err;
      }
    }
  }

  /**
   * BETTING: generate server seeds, open bet window, and run dcountdown.
   */
  private async bettingPhase() {
    roundManager.setRoundPhase(RoundPhaseEnum.BETTING);
    const hashedServerSeeds = roundManager.generateServerSeeds();

    /**
     * Emit hashed server seed to all users
     * EmitInfo = {[vehicleType]:"hashedServerSeed"}
     */
    console.log("[GameLoop][BETTING] Seeds ready:", hashedServerSeeds);

    // We can safely Accept bets
    if (!roundManager.isPlacingBetAllowed()) {
      throw new Error(
        "[GameLoop][BETTING] Betting should be allowed after server seed generation"
      );
    }

    // Start count down
    let countdown = GameLoop.BETTING_WINDOW_SEC;
    while (countdown > 0) {
      countdown = toFixedDecimals(countdown - 0.1);
      /**
       * Emit count down to all users(socket.io)
       * EmitInfo - {roundPhase,countdown}
       */
      console.log("[GameLoop][BETTING] countdown=", countdown);
      await this.delay(GameLoop.COUNT_DOWN_TICK_MS);
    }
  }

  /** PREPARING: generate final round results. */
  private async preparingPhase() {
    roundManager.setRoundPhase(RoundPhaseEnum.PREPARING);
    roundManager.generateFinalRoundResults();
  }

  /** RUNNING: increment multipliers until all vehicles crash. */
  private async runningPhase() {
    roundManager.setRoundPhase(RoundPhaseEnum.RUNNING);

    while (!roundManager.haveAllVehicleCrashed()) {
      roundManager.incrementMultipliers();
      const state = roundManager.getVehicleRunningMultiplier();
      console.log("[GameLoop][RUNNING] multipliers=", state);
      /***
       * Emit to all users each vehicle multiplier
       * payload-{multipliers:{matatu:1.45,bodaboda:2.98}}
       */
      await this.delay(GameLoop.INCREMENT_MULTIPLIER_TICK_MS);
    }

    const state = roundManager.getVehicleRunningMultiplier();
    console.log(
      "[GameLoop][RUNNING] all vehicles crashed, final multipliers=",
      state
    );
  }

  /** ENDED: broadcast summary, UX delay, then reset round state. */
  private async endPhase() {
    roundManager.setRoundPhase(RoundPhaseEnum.ENDED);
    /***
     * Emit to all users of round end
     * payload-{multipliers:{matatu:1.45,bodaboda:2.98},roundPhase:end}
     */

    // This delay is meant for UI purpose(Improves user experience)
    await this.delay(GameLoop.NEXT_ROUND_DELAY_MS);
    roundManager.resetState();
  }

  private delay(delayMs: number) {
    return new Promise((res) => setTimeout(res, delayMs));
  }
}

export const gameLoop = GameLoop.getInstance();
