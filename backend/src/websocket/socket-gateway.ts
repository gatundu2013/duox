class SocketGateway {
  private static instance: SocketGateway;

  private constructor() {}

  public static getInstance() {
    if (!SocketGateway.instance) {
      SocketGateway.instance = new SocketGateway();
    }
    return SocketGateway.instance;
  }
}

export const socketGateway = SocketGateway.getInstance();
