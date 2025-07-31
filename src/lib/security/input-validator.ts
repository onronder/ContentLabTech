/**
 * Comprehensive Input Validation and Sanitization
 * Production-grade security for all incoming requests
 */

import { NextRequest } from "next/server";
import DOMPurify from "isomorphic-dompurify";

export interface ValidationRule {
  pattern?: RegExp;
  minLength?: number;
  maxLength: number;
  required?: boolean;
  allowedValues?: string[];
  sanitize?: (value: string) => string;
  validate?: (value: string) => boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  sanitizedData?: Record<string, unknown>;
}

export class InputValidator {
  private static readonly SUSPICIOUS_PATTERNS = [
    // Script injection
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    /onclick\s*=/gi,
    /onmouseover\s*=/gi,

    // SQL injection patterns
    /(\bunion\b.*\bselect\b)|(\bselect\b.*\bunion\b)/gi,
    /(\bdrop\b\s+\btable\b)|(\bdelete\b\s+\bfrom\b)/gi,
    /(\binsert\b\s+\binto\b)|(\bupdate\b.*\bset\b)/gi,
    /(;|\-\-|\#)/g,

    // Path traversal
    /\.\.\/|\.\.\\|\.\.\%2f|\.\.\%5c/gi,

    // Command injection
    /(\||\&|\;|\$\(|\`)/g,

    // LDAP injection
    /(\*|\(|\)|\&|\||!)/g,
  ];

  private static readonly VALIDATION_RULES: Record<string, ValidationRule> = {
    email: {
      pattern:
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
      maxLength: 254,
      required: true,
      sanitize: value => value.toLowerCase().trim(),
    },
    password: {
      pattern:
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      minLength: 8,
      maxLength: 128,
      required: true,
    },
    username: {
      pattern: /^[a-zA-Z0-9_-]+$/,
      minLength: 3,
      maxLength: 50,
      required: true,
      sanitize: value => value.toLowerCase().trim(),
    },
    name: {
      pattern: /^[a-zA-Z\s'-]+$/,
      minLength: 1,
      maxLength: 100,
      sanitize: value => DOMPurify.sanitize(value.trim()),
    },
    url: {
      pattern:
        /^https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w\/_.])*(?:\?(?:[\w&=%.])*)?(?:\#(?:[\w.])*)?)?$/,
      maxLength: 2048,
      sanitize: value => encodeURI(value.trim()),
    },
    path: {
      pattern: /^[a-zA-Z0-9\-._~:\/?#[\]@!$&'()*+,;=%]+$/,
      maxLength: 2048,
      sanitize: value => encodeURIComponent(value.trim()),
    },
    slug: {
      pattern: /^[a-z0-9-]+$/,
      minLength: 1,
      maxLength: 100,
      sanitize: value =>
        value
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9-]/g, "-"),
    },
    content: {
      maxLength: 50000, // 50KB
      sanitize: value =>
        DOMPurify.sanitize(value, {
          ALLOWED_TAGS: [
            "p",
            "br",
            "strong",
            "em",
            "u",
            "ol",
            "ul",
            "li",
            "a",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
          ],
          ALLOWED_ATTR: ["href", "title", "target"],
        }),
    },
    json: {
      maxLength: 10000, // 10KB
      validate: value => {
        try {
          JSON.parse(value);
          return true;
        } catch {
          return false;
        }
      },
    },
    phone: {
      pattern: /^\+?[1-9]\d{1,14}$/,
      maxLength: 20,
      sanitize: value => value.replace(/[^\d+]/g, ""),
    },
    uuid: {
      pattern:
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      maxLength: 36,
      required: true,
    },
    apiKey: {
      pattern: /^[a-zA-Z0-9_-]+$/,
      minLength: 20,
      maxLength: 100,
      required: true,
    },
  };

  static validateField(
    fieldName: string,
    value: unknown,
    ruleName?: keyof typeof InputValidator.VALIDATION_RULES
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // Convert to string for validation
    const stringValue = String(value || "");

    // Get validation rule
    const rule = ruleName ? this.VALIDATION_RULES[ruleName] : null;

    if (!rule) {
      // Basic validation without specific rules
      if (this.containsSuspiciousPatterns(stringValue)) {
        errors.push({
          field: fieldName,
          message: "Input contains potentially malicious content",
          code: "SUSPICIOUS_CONTENT",
        });
      }

      return {
        valid: errors.length === 0,
        errors,
        sanitizedData: { [fieldName]: this.basicSanitize(stringValue) },
      };
    }

    // Required field validation
    if (rule.required && (!stringValue || stringValue.trim() === "")) {
      errors.push({
        field: fieldName,
        message: `${fieldName} is required`,
        code: "REQUIRED_FIELD",
      });
    }

    // Skip further validation if empty and not required
    if (!stringValue && !rule.required) {
      return { valid: true, errors: [], sanitizedData: { [fieldName]: "" } };
    }

    // Length validation
    if (rule.minLength && stringValue.length < rule.minLength) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be at least ${rule.minLength} characters`,
        code: "MIN_LENGTH",
      });
    }

    if (stringValue.length > rule.maxLength) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must not exceed ${rule.maxLength} characters`,
        code: "MAX_LENGTH",
      });
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(stringValue)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} format is invalid`,
        code: "INVALID_FORMAT",
      });
    }

    // Allowed values validation
    if (rule.allowedValues && !rule.allowedValues.includes(stringValue)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be one of: ${rule.allowedValues.join(", ")}`,
        code: "INVALID_VALUE",
      });
    }

    // Custom validation
    if (rule.validate && !rule.validate(stringValue)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} is invalid`,
        code: "CUSTOM_VALIDATION_FAILED",
      });
    }

    // Suspicious content check
    if (this.containsSuspiciousPatterns(stringValue)) {
      errors.push({
        field: fieldName,
        message: "Input contains potentially malicious content",
        code: "SUSPICIOUS_CONTENT",
      });
    }

    // Sanitize the value
    let sanitizedValue = stringValue;
    if (rule.sanitize) {
      sanitizedValue = rule.sanitize(stringValue);
    } else {
      sanitizedValue = this.basicSanitize(stringValue);
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitizedData: { [fieldName]: sanitizedValue },
    };
  }

  static validateObject(
    data: Record<string, unknown>,
    rules: Record<string, keyof typeof InputValidator.VALIDATION_RULES>
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const sanitizedData: Record<string, unknown> = {};

    for (const [fieldName, ruleName] of Object.entries(rules)) {
      const fieldValue = data[fieldName];
      const result = this.validateField(fieldName, fieldValue, ruleName);

      errors.push(...result.errors);
      if (result.sanitizedData) {
        Object.assign(sanitizedData, result.sanitizedData);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitizedData,
    };
  }

  static validateRequest(request: NextRequest): ValidationResult {
    const errors: ValidationError[] = [];
    const { pathname, searchParams } = request.nextUrl;

    // Validate URL length
    if (request.url.length > 2048) {
      errors.push({
        field: "url",
        message: "Request URL is too long",
        code: "URL_TOO_LONG",
      });
    }

    // Validate pathname
    if (this.containsSuspiciousPatterns(pathname)) {
      errors.push({
        field: "pathname",
        message: "Request path contains suspicious content",
        code: "SUSPICIOUS_PATH",
      });
    }

    // Validate query parameters
    for (const [key, value] of searchParams.entries()) {
      if (
        this.containsSuspiciousPatterns(key) ||
        this.containsSuspiciousPatterns(value)
      ) {
        errors.push({
          field: "query_params",
          message: `Query parameter ${key} contains suspicious content`,
          code: "SUSPICIOUS_QUERY_PARAM",
        });
      }
    }

    // Validate headers
    const dangerousHeaders = ["x-forwarded-host", "host"];
    for (const headerName of dangerousHeaders) {
      const headerValue = request.headers.get(headerName);
      if (headerValue && this.containsSuspiciousPatterns(headerValue)) {
        errors.push({
          field: "headers",
          message: `Header ${headerName} contains suspicious content`,
          code: "SUSPICIOUS_HEADER",
        });
      }
    }

    // Check for oversized headers
    let totalHeaderSize = 0;
    for (const [key, value] of request.headers.entries()) {
      totalHeaderSize += key.length + value.length;
    }

    if (totalHeaderSize > 8192) {
      // 8KB limit
      errors.push({
        field: "headers",
        message: "Request headers exceed size limit",
        code: "HEADERS_TOO_LARGE",
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private static containsSuspiciousPatterns(input: string): boolean {
    return this.SUSPICIOUS_PATTERNS.some(pattern => pattern.test(input));
  }

  private static basicSanitize(input: string): string {
    // Remove null bytes
    let sanitized = input.replace(/\0/g, "");

    // Normalize unicode
    sanitized = sanitized.normalize("NFKC");

    // Remove control characters except common whitespace
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

    return sanitized;
  }

  // Add custom validation rule
  static addValidationRule(name: string, rule: ValidationRule): void {
    this.VALIDATION_RULES[name] = rule;
  }

  // Get validation rule
  static getValidationRule(name: string): ValidationRule | undefined {
    return this.VALIDATION_RULES[name];
  }

  // Validate file upload
  static validateFileUpload(
    file: File,
    options: {
      maxSize?: number;
      allowedTypes?: string[];
      allowedExtensions?: string[];
    } = {}
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const {
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
      ],
      allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"],
    } = options;

    // Check file size
    if (file.size > maxSize) {
      errors.push({
        field: "file",
        message: `File size exceeds limit of ${maxSize / (1024 * 1024)}MB`,
        code: "FILE_TOO_LARGE",
      });
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      errors.push({
        field: "file",
        message: `File type ${file.type} is not allowed`,
        code: "INVALID_FILE_TYPE",
      });
    }

    // Check file extension
    const extension = file.name
      .toLowerCase()
      .substring(file.name.lastIndexOf("."));
    if (!allowedExtensions.includes(extension)) {
      errors.push({
        field: "file",
        message: `File extension ${extension} is not allowed`,
        code: "INVALID_FILE_EXTENSION",
      });
    }

    // Check filename for suspicious patterns
    if (this.containsSuspiciousPatterns(file.name)) {
      errors.push({
        field: "file",
        message: "Filename contains suspicious content",
        code: "SUSPICIOUS_FILENAME",
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export default InputValidator;
