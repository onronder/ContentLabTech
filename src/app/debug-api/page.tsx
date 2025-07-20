import { ApiSubmissionTest } from "@/components/debug/ApiSubmissionTest";

export default function DebugApiPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto">
        <h1 className="mb-8 text-center text-2xl font-bold">
          API Submission Debug Test
        </h1>
        <ApiSubmissionTest />

        <div className="mx-auto mt-8 max-w-2xl rounded-lg border border-yellow-200 bg-yellow-50 p-6">
          <h2 className="mb-2 font-bold text-yellow-800">Test Instructions:</h2>
          <ol className="list-inside list-decimal space-y-1 text-sm text-yellow-700">
            <li>Open browser developer tools (F12) and go to Console</li>
            <li>Fill in all required fields above</li>
            <li>Click &quot;Test API Submit&quot;</li>
            <li>Check console logs for detailed API flow</li>
            <li>Verify the industry field is properly captured</li>
            <li>Check for any authentication or database errors</li>
          </ol>

          <div className="mt-4 rounded border bg-white p-3">
            <h3 className="mb-1 text-sm font-bold">Expected Flow:</h3>
            <ul className="space-y-1 text-xs text-gray-600">
              <li>• Form data logged with industry check</li>
              <li>• API request sent with proper headers</li>
              <li>• Team membership resolved automatically</li>
              <li>• Validation passes for all fields</li>
              <li>• Database insert succeeds</li>
              <li>• Success response returned</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
