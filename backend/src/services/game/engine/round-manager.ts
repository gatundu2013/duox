class RoundManager {
  private static instance: RoundManager;

  private constructor() {}

  public static getInstance() {
    if (!RoundManager.instance) {
      RoundManager.instance = new RoundManager();
    }
    return RoundManager.instance;
  }
}

export const roundStateManager = RoundManager.getInstance();
