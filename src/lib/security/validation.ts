/**
 * Production-Grade Input Validation & Security
 * Comprehensive validation schemas and security utilities
 */

import { z } from "zod";
import { createHash } from "crypto";

// Common validation schemas
export const securitySchemas = {
  // Basic types with security constraints
  id: z.string().uuid("Invalid ID format"),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, "Invalid slug format")
    .min(1)
    .max(100),
  email: z.string().email("Invalid email format").max(255),
  url: z.string().url("Invalid URL format").max(2048),
  text: z.string().min(1).max(10000, "Text too long"),
  shortText: z.string().min(1).max(255, "Text too long"),
  longText: z.string().min(1).max(50000, "Text too long"),
  number: z.number().int().min(0).max(2147483647),
  positiveNumber: z.number().int().min(1).max(2147483647),
  boolean: z.boolean(),

  // Date validation
  dateString: z.string().datetime("Invalid date format"),

  // File validation
  filename: z
    .string()
    .regex(/^[a-zA-Z0-9._-]+$/, "Invalid filename")
    .max(255),
  mimetype: z
    .string()
    .regex(/^[a-zA-Z0-9-]+\/[a-zA-Z0-9-+.]+$/, "Invalid MIME type"),

  // Content validation
  title: z.string().min(1, "Title required").max(200, "Title too long"),
  description: z.string().max(1000, "Description too long").optional(),
  status: z.enum(["draft", "published", "archived"], {
    message: "Invalid status",
  }),

  // Team and user validation
  role: z.enum(["owner", "admin", "member", "viewer"], {
    message: "Invalid role",
  }),

  // Search and pagination
  searchQuery: z.string().max(100, "Search query too long").optional(),
  page: z.number().int().min(1).max(1000).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
};

// SQL Injection patterns
const SQL_INJECTION_PATTERNS = [
  /('|(--)|;|(\|\|)|(\*\*))/i,
  /union\s+select/gi,
  /insert\s+into/gi,
  /delete\s+from/gi,
  /update\s+set/gi,
  /drop\s+table/gi,
  /drop\s+database/gi,
  /alter\s+table/gi,
  /create\s+table/gi,
  /exec\s*\(/gi,
  /execute\s*\(/gi,
  /sp_executesql/gi,
  /xp_cmdshell/gi,
];

// XSS patterns
const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /eval\s*\(/gi,
  /<iframe[^>]*>/gi,
  /<object[^>]*>/gi,
  /<embed[^>]*>/gi,
  /<link[^>]*>/gi,
  /<meta[^>]*>/gi,
  /data:text\/html/gi,
  /vbscript:/gi,
];

// Path traversal patterns
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//gi,
  /\.\.\\/gi,
  /%2e%2e%2f/gi,
  /%2e%2e%5c/gi,
  /\.\//gi,
  /%2e%2f/gi,
];

// Command injection patterns
const COMMAND_INJECTION_PATTERNS = [
  /[;&|`$(){}[\]]/,
  /\s*(cat|ls|pwd|whoami|id|uname)\s/gi,
  /\s*(rm|cp|mv|chmod|chown)\s/gi,
  /\s*(curl|wget|nc|netcat)\s/gi,
];

/**
 * Comprehensive input sanitization
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  return input
    .trim()
    .replace(/[\0\x08\x09\x1a\n\r"'\\%]/g, char => {
      switch (char) {
        case "\0":
          return "";
        case "\x08":
          return "";
        case "\x09":
          return "";
        case "\x1a":
          return "";
        case "\n":
          return "";
        case "\r":
          return "";
        case '"':
          return "&quot;";
        case "'":
          return "&#x27;";
        case "\\":
          return "";
        case "%":
          return "";
        default:
          return char;
      }
    })
    .substring(0, 10000); // Hard limit
}

/**
 * Detect malicious patterns in input
 */
export function detectMaliciousPatterns(input: string): {
  isMalicious: boolean;
  detectedPatterns: string[];
  risk: "low" | "medium" | "high" | "critical";
} {
  const detectedPatterns: string[] = [];

  // Check SQL injection
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      detectedPatterns.push("SQL_INJECTION");
      break;
    }
  }

  // Check XSS
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(input)) {
      detectedPatterns.push("XSS");
      break;
    }
  }

  // Check path traversal
  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    if (pattern.test(input)) {
      detectedPatterns.push("PATH_TRAVERSAL");
      break;
    }
  }

  // Check command injection
  for (const pattern of COMMAND_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      detectedPatterns.push("COMMAND_INJECTION");
      break;
    }
  }

  // Determine risk level
  let risk: "low" | "medium" | "high" | "critical" = "low";
  if (
    detectedPatterns.includes("SQL_INJECTION") ||
    detectedPatterns.includes("COMMAND_INJECTION")
  ) {
    risk = "critical";
  } else if (detectedPatterns.includes("XSS")) {
    risk = "high";
  } else if (detectedPatterns.includes("PATH_TRAVERSAL")) {
    risk = "medium";
  }

  return {
    isMalicious: detectedPatterns.length > 0,
    detectedPatterns,
    risk,
  };
}

/**
 * Validate and sanitize request body
 */
export async function validateRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<
  { success: true; data: T } | { success: false; error: string; details?: any }
> {
  try {
    // Check content type
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return {
        success: false,
        error: "Invalid content type. Expected application/json",
      };
    }

    // Parse JSON with size limit
    const text = await request.text();
    if (text.length > 1048576) {
      // 1MB limit
      return {
        success: false,
        error: "Request body too large",
      };
    }

    // Check for malicious patterns in raw text
    const maliciousCheck = detectMaliciousPatterns(text);
    if (maliciousCheck.isMalicious && maliciousCheck.risk === "critical") {
      return {
        success: false,
        error: "Malicious content detected",
        details: { patterns: maliciousCheck.detectedPatterns },
      };
    }

    let body;
    try {
      body = JSON.parse(text);
    } catch (parseError) {
      return {
        success: false,
        error: "Invalid JSON format",
      };
    }

    // Validate against schema
    const validation = schema.safeParse(body);
    if (!validation.success) {
      return {
        success: false,
        error: "Validation failed",
        details: validation.error.format(),
      };
    }

    return {
      success: true,
      data: validation.data,
    };
  } catch (error) {
    return {
      success: false,
      error: "Request validation failed",
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Validate query parameters
 */
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
):
  | { success: true; data: T }
  | { success: false; error: string; details?: any } {
  try {
    // Convert URLSearchParams to object
    const params: Record<string, any> = {};
    for (const [key, value] of searchParams.entries()) {
      // Check for malicious patterns
      const keyCheck = detectMaliciousPatterns(key);
      const valueCheck = detectMaliciousPatterns(value);

      if (keyCheck.isMalicious || valueCheck.isMalicious) {
        return {
          success: false,
          error: "Malicious content detected in query parameters",
        };
      }

      // Handle multiple values for same key
      if (key in params) {
        if (Array.isArray(params[key])) {
          params[key].push(value);
        } else {
          params[key] = [params[key], value];
        }
      } else {
        params[key] = value;
      }
    }

    // Validate against schema
    const validation = schema.safeParse(params);
    if (!validation.success) {
      return {
        success: false,
        error: "Query parameter validation failed",
        details: validation.error.format(),
      };
    }

    return {
      success: true,
      data: validation.data,
    };
  } catch (error) {
    return {
      success: false,
      error: "Query parameter validation failed",
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Generate secure hash for request fingerprinting
 */
export function generateRequestFingerprint(
  ip: string,
  userAgent: string,
  endpoint: string
): string {
  return createHash("sha256")
    .update(`${ip}:${userAgent}:${endpoint}:${Date.now()}`)
    .digest("hex")
    .substring(0, 16);
}

/**
 * Validate file upload
 */
export function validateFileUpload(
  filename: string,
  mimetype: string,
  size: number,
  allowedTypes: string[] = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
  ],
  maxSize = 5242880 // 5MB
): { valid: boolean; error?: string } {
  // Validate filename
  const filenameValidation = securitySchemas.filename.safeParse(filename);
  if (!filenameValidation.success) {
    return { valid: false, error: "Invalid filename" };
  }

  // Validate MIME type
  if (!allowedTypes.includes(mimetype)) {
    return { valid: false, error: "File type not allowed" };
  }

  // Validate size
  if (size > maxSize) {
    return { valid: false, error: "File too large" };
  }

  // Check for malicious patterns in filename
  const maliciousCheck = detectMaliciousPatterns(filename);
  if (maliciousCheck.isMalicious) {
    return { valid: false, error: "Malicious filename detected" };
  }

  return { valid: true };
}

/**
 * Rate limiting key generator
 */
export function generateRateLimitKey(
  ip: string,
  userId?: string,
  action?: string
): string {
  const base = userId ? `user:${userId}` : `ip:${ip}`;
  return action ? `${base}:${action}` : base;
}

/**
 * Validate IP address format
 */
export function validateIPAddress(ip: string): boolean {
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Create validation error response
 */
export function createValidationErrorResponse(
  error: string,
  details?: any,
  requestId?: string
): Response {
  return new Response(
    JSON.stringify({
      error,
      code: "VALIDATION_ERROR",
      status: 400,
      timestamp: new Date().toISOString(),
      requestId,
      ...(details && { details }),
    }),
    {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff",
        ...(requestId && { "X-Request-ID": requestId }),
      },
    }
  );
}
