"use client";

import { useState } from "react";

const INDUSTRY_OPTIONS = [
  "Technology",
  "Healthcare & Life Sciences",
  "Financial Services",
  "Retail & E-commerce",
  "Manufacturing",
  "Education",
  "Media & Entertainment",
  "Real Estate",
  "Consulting & Professional Services",
  "Automotive",
  "Energy & Utilities",
  "Food & Beverage",
  "Travel & Hospitality",
  "Telecommunications",
  "Government & Public Sector",
  "Non-profit",
  "Other",
];

export function IndustryFieldTest() {
  const [industry, setIndustry] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState("");

  const validateIndustry = (value: string) => {
    if (!value) {
      setError("Please select an industry");
      return false;
    } else {
      setError("");
      return true;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    // eslint-disable-next-line no-console
    console.log("🔍 [DEBUG] Industry onChange:", {
      value,
      target: e.target,
      eventType: e.type,
    });

    setIndustry(value);

    if (touched) {
      validateIndustry(value);
    }
  };

  const handleBlur = () => {
    // eslint-disable-next-line no-console
    console.log("🔍 [DEBUG] Industry onBlur, setting touched=true");
    setTouched(true);
    validateIndustry(industry);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // eslint-disable-next-line no-console
    console.log("🔍 [DEBUG] Form submit:", {
      industry,
      touched,
      error,
      hasError: !!error,
    });

    if (!industry) {
      setError("Please select an industry");
      setTouched(true);
      return;
    }

    alert(`Form submitted with industry: ${industry}`);
  };

  return (
    <div className="mx-auto max-w-md rounded-lg border border-gray-300 bg-white p-8">
      <h2 className="mb-4 text-xl font-bold">Industry Field Debug Test</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="debug-industry"
            className="mb-2 block text-sm font-medium"
          >
            Industry *
          </label>
          <select
            id="debug-industry"
            value={industry}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full rounded-md border p-3 ${error && touched ? "border-red-500" : "border-gray-300"} focus:ring-2 focus:ring-blue-500 focus:outline-none`}
          >
            <option value="">Select industry</option>
            {INDUSTRY_OPTIONS.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          {error && touched && (
            <p className="mt-1 text-sm text-red-500">{error}</p>
          )}
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Test Submit
        </button>
      </form>

      <div className="mt-6 rounded-md bg-gray-100 p-4">
        <h3 className="mb-2 font-medium">Debug Info:</h3>
        <pre className="text-xs">
          {JSON.stringify(
            {
              industry,
              touched,
              error,
              hasValue: !!industry,
              isEmpty: industry === "",
            },
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
}
