/**
 * Production Environment Security Manager
 * Comprehensive environment variable validation and secret management
 */

import { createHash } from "crypto";

// Environment variable security classification
interface EnvironmentVariable {
  key: string;
  required: boolean;
  sensitive: boolean;
  pattern?: RegExp;
  description: string;
  validationFunction?: (value: string) => boolean;
}

// Comprehensive environment variable definitions
const ENVIRONMENT_VARIABLES: EnvironmentVariable[] = [
  // Supabase Configuration
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    required: true,
    sensitive: false,
    pattern: /^https:\/\/[a-z0-9]{20}\.supabase\.co$/,
    description: "Supabase project URL",
    validationFunction: value =>
      value.includes("supabase.co") && value.startsWith("https://"),
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    required: true,
    sensitive: true,
    pattern: /^eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/,
    description: "Supabase anonymous key (JWT)",
    validationFunction: value => value.startsWith("eyJ") && value.length > 100,
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    required: true,
    sensitive: true,
    pattern: /^eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/,
    description: "Supabase service role key (JWT)",
    validationFunction: value => value.startsWith("eyJ") && value.length > 100,
  },
  {
    key: "SUPABASE_JWT_SECRET",
    required: true,
    sensitive: true,
    description: "JWT secret for token validation",
    validationFunction: value => value.length >= 32,
  },

  // Authentication
  {
    key: "NEXTAUTH_SECRET",
    required: true,
    sensitive: true,
    description: "NextAuth.js secret key",
    validationFunction: value => value.length >= 32,
  },
  {
    key: "NEXTAUTH_URL",
    required: true,
    sensitive: false,
    pattern: /^https?:\/\/.+/,
    description: "NextAuth.js URL",
  },

  // Email Configuration
  {
    key: "RESEND_API_KEY",
    required: true,
    sensitive: true,
    pattern: /^re_[A-Za-z0-9_-]+$/,
    description: "Resend API key for email",
  },
  {
    key: "EMAIL_FROM",
    required: true,
    sensitive: false,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    description: "From email address",
  },

  // OpenAI Configuration
  {
    key: "OPENAI_API_KEY",
    required: true,
    sensitive: true,
    pattern: /^sk-proj-[A-Za-z0-9_-]+$/,
    description: "OpenAI API key",
  },

  // Database
  {
    key: "DATABASE_URL",
    required: true,
    sensitive: true,
    pattern: /^postgresql:\/\/.+$/,
    description: "PostgreSQL database connection string",
  },

  // External APIs
  {
    key: "GOOGLE_PAGESPEED_API_KEY",
    required: false,
    sensitive: true,
    description: "Google PageSpeed Insights API key",
  },
  {
    key: "GOOGLE_ANALYTICS_CLIENT_ID",
    required: false,
    sensitive: true,
    description: "Google Analytics client ID",
  },
  {
    key: "GOOGLE_ANALYTICS_CLIENT_SECRET",
    required: false,
    sensitive: true,
    description: "Google Analytics client secret",
  },

  // Proxy Configuration
  {
    key: "BRIGHTDATA_PROXY_HOST",
    required: false,
    sensitive: false,
    description: "Bright Data proxy host",
  },
  {
    key: "BRIGHTDATA_CUSTOMER_ID",
    required: false,
    sensitive: true,
    description: "Bright Data customer ID",
  },
  {
    key: "BRIGHTDATA_PASSWORD",
    required: false,
    sensitive: true,
    description: "Bright Data password",
  },
];

// Security violations and their severity
interface SecurityViolation {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  variable?: string;
  value?: string;
  recommendation: string;
}

/**
 * Validate environment variables for security issues
 */
export function validateEnvironmentSecurity(): {
  isSecure: boolean;
  violations: SecurityViolation[];
  missingRequired: string[];
  summary: string;
} {
  const violations: SecurityViolation[] = [];
  const missingRequired: string[] = [];

  // Check for missing required variables
  for (const envVar of ENVIRONMENT_VARIABLES) {
    const value = process.env[envVar.key];

    if (envVar.required && !value) {
      missingRequired.push(envVar.key);
      violations.push({
        type: "MISSING_REQUIRED_VARIABLE",
        severity: "critical",
        message: `Missing required environment variable: ${envVar.key}`,
        variable: envVar.key,
        recommendation: `Set ${envVar.key} in your environment configuration`,
      });
      continue;
    }

    if (!value) continue;

    // Check for placeholder values
    if (
      value.includes("placeholder") ||
      value.includes("YOUR_") ||
      value.includes("CHANGE_ME")
    ) {
      violations.push({
        type: "PLACEHOLDER_VALUE",
        severity: "critical",
        message: `Placeholder value detected in ${envVar.key}`,
        variable: envVar.key,
        recommendation: "Replace placeholder with actual secure value",
      });
    }

    // Check for weak secrets
    if (envVar.sensitive && value.length < 32) {
      violations.push({
        type: "WEAK_SECRET",
        severity: "high",
        message: `Weak secret in ${envVar.key} (too short)`,
        variable: envVar.key,
        recommendation: "Use a stronger secret with at least 32 characters",
      });
    }

    // Pattern validation
    if (envVar.pattern && !envVar.pattern.test(value)) {
      violations.push({
        type: "INVALID_FORMAT",
        severity: "high",
        message: `Invalid format for ${envVar.key}`,
        variable: envVar.key,
        recommendation: `Ensure ${envVar.key} matches the expected format`,
      });
    }

    // Custom validation
    if (envVar.validationFunction && !envVar.validationFunction(value)) {
      violations.push({
        type: "VALIDATION_FAILED",
        severity: "high",
        message: `Validation failed for ${envVar.key}`,
        variable: envVar.key,
        recommendation: `Check ${envVar.key} value: ${envVar.description}`,
      });
    }

    // Check for exposed secrets in client-side variables
    if (envVar.key.startsWith("NEXT_PUBLIC_") && envVar.sensitive) {
      violations.push({
        type: "EXPOSED_SECRET",
        severity: "critical",
        message: `Sensitive value exposed in client-side variable: ${envVar.key}`,
        variable: envVar.key,
        recommendation:
          "Move sensitive values to server-only environment variables",
      });
    }
  }

  // Check for common security anti-patterns
  checkCommonSecurityIssues(violations);

  // Check for development/test values in production
  if (process.env.NODE_ENV === "production") {
    checkProductionSecurityIssues(violations);
  }

  const criticalViolations = violations.filter(v => v.severity === "critical");
  const highViolations = violations.filter(v => v.severity === "high");

  return {
    isSecure: criticalViolations.length === 0 && highViolations.length === 0,
    violations,
    missingRequired,
    summary: generateSecuritySummary(violations, missingRequired),
  };
}

/**
 * Check for common security issues
 */
function checkCommonSecurityIssues(violations: SecurityViolation[]): void {
  // Check for hardcoded localhost URLs in production
  if (process.env.NODE_ENV === "production") {
    const localhostVars = ["NEXTAUTH_URL", "NEXT_PUBLIC_SUPABASE_URL"];
    for (const varName of localhostVars) {
      const value = process.env[varName];
      if (
        value &&
        (value.includes("localhost") || value.includes("127.0.0.1"))
      ) {
        violations.push({
          type: "LOCALHOST_IN_PRODUCTION",
          severity: "critical",
          message: `Localhost URL detected in production for ${varName}`,
          variable: varName,
          value: value,
          recommendation: "Use production URLs in production environment",
        });
      }
    }
  }

  // Check for default/example values
  const defaultValues = [
    "secret",
    "password",
    "example",
    "test",
    "demo",
    "default",
    "changeme",
    "admin",
  ];

  for (const envVar of ENVIRONMENT_VARIABLES) {
    const value = process.env[envVar.key];
    if (value && envVar.sensitive) {
      const lowerValue = value.toLowerCase();
      for (const defaultVal of defaultValues) {
        if (lowerValue.includes(defaultVal)) {
          violations.push({
            type: "DEFAULT_VALUE",
            severity: "high",
            message: `Potential default value in ${envVar.key}`,
            variable: envVar.key,
            recommendation:
              "Use a unique, secure value instead of default/example values",
          });
          break;
        }
      }
    }
  }
}

/**
 * Check for production-specific security issues
 */
function checkProductionSecurityIssues(violations: SecurityViolation[]): void {
  // Check for HTTP URLs in production
  const httpVars = ["NEXTAUTH_URL", "NEXT_PUBLIC_SUPABASE_URL"];
  for (const varName of httpVars) {
    const value = process.env[varName];
    if (value && value.startsWith("http://")) {
      violations.push({
        type: "HTTP_IN_PRODUCTION",
        severity: "critical",
        message: `HTTP URL in production for ${varName}`,
        variable: varName,
        recommendation: "Use HTTPS URLs in production",
      });
    }
  }

  // Check for debug/development flags
  const debugVars = ["DEBUG", "NODE_ENV"];
  if (process.env.DEBUG === "true" || process.env.DEBUG === "1") {
    violations.push({
      type: "DEBUG_ENABLED_IN_PRODUCTION",
      severity: "medium",
      message: "Debug mode enabled in production",
      variable: "DEBUG",
      recommendation: "Disable debug mode in production",
    });
  }
}

/**
 * Generate security summary
 */
function generateSecuritySummary(
  violations: SecurityViolation[],
  missingRequired: string[]
): string {
  const critical = violations.filter(v => v.severity === "critical").length;
  const high = violations.filter(v => v.severity === "high").length;
  const medium = violations.filter(v => v.severity === "medium").length;
  const low = violations.filter(v => v.severity === "low").length;

  if (critical > 0) {
    return `🚨 CRITICAL: ${critical} critical security issues found. Immediate action required.`;
  }

  if (high > 0) {
    return `⚠️ HIGH RISK: ${high} high-risk security issues found. Address before deployment.`;
  }

  if (medium > 0) {
    return `⚡ MEDIUM RISK: ${medium} medium-risk security issues found.`;
  }

  if (low > 0) {
    return `ℹ️ LOW RISK: ${low} low-risk security issues found.`;
  }

  return "✅ Environment security validation passed.";
}

/**
 * Get environment variable security classification
 */
export function getEnvironmentVariableSecurity(): {
  [key: string]: {
    isSensitive: boolean;
    isRequired: boolean;
    description: string;
    isPresent: boolean;
    isValid: boolean;
  };
} {
  const result: any = {};

  for (const envVar of ENVIRONMENT_VARIABLES) {
    const value = process.env[envVar.key];
    result[envVar.key] = {
      isSensitive: envVar.sensitive,
      isRequired: envVar.required,
      description: envVar.description,
      isPresent: !!value,
      isValid: value ? (envVar.validationFunction?.(value) ?? true) : false,
    };
  }

  return result;
}

/**
 * Mask sensitive environment variables for logging
 */
export function maskSensitiveEnvironmentVariables(
  env: Record<string, string | undefined>
): Record<string, string | undefined> {
  const masked: Record<string, string | undefined> = {};

  for (const [key, value] of Object.entries(env)) {
    const envVar = ENVIRONMENT_VARIABLES.find(v => v.key === key);

    if (envVar?.sensitive && value) {
      // Show first 4 and last 4 characters for identification
      if (value.length > 8) {
        masked[key] =
          `${value.substring(0, 4)}***${value.substring(value.length - 4)}`;
      } else {
        masked[key] = "***";
      }
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

/**
 * Generate environment security report
 */
export function generateEnvironmentSecurityReport(): string {
  const validation = validateEnvironmentSecurity();
  const classification = getEnvironmentVariableSecurity();

  let report = "# Environment Security Report\\n\\n";
  report += `**Generated:** ${new Date().toISOString()}\\n`;
  report += `**Environment:** ${process.env.NODE_ENV || "unknown"}\\n\\n`;

  // Summary
  report += `## Security Summary\\n\\n`;
  report += `${validation.summary}\\n\\n`;

  // Violations
  if (validation.violations.length > 0) {
    report += `## Security Violations\\n\\n`;

    const violationsBySeverity = {
      critical: validation.violations.filter(v => v.severity === "critical"),
      high: validation.violations.filter(v => v.severity === "high"),
      medium: validation.violations.filter(v => v.severity === "medium"),
      low: validation.violations.filter(v => v.severity === "low"),
    };

    for (const [severity, violations] of Object.entries(violationsBySeverity)) {
      if (violations.length > 0) {
        report += `### ${severity.toUpperCase()} SEVERITY (${violations.length})\\n\\n`;

        for (const violation of violations) {
          report += `- **${violation.type}**: ${violation.message}\\n`;
          if (violation.variable) {
            report += `  - Variable: \`${violation.variable}\`\\n`;
          }
          report += `  - Recommendation: ${violation.recommendation}\\n\\n`;
        }
      }
    }
  }

  // Environment Variable Status
  report += `## Environment Variables Status\\n\\n`;
  report += "| Variable | Required | Sensitive | Present | Valid |\\n";
  report += "|----------|----------|-----------|---------|-------|\\n";

  for (const envVar of ENVIRONMENT_VARIABLES) {
    const status = classification[envVar.key];
    if (!status) continue;

    const required = status.isRequired ? "✅" : "❌";
    const sensitive = status.isSensitive ? "🔒" : "📖";
    const present = status.isPresent ? "✅" : "❌";
    const valid = status.isValid ? "✅" : "❌";

    report += `| \`${envVar.key}\` | ${required} | ${sensitive} | ${present} | ${valid} |\\n`;
  }

  // Recommendations
  report += `\\n## Security Recommendations\\n\\n`;
  report +=
    "1. **Use strong, unique secrets** - Generate cryptographically secure random values\\n";
  report +=
    "2. **Rotate secrets regularly** - Implement secret rotation for production systems\\n";
  report +=
    "3. **Use environment-specific values** - Different secrets for dev/staging/production\\n";
  report +=
    "4. **Monitor for exposed secrets** - Use tools to scan for accidentally committed secrets\\n";
  report +=
    "5. **Implement secret management** - Use proper secret management systems in production\\n\\n";

  return report;
}

/**
 * Initialize environment security validation
 */
export function initializeEnvironmentSecurity(): void {
  if (process.env.NODE_ENV === "development") {
    const validation = validateEnvironmentSecurity();

    if (!validation.isSecure) {
      console.warn("🔒 Environment Security Issues Detected:");

      for (const violation of validation.violations) {
        if (violation.severity === "critical") {
          console.error(`❌ CRITICAL: ${violation.message}`);
        } else if (violation.severity === "high") {
          console.warn(`⚠️  HIGH: ${violation.message}`);
        }
      }

      console.log(
        "\\n💡 Run generateEnvironmentSecurityReport() for detailed analysis"
      );
    }
  }

  // Log security status in production (without sensitive details)
  if (process.env.NODE_ENV === "production") {
    const validation = validateEnvironmentSecurity();
    const criticalIssues = validation.violations.filter(
      v => v.severity === "critical"
    ).length;

    if (criticalIssues > 0) {
      console.error(
        `🚨 Production environment has ${criticalIssues} critical security issues`
      );
    } else {
      console.log("🔒 Production environment security validation passed");
    }
  }
}

// Auto-initialize when module is imported
initializeEnvironmentSecurity();
