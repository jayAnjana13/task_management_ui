"use client";
import { io, Socket } from "socket.io-client";
import { storage } from "@/lib/utils";
import { Message } from "@/types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:5000";

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  // Connect to WebSocket server
  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    const token = storage.get("accessToken");

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      console.log("Connected to WebSocket server");
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Disconnected from WebSocket server:", reason);
    });

    this.socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
    });

    this.socket.on("error", (error) => {
      console.error("WebSocket error:", error);
      this.emit("socket-error", error);
    });

    return this.socket;
  }

  // Disconnect from WebSocket server
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  // Get socket instance
  getSocket(): Socket | null {
    return this.socket;
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Join a project room
  joinProject(projectId: string): void {
    this.socket?.emit("join-project", projectId);
  }

  // Leave a project room
  leaveProject(projectId: string): void {
    this.socket?.emit("leave-project", projectId);
  }

  // Send a message
  sendMessage(projectId: string, content: string, replyToId?: string): void {
    this.socket?.emit("send-message", { projectId, content, replyToId });
  }

  // Send a direct message
  sendDirectMessage(
    projectId: string,
    recipientId: string,
    content: string,
    replyToId?: string,
  ): void {
    this.socket?.emit("send-direct-message", {
      projectId,
      recipientId,
      content,
      replyToId,
    });
  }

  // Edit a message
  editMessage(messageId: string, content: string): void {
    this.socket?.emit("edit-message", { messageId, content });
  }

  // Delete a message
  deleteMessage(messageId: string, projectId: string): void {
    this.socket?.emit("delete-message", { messageId, projectId });
  }

  // Start typing indicator
  startTyping(projectId: string): void {
    this.socket?.emit("typing-start", projectId);
  }

  // Start typing indicator in direct chat
  startDirectTyping(projectId: string, recipientId: string): void {
    this.socket?.emit("typing-start", { projectId, recipientId });
  }

  // Stop typing indicator
  stopTyping(projectId: string): void {
    this.socket?.emit("typing-stop", projectId);
  }

  // Stop typing indicator in direct chat
  stopDirectTyping(projectId: string, recipientId: string): void {
    this.socket?.emit("typing-stop", { projectId, recipientId });
  }

  // Get active users in a project
  getActiveUsers(projectId: string): void {
    this.socket?.emit("get-active-users", projectId);
  }

  // Subscribe to events
  on<T = any>(event: string, callback: (data: T) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    this.socket?.on(event, callback);
  }

  // Unsubscribe from events
  off(event: string, callback?: Function): void {
    if (callback) {
      this.listeners.get(event)?.delete(callback);
      this.socket?.off(event, callback as any);
    } else {
      this.listeners.delete(event);
      this.socket?.off(event);
    }
  }

  // Emit custom event (for internal use)
  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach((callback) => callback(data));
  }
}

// Export singleton instance
export const socketService = new SocketService();

// Hook-friendly wrapper
export function useSocketEvents(
  events: Record<string, (data: any) => void>,
  deps: any[] = [],
) {
  // This should be used within useEffect in components
  return {
    subscribe: () => {
      Object.entries(events).forEach(([event, handler]) => {
        socketService.on(event, handler);
      });
    },
    unsubscribe: () => {
      Object.entries(events).forEach(([event, handler]) => {
        socketService.off(event, handler);
      });
    },
  };
}
