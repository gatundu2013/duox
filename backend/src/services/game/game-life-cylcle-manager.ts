import { RoundPhaseEnum } from "../../types";
import { delay, toFixedDecimals } from "../../utils";
import { roundStateManager } from "./round-state-manager";

class GameLifeCycleManager {
  private static instance: GameLifeCycleManager;

  private static readonly MULTIPLIER_TICK_INTERVAL_MS = 100;
  private static readonly COUNT_DOWN_TICK_INTERVAL_MS = 100;
  private static readonly BETTING_WINDOW_MS = 5000;

  private isRunning: boolean;

  private constructor() {
    this.isRunning = false;
  }

  public static getInstance(): GameLifeCycleManager {
    if (!GameLifeCycleManager.instance) {
      GameLifeCycleManager.instance = new GameLifeCycleManager();
    }
    return GameLifeCycleManager.instance;
  }

  public async startGameLoop() {
    if (this.isRunning) {
      console.log("Game loop is already running");
      return;
    }

    this.isRunning = true;

    while (this.isRunning) {
      try {
        await this.bettingPhase();
        await this.preparingPhase();
        await this.runningPhase();
        await this.endPhase();
      } catch (err) {
        console.error("Game error: Failed to run game loop", err);
        this.isRunning = false;
        roundStateManager.setRoundPhase(RoundPhaseEnum.ERROR);
        throw err;
      }
    }
  }

  private async bettingPhase() {
    roundStateManager.setRoundPhase(RoundPhaseEnum.BETTING);

    let endTime = Date.now() + GameLifeCycleManager.BETTING_WINDOW_MS;
    while (Date.now() <= endTime) {
      const remainingTimeMs = endTime - Date.now();
      const remainingTimeSec = toFixedDecimals(remainingTimeMs / 1000, 1);
      console.log(`CountDown:${remainingTimeSec}`);
      // TODO: Emit remaining time to all users
      await delay(GameLifeCycleManager.COUNT_DOWN_TICK_INTERVAL_MS);
    }
  }

  private async preparingPhase() {
    roundStateManager.setRoundPhase(RoundPhaseEnum.PREPARING);
    roundStateManager.generateRoundResults();
  }

  private async runningPhase() {
    roundStateManager.setRoundPhase(RoundPhaseEnum.RUNNING);

    while (true) {
      const allVehiclesCrashed = roundStateManager.haveAllVehiclesCrashed();
      if (allVehiclesCrashed) break;

      roundStateManager.incrementMultipliers();
      // TODO:Broadcast roundState to all users
      await delay(GameLifeCycleManager.MULTIPLIER_TICK_INTERVAL_MS);
    }
  }

  private async endPhase() {
    roundStateManager.setRoundPhase(RoundPhaseEnum.ENDED);
    // Wait for a short period of time to show the users final Mulitpliers
    // This is for UI purposes
    await new Promise((res) => setTimeout(res, 3000));
  }
}

export const gameLifeCycleManager = GameLifeCycleManager.getInstance();
