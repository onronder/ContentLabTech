"use client";

import { useState } from "react";

export function ApiSubmissionTest() {
  const [testData, setTestData] = useState({
    name: "Test Company",
    domain: "test.com",
    website_url: "https://test.com",
    industry: "Technology",
    description: "Test description",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // eslint-disable-next-line no-console
    console.log("🔍 [API TEST] Starting submission with data:", testData);

    setIsSubmitting(true);
    setResult(null);
    setError("");

    try {
      const response = await fetch("/api/competitive/competitors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(testData),
      });

      // eslint-disable-next-line no-console
      console.log("🔍 [API TEST] Response status:", response.status);

      const responseData = await response.json();
      // eslint-disable-next-line no-console
      console.log("🔍 [API TEST] Response data:", responseData);

      if (!response.ok) {
        setError(
          `API Error: ${responseData.error || responseData.message || "Unknown error"}`
        );
      } else {
        setResult(responseData);
      }
    } catch (err) {
      console.error("❌ [API TEST] Network error:", err);
      setError(
        `Network Error: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setTestData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="mx-auto max-w-2xl rounded-lg border border-gray-300 bg-white p-8">
      <h2 className="mb-4 text-xl font-bold">API Submission Test</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Company Name</label>
          <input
            type="text"
            value={testData.name}
            onChange={e => updateField("name", e.target.value)}
            className="w-full rounded border border-gray-300 p-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Domain</label>
          <input
            type="text"
            value={testData.domain}
            onChange={e => updateField("domain", e.target.value)}
            className="w-full rounded border border-gray-300 p-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Website URL</label>
          <input
            type="url"
            value={testData.website_url}
            onChange={e => updateField("website_url", e.target.value)}
            className="w-full rounded border border-gray-300 p-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Industry</label>
          <select
            value={testData.industry}
            onChange={e => updateField("industry", e.target.value)}
            className="w-full rounded border border-gray-300 p-2"
          >
            <option value="">Select industry</option>
            <option value="Technology">Technology</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Financial Services">Financial Services</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea
            value={testData.description}
            onChange={e => updateField("description", e.target.value)}
            className="w-full rounded border border-gray-300 p-2"
            rows={3}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isSubmitting ? "Submitting..." : "Test API Submit"}
        </button>
      </form>

      {error && (
        <div className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="mt-4 rounded border border-green-200 bg-green-50 p-4">
          <h3 className="mb-2 font-bold text-green-800">Success!</h3>
          <pre className="overflow-auto rounded border bg-white p-2 text-xs">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-6 rounded bg-gray-100 p-4">
        <h3 className="mb-2 font-medium">Current Form Data:</h3>
        <pre className="overflow-auto text-xs">
          {JSON.stringify(testData, null, 2)}
        </pre>
      </div>
    </div>
  );
}
