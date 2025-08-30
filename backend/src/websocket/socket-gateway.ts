import { Server as SocketIoServer } from "socket.io";
import { Server as HttpServer } from "http";

class SocketGateway {
  private static instance: SocketGateway;
  private io: SocketIoServer | null;

  private constructor() {
    this.io = null;
  }

  public static getInstance() {
    if (!SocketGateway.instance) {
      SocketGateway.instance = new SocketGateway();
    }
    return SocketGateway.instance;
  }

  public init(httpServer: HttpServer) {
    if (this.io) {
      console.warn("[SocketGateway][init] Socket is already initialized");
      return;
    }
    this.io = new SocketIoServer(httpServer, {});
    this.registerEventHandlers();
  }

  private registerEventHandlers() {
    if (!this.io) {
      throw new Error(
        "[SocketGateway][registerEventHandlers]. Socket is not initialized"
      );
    }

    this.io.on("connection", (socket) => {
      socket.emit("testing", "Welcome to the server");
    });
  }
}

export const socketGateway = SocketGateway.getInstance();
