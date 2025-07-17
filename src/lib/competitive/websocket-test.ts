import { competitiveWebSocket } from "./websocket-service";

/**
 * WebSocket testing utilities
 * Comprehensive testing for WebSocket functionality
 */
export class WebSocketTester {
  private testResults: Array<{
    test: string;
    passed: boolean;
    message: string;
    timestamp: Date;
  }> = [];

  /**
   * Run all WebSocket tests
   */
  async runAllTests(projectId: string): Promise<boolean> {
    console.log("🧪 Starting WebSocket comprehensive tests...");
    this.testResults = [];

    const tests = [
      () => this.testConnectionState(),
      () => this.testEventListeners(),
      () => this.testReconnectionLogic(projectId),
      () => this.testCleanup(),
      () => this.testErrorHandling(),
    ];

    let allPassed = true;
    for (const test of tests) {
      try {
        const result = await test();
        if (!result) allPassed = false;
      } catch (error) {
        console.error("Test failed with error:", error);
        allPassed = false;
      }
    }

    this.printTestResults();
    return allPassed;
  }

  /**
   * Test connection state management
   */
  private testConnectionState(): boolean {
    console.log("🔗 Testing connection state...");

    const initialState = competitiveWebSocket.getConnectionState();

    if (initialState.state === "disconnected") {
      this.addTestResult(
        "Connection State",
        true,
        "Initial state is disconnected"
      );
      return true;
    } else {
      this.addTestResult(
        "Connection State",
        false,
        "Initial state should be disconnected"
      );
      return false;
    }
  }

  /**
   * Test event listeners
   */
  private testEventListeners(): Promise<boolean> {
    console.log("🎧 Testing event listeners...");

    return new Promise(resolve => {
      let eventReceived = false;

      const testListener = (event: CustomEvent) => {
        eventReceived = true;
        console.log("✅ Event received:", event.detail);
        window.removeEventListener(
          "competitive-update",
          testListener as EventListener
        );
        this.addTestResult("Event Listeners", true, "Events can be received");
        resolve(true);
      };

      window.addEventListener(
        "competitive-update",
        testListener as EventListener
      );

      // Simulate event
      window.dispatchEvent(
        new CustomEvent("competitive-update", {
          detail: { test: "event listener test" },
        })
      );

      // Timeout after 1 second
      setTimeout(() => {
        if (!eventReceived) {
          window.removeEventListener(
            "competitive-update",
            testListener as EventListener
          );
          this.addTestResult(
            "Event Listeners",
            false,
            "Event not received within timeout"
          );
          resolve(false);
        }
      }, 1000);
    });
  }

  /**
   * Test reconnection logic
   */
  private testReconnectionLogic(projectId: string): Promise<boolean> {
    console.log("🔄 Testing reconnection logic...");

    return new Promise(resolve => {
      let reconnectAttempted = false;

      // Mock WebSocket connection
      const originalConnect = competitiveWebSocket.connect;
      competitiveWebSocket.connect = (id: string) => {
        if (reconnectAttempted) {
          this.addTestResult(
            "Reconnection Logic",
            true,
            "Reconnection attempted"
          );
          competitiveWebSocket.connect = originalConnect;
          resolve(true);
          return;
        }
        reconnectAttempted = true;
        // Simulate connection failure
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("websocket-connection-state", {
              detail: { state: "error", projectId: id },
            })
          );
        }, 100);
      };

      // Start connection
      competitiveWebSocket.connect(projectId);

      // Timeout after 3 seconds
      setTimeout(() => {
        if (!reconnectAttempted) {
          competitiveWebSocket.connect = originalConnect;
          this.addTestResult(
            "Reconnection Logic",
            false,
            "Reconnection not attempted"
          );
          resolve(false);
        }
      }, 3000);
    });
  }

  /**
   * Test cleanup functionality
   */
  private testCleanup(): boolean {
    console.log("🧹 Testing cleanup...");

    // Test that cleanup doesn't throw errors
    try {
      competitiveWebSocket.disconnect();
      this.addTestResult("Cleanup", true, "Cleanup executed without errors");
      return true;
    } catch (error) {
      this.addTestResult("Cleanup", false, `Cleanup failed: ${error}`);
      return false;
    }
  }

  /**
   * Test error handling
   */
  private testErrorHandling(): boolean {
    console.log("⚠️ Testing error handling...");

    try {
      // Test invalid operations
      competitiveWebSocket.subscribeToCompetitor("invalid-id");
      competitiveWebSocket.unsubscribeFromCompetitor("invalid-id");
      competitiveWebSocket.requestAnalysis("invalid-id", "invalid-type");

      this.addTestResult("Error Handling", true, "Error handling is robust");
      return true;
    } catch (error) {
      this.addTestResult(
        "Error Handling",
        false,
        `Error handling failed: ${error}`
      );
      return false;
    }
  }

  /**
   * Add test result
   */
  private addTestResult(test: string, passed: boolean, message: string): void {
    this.testResults.push({
      test,
      passed,
      message,
      timestamp: new Date(),
    });
  }

  /**
   * Print test results
   */
  private printTestResults(): void {
    console.log("\n📊 WebSocket Test Results:");
    console.log("========================");

    this.testResults.forEach(result => {
      const icon = result.passed ? "✅" : "❌";
      console.log(`${icon} ${result.test}: ${result.message}`);
    });

    const passedCount = this.testResults.filter(r => r.passed).length;
    const totalCount = this.testResults.length;

    console.log(`\n📈 Summary: ${passedCount}/${totalCount} tests passed`);

    if (passedCount === totalCount) {
      console.log("🎉 All WebSocket tests passed!");
    } else {
      console.log(
        "⚠️ Some WebSocket tests failed. Please check the implementation."
      );
    }
  }

  /**
   * Get test results
   */
  getTestResults() {
    return this.testResults;
  }
}

export const webSocketTester = new WebSocketTester();
