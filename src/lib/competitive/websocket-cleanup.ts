import { competitiveWebSocket } from "./websocket-service";

/**
 * WebSocket cleanup utility
 * Ensures proper cleanup of WebSocket connections and event listeners
 */
export class WebSocketCleanup {
  private static instance: WebSocketCleanup;
  private cleanupTasks: Set<() => void> = new Set();

  static getInstance(): WebSocketCleanup {
    if (!WebSocketCleanup.instance) {
      WebSocketCleanup.instance = new WebSocketCleanup();
    }
    return WebSocketCleanup.instance;
  }

  /**
   * Register a cleanup task
   */
  registerCleanup(task: () => void): () => void {
    this.cleanupTasks.add(task);

    // Return unregister function
    return () => {
      this.cleanupTasks.delete(task);
    };
  }

  /**
   * Execute all cleanup tasks
   */
  cleanup(): void {
    this.cleanupTasks.forEach(task => {
      try {
        task();
      } catch (error) {
        console.error("Error during WebSocket cleanup:", error);
      }
    });
    this.cleanupTasks.clear();
  }

  /**
   * Cleanup on page unload
   */
  setupPageUnloadCleanup(): void {
    if (typeof window !== "undefined") {
      const handleUnload = () => {
        this.cleanup();
        competitiveWebSocket.disconnect();
      };

      window.addEventListener("beforeunload", handleUnload);
      window.addEventListener("unload", handleUnload);

      // Register cleanup for these event listeners
      this.registerCleanup(() => {
        window.removeEventListener("beforeunload", handleUnload);
        window.removeEventListener("unload", handleUnload);
      });
    }
  }

  /**
   * Cleanup on component unmount
   */
  setupComponentCleanup(): () => void {
    const cleanupTasks: Array<() => void> = [];

    // Don't disconnect WebSocket (other components might be using it)
    // Just clean up component-specific listeners

    return () => {
      cleanupTasks.forEach(task => {
        try {
          task();
        } catch (error) {
          console.error("Error during component cleanup:", error);
        }
      });
    };
  }

  /**
   * Force disconnect WebSocket (use carefully)
   */
  forceDisconnect(): void {
    this.cleanup();
    competitiveWebSocket.disconnect();
  }
}

export const webSocketCleanup = WebSocketCleanup.getInstance();

// Initialize page unload cleanup
if (typeof window !== "undefined") {
  webSocketCleanup.setupPageUnloadCleanup();
}
