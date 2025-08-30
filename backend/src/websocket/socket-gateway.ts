import { Socket, Server as SocketIoServer } from "socket.io";
import { Server as HttpServer } from "http";
import {
  ServerToClientPayloadsI,
  SocketEmitEventName,
} from "../types/shared/game/socket-events";

/**
 * SocketGateway - WebSocket communication game.
 *
 * Manages real-time connections and broadcasts game events to clients.
 * Singleton pattern with type-safe event emission.
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
  }

  public emitToClient<T extends SocketEmitEventName>(
    socket: Socket,
    eventName: T,
    payload: ServerToClientPayloadsI[T]
  ) {
    if (!this.io) {
      console.warn("[SocketGateway] Cannot emit - server not initialized");
      return;
    }

    console.log(
      `[SocketGateway] Emitting '${String(eventName)}' to client ${socket.id}`
    );
    (socket as any).emit(eventName, payload);
  }

  public emitToAllClients<T extends SocketEmitEventName>(
    eventName: T,
    payload: ServerToClientPayloadsI[T]
  ) {
    if (!this.io) {
      console.warn("[SocketGateway] Cannot emit - server not initialized");
      return;
    }

    console.log(
      `[SocketGateway] Emitting '${String(eventName)}' to all clients`
    );
    (this.io as any).emit(eventName, payload);
  }
}

export const socketGateway = SocketGateway.getInstance();
