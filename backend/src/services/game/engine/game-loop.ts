import { RoundPhaseEnum } from "../../../types/shared/game/round";
import { toFixedDecimals } from "../../../utils/to-fixed-decimals";
import { SocketEmitEventName } from "../../../types/shared/game/socket-events";
import { socketGateway } from "../../../websocket/socket-gateway";
import { roundManager } from "./round-manager";

/**
 * GameLoop - Core engine for crash game rounds.
 *
 * Handles full round flow with provably fair seeds:
 * 1. BETTING: generate seeds, open bets, countdown
 * 2. PREPARING: lock bets, finalize results
 * 3. RUNNING: grow multipliers until crash
 * 4. ENDED: show results, short delay, reset
 *
 * Singleton: use getInstance() to access.
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

  /**
   * Starts a continuous game loop. This method runs indefinitely unless
   * an error occurs
   */
  public async startGameLoop(): Promise<void> {
    if (this.isRunning) {
      console.warn("[GameLoop] Game loop is already running");
      return;
    }

    this.isRunning = true;
    console.log("[GameLoop] Starting game loop...");

    while (this.isRunning) {
      try {
        await this.bettingPhase();
        await this.preparingPhase();
        await this.runningPhase();
        await this.endPhase();
      } catch (err) {
        console.error("[GameLoop] Critical error in game loop:", err);
        roundManager.setRoundPhase(RoundPhaseEnum.ERROR);
        this.isRunning = false;
        throw err;
      }
    }
  }

  /**
   * BETTING PHASE: Generate server seeds, open betting window, and run countdown.
   *
   * This phase ensures provably fair gameplay by:
   * - Generating and committing hashed server seeds before any bets
   * - Opening a time-limited betting window
   * - Broadcasting countdown to all clients
   */
  private async bettingPhase(): Promise<void> {
    roundManager.setRoundPhase(RoundPhaseEnum.BETTING);

    // Generate server seeds for provably fair gameplay
    const hashedServerSeeds = roundManager.generateServerSeeds();

    // Broadcast hashed seeds to all clients
    socketGateway.emitToAllClients(
      SocketEmitEventName.ROUND_HASHED_SERVER_SEED,
      {
        phase: RoundPhaseEnum.BETTING,
        seeds: hashedServerSeeds,
      }
    );

    // Safety check: This condition should always be true after seed generation.
    // If it fails, either the universe is broken… or a developer is 🤦‍♂️
    if (!roundManager.isBettingWindowOpen()) {
      throw new Error(
        "[GameLoop] Betting window not open after server seed generation"
      );
    }

    // Betting window countdown begins
    let countdown = GameLoop.BETTING_WINDOW_SEC;
    while (countdown > 0 && this.isRunning) {
      countdown = toFixedDecimals(countdown - 0.1);

      socketGateway.emitToAllClients(SocketEmitEventName.ROUND_COUNTDOWN, {
        phase: RoundPhaseEnum.BETTING,
        countdown,
      });

      await this.delay(GameLoop.COUNT_DOWN_TICK_MS);
    }
  }

  /**
   * PREPARING PHASE: Generate final round results using committed seeds.
   *
   * This phase creates the provably fair outcomes that were determined
   * by the server seeds generated in the betting phase.
   */
  private async preparingPhase(): Promise<void> {
    roundManager.setRoundPhase(RoundPhaseEnum.PREPARING);

    socketGateway.emitToAllClients(SocketEmitEventName.ROUND_PREPARING, {
      phase: RoundPhaseEnum.PREPARING,
    });

    // Players’ destinies are already decided… just like yours is, but you don’t know it yet 😉
    roundManager.generateFinalRoundResults();
  }

  /**
   * RUNNING PHASE: Increment vehicle multipliers until all vehicles crash.
   *
   * This phase executes the crash game by incrementally increasing
   * the multipliers.
   */
  private async runningPhase(): Promise<void> {
    roundManager.setRoundPhase(RoundPhaseEnum.RUNNING);

    while (!roundManager.haveAllVehicleCrashed()) {
      roundManager.incrementAllVehiclesMultipliers();

      const multipliers = roundManager.getVehiclesRunningMultipliers();

      socketGateway.emitToAllClients(SocketEmitEventName.ROUND_MULTIPLIER, {
        phase: RoundPhaseEnum.RUNNING,
        multipliers,
      });

      await this.delay(GameLoop.INCREMENT_MULTIPLIER_TICK_MS);
    }
  }

  /**
   * END PHASE: Broadcast final results and prepare for next round.
   *
   * This phase provides a brief delay for UI feedback before
   * resetting the round state for the next iteration.
   */
  private async endPhase(): Promise<void> {
    // Round ends... everything eventually dies 🕯️
    roundManager.setRoundPhase(RoundPhaseEnum.ENDED);

    const multipliers = roundManager.getVehiclesRunningMultipliers();

    socketGateway.emitToAllClients(SocketEmitEventName.ROUND_END, {
      phase: RoundPhaseEnum.ENDED,
      multipliers,
    });

    // UX delay for better user experience
    await this.delay(GameLoop.NEXT_ROUND_DELAY_MS);

    // Reset round state for next iteration
    roundManager.resetState();
  }

  private delay(delayMs: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

export const gameLoop = GameLoop.getInstance();
