import { IndustryFieldTest } from "@/components/debug/IndustryFieldTest";

export default function DebugIndustryPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto">
        <h1 className="mb-8 text-center text-2xl font-bold">
          Industry Field Debug Test
        </h1>
        <IndustryFieldTest />

        <div className="mx-auto mt-8 max-w-md rounded-lg border border-blue-200 bg-blue-50 p-6">
          <h2 className="mb-2 font-bold text-blue-800">Instructions:</h2>
          <ol className="list-inside list-decimal space-y-1 text-sm text-blue-700">
            <li>Open browser developer tools (F12)</li>
            <li>Go to Console tab</li>
            <li>Select an industry from the dropdown</li>
            <li>Check console logs for onChange events</li>
            <li>Click outside the field to trigger onBlur</li>
            <li>Try submitting the form</li>
            <li>Compare with AddCompetitorModal behavior</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
