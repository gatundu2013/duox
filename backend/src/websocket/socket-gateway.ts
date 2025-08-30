import { Socket, Server as SocketIoServer } from "socket.io";
import { Server as HttpServer } from "http";

/**
 * Manages real-time communication with game clients.
 *
 * What it does:
 * - Sets up socket.io server for real-time updates
 * - Handles client connections and disconnections
 * - Sends game events to all clients or specific rooms
 * - Tracks connected users and room management
 */
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

  /**
   * Sets up the socket.io server with the HTTP server.
   * Call this once when your app starts.
   */
  public init(httpServer: HttpServer) {
    if (this.io) {
      console.warn("[SocketGateway] Socket server already initialized");
      return;
    }

    this.io = new SocketIoServer(httpServer, {});
    this.setupEventHandlers();
    console.log("[SocketGateway] Socket server initialized successfully");
  }

  private setupEventHandlers() {
    if (!this.io) {
      throw new Error(
        "[SocketGateway] Cannot register handlers - server not initialized"
      );
    }

    this.io.on("connection", (socket) => {
      socket.emit("welcome", {
        message: "Welcome to the crash game server",
        clientId: socket.id,
      });
    });

    this.io.on("disconnect", () => {
      console.log("[SocketGateway] Server disconnected");
    });
  }

  public emitToAllClients<T>(eventName: string, payload: T) {
    if (!this.io) {
      console.warn("[SocketGateway] Cannot emit - server not initialized");
      return;
    }

    console.log(`[SocketGateway] Emitting '${eventName}' to all clients`);
    this.io.emit(eventName, payload);
  }

  public emitToClient<T>(socket: Socket, eventName: string, payload: T) {
    if (!this.io) {
      console.warn("[SocketGateway] Cannot emit - server not initialized");
      return;
    }

    console.log(
      `[SocketGateway] Emitting '${eventName}' to client ${socket.id}`
    );
    socket.emit(eventName, payload);
  }
}

export const socketGateway = SocketGateway.getInstance();
