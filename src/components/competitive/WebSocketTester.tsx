"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { webSocketTester } from "@/lib/competitive/websocket-test";

interface WebSocketTesterProps {
  projectId: string;
}

export function WebSocketTester({ projectId }: WebSocketTesterProps) {
  const [loading, setLoading] = useState(false);
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<any[]>([]);

  const simulateEvent = async (eventType: string) => {
    setLoading(true);
    try {
      // Simulate WebSocket event by dispatching custom event
      const mockData = {
        "competitive-update": {
          competitorId: "comp-123",
          competitorName: "Example Competitor",
          message: "Rankings updated",
          changes: {
            ranking: { from: 5, to: 3 },
            traffic: { from: 100000, to: 125000 },
          },
        },
        "competitor-alert": {
          alertId: "alert-456",
          competitorId: "comp-123",
          alertType: "ranking_change",
          message: "Competitor moved up 2 positions",
          severity: "medium",
          threshold: 10,
        },
        "analysis-complete": {
          analysisId: "analysis-789",
          competitorId: "comp-123",
          analysisType: "seo",
          status: "completed",
          results: {
            score: 85,
            recommendations: [
              "Improve meta descriptions",
              "Add more backlinks",
            ],
          },
        },
        "metrics-update": {
          competitorId: "comp-123",
          competitorName: "Example Competitor",
          metrics: {
            organic_traffic: 125000,
            keyword_count: 1250,
            backlink_count: 850,
            domain_authority: 65,
          },
        },
      };

      const eventData = mockData[eventType as keyof typeof mockData];

      if (eventData) {
        window.dispatchEvent(new CustomEvent(eventType, { detail: eventData }));
        setLastEvent(`${eventType} event simulated`);
      }
    } catch (error) {
      console.error("Error simulating event:", error);
      setLastEvent(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/websocket/test?projectId=${projectId}`
      );
      const data = await response.json();

      if (data.success) {
        setLastEvent("Connection test successful");

        // Simulate connection state change
        window.dispatchEvent(
          new CustomEvent("websocket-connection-state", {
            detail: { state: "connected", projectId },
          })
        );
      } else {
        setLastEvent("Connection test failed");
      }
    } catch (error) {
      console.error("Connection test error:", error);
      setLastEvent(`Connection test error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const runComprehensiveTests = async () => {
    setLoading(true);
    setLastEvent("Running comprehensive tests...");

    try {
      const success = await webSocketTester.runAllTests(projectId);
      const results = webSocketTester.getTestResults();
      setTestResults(results);
      setLastEvent(success ? "All tests passed!" : "Some tests failed");
    } catch (error) {
      setLastEvent(`Test error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>WebSocket Tester</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <button
              onClick={testConnection}
              disabled={loading}
              className="rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Test Connection
            </button>

            <button
              onClick={() => simulateEvent("competitive-update")}
              disabled={loading}
              className="rounded bg-green-600 px-3 py-2 text-white hover:bg-green-700 disabled:opacity-50"
            >
              Simulate Update
            </button>

            <button
              onClick={() => simulateEvent("competitor-alert")}
              disabled={loading}
              className="rounded bg-yellow-600 px-3 py-2 text-white hover:bg-yellow-700 disabled:opacity-50"
            >
              Simulate Alert
            </button>

            <button
              onClick={() => simulateEvent("analysis-complete")}
              disabled={loading}
              className="rounded bg-purple-600 px-3 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
            >
              Simulate Analysis
            </button>
          </div>

          <button
            onClick={() => simulateEvent("metrics-update")}
            disabled={loading}
            className="rounded bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Simulate Metrics Update
          </button>

          <button
            onClick={runComprehensiveTests}
            disabled={loading}
            className="rounded bg-red-600 px-3 py-2 text-white hover:bg-red-700 disabled:opacity-50"
          >
            Run All Tests
          </button>

          {lastEvent && (
            <div className="mt-4 rounded bg-gray-100 p-3">
              <p className="text-sm text-gray-700">
                <strong>Last Event:</strong> {lastEvent}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {new Date().toLocaleString()}
              </p>
            </div>
          )}

          {testResults.length > 0 && (
            <div className="mt-4 rounded bg-gray-50 p-3">
              <h4 className="mb-2 font-semibold">Test Results:</h4>
              <div className="space-y-1">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm">{result.test}</span>
                    <span
                      className={`text-sm ${result.passed ? "text-green-600" : "text-red-600"}`}
                    >
                      {result.passed ? "✅" : "❌"} {result.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
