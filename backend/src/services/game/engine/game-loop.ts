class GameLoop {
  private static instance: GameLoop;

  public static getInstance(): GameLoop {
    if (!GameLoop.instance) {
      GameLoop.instance = new GameLoop();
    }
    return GameLoop.instance;
  }
}

export const gameLifeCycleManager = GameLoop.getInstance();
