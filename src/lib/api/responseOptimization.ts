/**
 * API Response Optimization Utilities
 * Production-grade response optimization with compression and selective field inclusion
 * Implements intelligent payload optimization for improved performance
 */

import { NextResponse } from "next/server";
import { compress, decompress } from "lz-string";

interface OptimizationOptions {
  compress?: boolean;
  compressionThreshold?: number; // Bytes
  fields?: string[]; // Selective field inclusion
  exclude?: string[]; // Fields to exclude
  maxDepth?: number; // Maximum object nesting depth
  mobile?: boolean; // Mobile-optimized response
}

interface CompressionMetrics {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  compressionTime: number;
}

interface ResponseMetadata {
  optimized: boolean;
  compressed: boolean;
  fieldsSelected: boolean;
  originalFields?: number;
  selectedFields?: number;
  compressionMetrics?: CompressionMetrics;
  processingTime: number;
}

/**
 * Optimized JSON response with intelligent compression and field selection
 */
export function createOptimizedResponse<T = unknown>(
  data: T,
  options: OptimizationOptions = {},
  status = 200
): NextResponse {
  const startTime = Date.now();

  const {
    compress: shouldCompress = true,
    compressionThreshold = 1024, // 1KB threshold
    fields,
    exclude,
    maxDepth = 10,
    mobile = false,
  } = options;

  let processedData = data;
  const metadata: ResponseMetadata = {
    optimized: true,
    compressed: false,
    fieldsSelected: false,
    processingTime: 0,
  };

  try {
    // Step 1: Selective field inclusion/exclusion
    if (fields || exclude || mobile) {
      processedData = selectFields(processedData, {
        ...(fields && { fields }),
        ...(exclude && { exclude }),
        mobile,
        maxDepth,
      });
      metadata.fieldsSelected = true;
      metadata.originalFields = countFields(data);
      metadata.selectedFields = countFields(processedData);
    }

    // Step 2: Compression analysis
    const jsonString = JSON.stringify(processedData);
    const originalSize = new TextEncoder().encode(jsonString).length;

    let responseData = processedData;
    const responseHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Response-Optimized": "true",
    };

    // Step 3: Apply compression if beneficial
    if (shouldCompress && originalSize > compressionThreshold) {
      const compressionStart = Date.now();
      const compressed = compress(jsonString);
      const compressionTime = Date.now() - compressionStart;
      const compressedSize = new TextEncoder().encode(compressed).length;

      // Only use compression if it provides significant benefit (>20% reduction)
      const compressionRatio = compressedSize / originalSize;
      if (compressionRatio < 0.8) {
        responseData = { compressed: true, data: compressed } as T;
        metadata.compressed = true;
        metadata.compressionMetrics = {
          originalSize,
          compressedSize,
          compressionRatio,
          compressionTime,
        };
        responseHeaders["X-Content-Compressed"] = "lz-string";
        responseHeaders["X-Original-Size"] = originalSize.toString();
        responseHeaders["X-Compressed-Size"] = compressedSize.toString();
      }
    }

    // Step 4: Add optimization metadata in development
    if (process.env.NODE_ENV === "development") {
      metadata.processingTime = Date.now() - startTime;
      responseHeaders["X-Optimization-Metadata"] = JSON.stringify(metadata);
    }

    // Step 5: Mobile-specific optimizations
    if (mobile) {
      responseHeaders["Cache-Control"] =
        "public, max-age=300, stale-while-revalidate=600";
      responseHeaders["X-Mobile-Optimized"] = "true";
    } else {
      responseHeaders["Cache-Control"] =
        "public, max-age=600, stale-while-revalidate=1200";
    }

    // Step 6: Performance monitoring headers
    responseHeaders["X-Response-Time"] = (Date.now() - startTime).toString();
    responseHeaders["X-Optimization-Version"] = "1.0";

    return NextResponse.json(responseData, {
      status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Response optimization failed:", error);

    // Fallback to unoptimized response
    return NextResponse.json(data, {
      status,
      headers: {
        "Content-Type": "application/json",
        "X-Response-Optimized": "false",
        "X-Optimization-Error":
          error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

/**
 * Selective field inclusion with intelligent mobile optimization
 */
function selectFields<T>(
  data: T,
  options: {
    fields?: string[];
    exclude?: string[];
    mobile?: boolean;
    maxDepth?: number;
    currentDepth?: number;
  }
): T {
  const {
    fields,
    exclude,
    mobile = false,
    maxDepth = 10,
    currentDepth = 0,
  } = options;

  // Prevent infinite recursion
  if (currentDepth >= maxDepth) {
    return data;
  }

  // Handle primitive types
  if (data === null || data === undefined || typeof data !== "object") {
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item =>
      selectFields(item, {
        ...(fields && { fields }),
        ...(exclude && { exclude }),
        mobile,
        maxDepth,
        currentDepth: currentDepth + 1,
      })
    ) as T;
  }

  // Handle objects
  const result: Record<string, unknown> = {};
  const obj = data as Record<string, unknown>;

  // Mobile optimization: exclude heavy fields by default
  const mobileExclusions = mobile
    ? [
        "rawData",
        "detailedMetrics",
        "fullAnalysis",
        "debugInfo",
        "internalMetadata",
        "largeArrays",
      ]
    : [];

  const effectiveExclusions = [...(exclude || []), ...mobileExclusions];

  for (const [key, value] of Object.entries(obj)) {
    // Skip excluded fields
    if (effectiveExclusions.includes(key)) {
      continue;
    }

    // Include only specified fields if fields array is provided
    if (fields && fields.length > 0) {
      const shouldInclude = fields.some(field => {
        // Support nested field notation (e.g., 'user.profile.name')
        return (
          field === key ||
          field.startsWith(`${key}.`) ||
          key.startsWith(`${field}.`)
        );
      });

      if (!shouldInclude) {
        continue;
      }
    }

    // Recursively process nested objects
    const nestedFields = fields
      ?.filter(f => f.startsWith(`${key}.`))
      ?.map(f => f.substring(key.length + 1));
    result[key] = selectFields(value, {
      ...(nestedFields && { fields: nestedFields }),
      ...(exclude && { exclude }),
      mobile,
      maxDepth,
      currentDepth: currentDepth + 1,
    });
  }

  return result as T;
}

/**
 * Count total fields in an object for optimization metrics
 */
function countFields(data: unknown, visited = new Set()): number {
  if (data === null || data === undefined || typeof data !== "object") {
    return 0;
  }

  // Prevent circular reference issues
  if (visited.has(data)) {
    return 0;
  }
  visited.add(data);

  if (Array.isArray(data)) {
    return data.reduce((count, item) => count + countFields(item, visited), 0);
  }

  let count = Object.keys(data).length;
  for (const value of Object.values(data)) {
    count += countFields(value, visited);
  }

  visited.delete(data);
  return count;
}

/**
 * Decompress response data on client side
 */
export function decompressResponse(response: unknown): unknown {
  if (
    response &&
    typeof response === "object" &&
    response !== null &&
    "compressed" in response &&
    "data" in response &&
    (response as { compressed: boolean; data: string }).compressed
  ) {
    try {
      const decompressed = decompress((response as { data: string }).data);
      return JSON.parse(decompressed);
    } catch (error) {
      console.error("Decompression failed:", error);
      return response;
    }
  }
  return response;
}

/**
 * Smart caching headers based on data type and freshness requirements
 */
export function getCacheHeaders(
  dataType: string,
  isMobile = false
): Record<string, string> {
  const cacheConfig: Record<
    string,
    { maxAge: number; staleWhileRevalidate: number }
  > = {
    "analytics-status": { maxAge: 300, staleWhileRevalidate: 600 }, // 5 min / 10 min
    "content-analysis": { maxAge: 3600, staleWhileRevalidate: 7200 }, // 1 hour / 2 hours
    "seo-health": { maxAge: 1800, staleWhileRevalidate: 3600 }, // 30 min / 1 hour
    performance: { maxAge: 900, staleWhileRevalidate: 1800 }, // 15 min / 30 min
    competitive: { maxAge: 14400, staleWhileRevalidate: 28800 }, // 4 hours / 8 hours
    "industry-benchmark": { maxAge: 86400, staleWhileRevalidate: 172800 }, // 24 hours / 48 hours
    projects: { maxAge: 1800, staleWhileRevalidate: 3600 }, // 30 min / 1 hour
    teams: { maxAge: 3600, staleWhileRevalidate: 7200 }, // 1 hour / 2 hours
  };

  const config = cacheConfig[dataType] || {
    maxAge: 300,
    staleWhileRevalidate: 600,
  };

  // Reduce cache times for mobile to ensure fresher data
  if (isMobile) {
    config.maxAge = Math.floor(config.maxAge * 0.7);
    config.staleWhileRevalidate = Math.floor(config.staleWhileRevalidate * 0.7);
  }

  return {
    "Cache-Control": `public, max-age=${config.maxAge}, stale-while-revalidate=${config.staleWhileRevalidate}`,
    "CDN-Cache-Control": `public, max-age=${config.maxAge * 2}`, // CDN caches longer
    Vary: "Accept-Encoding, User-Agent",
  };
}

/**
 * Middleware for request-based optimization detection
 */
export function detectOptimizationNeeds(request: Request): OptimizationOptions {
  const userAgent = request.headers.get("user-agent")?.toLowerCase() || "";
  const acceptEncoding = request.headers.get("accept-encoding") || "";
  const isMobile = /mobile|android|iphone|ipad|phone/i.test(userAgent);
  const isSlowConnection = request.headers.get("downlink")
    ? parseFloat(request.headers.get("downlink")!) < 1.0
    : false;

  const url = new URL(request.url);
  const fieldsParam = url.searchParams.get("fields");
  const excludeParam = url.searchParams.get("exclude");
  const compressParam = url.searchParams.get("compress");

  return {
    mobile: isMobile,
    compress:
      compressParam !== "false" &&
      (isMobile || isSlowConnection || acceptEncoding.includes("gzip")),
    compressionThreshold: isMobile ? 512 : 1024, // Lower threshold for mobile
    ...(fieldsParam && { fields: fieldsParam.split(",") }),
    ...(excludeParam && { exclude: excludeParam.split(",") }),
    maxDepth: isMobile ? 5 : 10, // Reduce depth for mobile
  };
}

/**
 * Performance monitoring for optimization effectiveness
 */
interface OptimizationMetrics {
  requestId: string;
  dataType: string;
  originalSize: number;
  optimizedSize: number;
  compressionRatio?: number;
  fieldsReduction?: number;
  processingTime: number;
  cacheHit: boolean;
  mobile: boolean;
}

const optimizationMetrics: OptimizationMetrics[] = [];

export function recordOptimizationMetrics(metrics: OptimizationMetrics): void {
  optimizationMetrics.push(metrics);

  // Keep only last 1000 entries to prevent memory issues
  if (optimizationMetrics.length > 1000) {
    optimizationMetrics.splice(0, optimizationMetrics.length - 1000);
  }
}

export function getOptimizationStats(): {
  averageCompressionRatio: number;
  averageFieldsReduction: number;
  averageProcessingTime: number;
  mobileOptimizationRate: number;
  totalRequests: number;
} {
  if (optimizationMetrics.length === 0) {
    return {
      averageCompressionRatio: 0,
      averageFieldsReduction: 0,
      averageProcessingTime: 0,
      mobileOptimizationRate: 0,
      totalRequests: 0,
    };
  }

  const withCompression = optimizationMetrics.filter(m => m.compressionRatio);
  const withFieldsReduction = optimizationMetrics.filter(
    m => m.fieldsReduction
  );
  const mobileRequests = optimizationMetrics.filter(m => m.mobile);

  return {
    averageCompressionRatio:
      withCompression.length > 0
        ? withCompression.reduce(
            (sum, m) => sum + (m.compressionRatio || 0),
            0
          ) / withCompression.length
        : 0,
    averageFieldsReduction:
      withFieldsReduction.length > 0
        ? withFieldsReduction.reduce(
            (sum, m) => sum + (m.fieldsReduction || 0),
            0
          ) / withFieldsReduction.length
        : 0,
    averageProcessingTime:
      optimizationMetrics.reduce((sum, m) => sum + m.processingTime, 0) /
      optimizationMetrics.length,
    mobileOptimizationRate: mobileRequests.length / optimizationMetrics.length,
    totalRequests: optimizationMetrics.length,
  };
}
