/**
 * Advanced Form Validation Hook
 * Production-grade form validation with real-time feedback
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useFormErrorHandler } from "./use-form-error-handler";

export interface ValidationRule {
  type: "required" | "email" | "url" | "min" | "max" | "pattern" | "custom";
  value?: any;
  message: string;
  validator?: (
    value: any,
    formData?: Record<string, any>
  ) => boolean | Promise<boolean>;
}

export interface CrossFieldRule {
  fields: string[];
  validator: (values: Record<string, any>) => boolean | Promise<boolean>;
  message: string;
}

export interface AsyncValidationRule {
  field: string;
  validator: (value: any) => Promise<{ isValid: boolean; message?: string }>;
  debounceMs?: number;
}

export interface ValidationConfig {
  fields: Record<string, ValidationRule[]>;
  crossFieldValidation?: CrossFieldRule[];
  asyncValidation?: AsyncValidationRule[];
  validationTiming: "onBlur" | "onChange" | "onSubmit" | "hybrid";
  debounceMs?: number;
}

export interface FieldValidationResult {
  isValid: boolean;
  errors: string[];
  isValidating: boolean;
  isDirty: boolean;
  isTouched: boolean;
}

export interface FormValidationState {
  isValid: boolean;
  isValidating: boolean;
  errors: Record<string, string[]>;
  fields: Record<string, FieldValidationResult>;
  touchedFields: Set<string>;
  dirtyFields: Set<string>;
}

/**
 * Advanced form validation with real-time feedback
 */
export function useAdvancedFormValidation<T extends Record<string, any>>(
  config: ValidationConfig,
  initialData: T = {} as T
) {
  const errorHandler = useFormErrorHandler({
    enableRecovery: false, // Validation errors don't need recovery
    autoHideDelay: 0, // Validation errors persist until fixed
  });

  const [formData, setFormData] = useState<T>(initialData);
  const [validationState, setValidationState] = useState<FormValidationState>({
    isValid: false,
    isValidating: false,
    errors: {},
    fields: {},
    touchedFields: new Set(),
    dirtyFields: new Set(),
  });

  const validationTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const asyncValidationCache = useRef<Map<string, { value: any; result: any }>>(
    new Map()
  );
  const validateFieldWithRulesRef = useRef<
    ((fieldName: string, value: any) => Promise<void>) | null
  >(null);

  /**
   * Built-in validation functions
   */
  const validators = {
    required: (value: any) => {
      if (typeof value === "string") return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return value !== null && value !== undefined && value !== "";
    },

    email: (value: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return !value || emailRegex.test(value);
    },

    url: (value: string) => {
      try {
        if (!value) return true; // Empty URLs are valid (unless required)
        new URL(value.startsWith("http") ? value : `https://${value}`);
        return true;
      } catch {
        return false;
      }
    },

    min: (value: any, minValue: number) => {
      if (typeof value === "string") return value.length >= minValue;
      if (typeof value === "number") return value >= minValue;
      if (Array.isArray(value)) return value.length >= minValue;
      return true;
    },

    max: (value: any, maxValue: number) => {
      if (typeof value === "string") return value.length <= maxValue;
      if (typeof value === "number") return value <= maxValue;
      if (Array.isArray(value)) return value.length <= maxValue;
      return true;
    },

    pattern: (value: string, pattern: RegExp) => {
      return !value || pattern.test(value);
    },
  };

  /**
   * Validate individual field
   */
  const validateField = useCallback(
    async (
      fieldName: string,
      value: any,
      rules: ValidationRule[]
    ): Promise<string[]> => {
      const errors: string[] = [];

      for (const rule of rules) {
        let isValid = false;

        try {
          switch (rule.type) {
            case "required":
              isValid = validators.required(value);
              break;
            case "email":
              isValid = validators.email(value);
              break;
            case "url":
              isValid = validators.url(value);
              break;
            case "min":
              isValid = validators.min(value, rule.value);
              break;
            case "max":
              isValid = validators.max(value, rule.value);
              break;
            case "pattern":
              isValid = validators.pattern(value, rule.value);
              break;
            case "custom":
              if (rule.validator) {
                isValid = await rule.validator(value, formData);
              }
              break;
          }

          if (!isValid) {
            errors.push(rule.message);
          }
        } catch (error) {
          console.error(`Validation error for field ${fieldName}:`, error);
          errors.push("Validation failed");
        }
      }

      return errors;
    },
    [formData]
  );

  /**
   * Validate cross-field rules
   */
  const validateCrossFields = useCallback(
    async (rules: CrossFieldRule[]): Promise<Record<string, string[]>> => {
      const crossFieldErrors: Record<string, string[]> = {};

      for (const rule of rules) {
        try {
          const values = rule.fields.reduce(
            (acc, field) => {
              acc[field] = formData[field];
              return acc;
            },
            {} as Record<string, any>
          );

          const isValid = await rule.validator(values);

          if (!isValid) {
            // Add error to all involved fields
            rule.fields.forEach(field => {
              if (!crossFieldErrors[field]) {
                crossFieldErrors[field] = [];
              }
              crossFieldErrors[field].push(rule.message);
            });
          }
        } catch (error) {
          console.error("Cross-field validation error:", error);
          rule.fields.forEach(field => {
            if (!crossFieldErrors[field]) {
              crossFieldErrors[field] = [];
            }
            crossFieldErrors[field].push("Cross-field validation failed");
          });
        }
      }

      return crossFieldErrors;
    },
    [formData]
  );

  /**
   * Perform async validation
   */
  const performAsyncValidation = useCallback(
    async (
      fieldName: string,
      value: any,
      rule: AsyncValidationRule
    ): Promise<{ isValid: boolean; message?: string }> => {
      // Check cache first
      const cacheKey = `${fieldName}:${JSON.stringify(value)}`;
      const cached = asyncValidationCache.current.get(cacheKey);
      if (cached && cached.value === value) {
        return cached.result;
      }

      try {
        const result = await rule.validator(value);

        // Cache the result
        asyncValidationCache.current.set(cacheKey, { value, result });

        return result;
      } catch (error) {
        console.error(`Async validation error for ${fieldName}:`, error);
        return {
          isValid: false,
          message: "Async validation failed",
        };
      }
    },
    []
  );

  /**
   * Debounced validation function
   */
  const debouncedValidate = useCallback(
    (
      fieldName: string,
      value: any,
      delay: number = config.debounceMs || 300
    ) => {
      // Clear existing timeout
      const existingTimeout = validationTimeouts.current.get(fieldName);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set new timeout - use a ref to avoid circular dependency
      const timeout = setTimeout(() => {
        // Call validateFieldWithRules through ref to avoid circular dependency
        if (validateFieldWithRulesRef.current) {
          validateFieldWithRulesRef.current(fieldName, value);
        }
      }, delay);

      validationTimeouts.current.set(fieldName, timeout);
    },
    [config.debounceMs]
  );

  /**
   * Validate field with all applicable rules
   */
  const validateFieldWithRules = useCallback(
    async (fieldName: string, value: any) => {
      // Update validation state to show validating
      setValidationState(prev => ({
        ...prev,
        fields: {
          ...prev.fields,
          [fieldName]: {
            isValid: prev.fields[fieldName]?.isValid ?? false,
            errors: prev.fields[fieldName]?.errors ?? [],
            isDirty: prev.fields[fieldName]?.isDirty ?? false,
            isTouched: prev.fields[fieldName]?.isTouched ?? false,
            isValidating: true,
          },
        },
      }));

      const fieldRules = config.fields[fieldName] || [];
      const fieldErrors = await validateField(fieldName, value, fieldRules);

      // Perform async validation if configured
      const asyncRule = config.asyncValidation?.find(
        rule => rule.field === fieldName
      );
      if (asyncRule && value) {
        const asyncResult = await performAsyncValidation(
          fieldName,
          value,
          asyncRule
        );
        if (!asyncResult.isValid && asyncResult.message) {
          fieldErrors.push(asyncResult.message);
        }
      }

      // Update validation state
      setValidationState(prev => {
        const newFields = {
          ...prev.fields,
          [fieldName]: {
            isValid: fieldErrors.length === 0,
            errors: fieldErrors,
            isValidating: false,
            isDirty: prev.dirtyFields.has(fieldName),
            isTouched: prev.touchedFields.has(fieldName),
          },
        };

        const newErrors = {
          ...prev.errors,
          [fieldName]: fieldErrors,
        };

        // Calculate overall form validity
        const allFieldsValid = Object.values(newFields).every(
          field => field.isValid
        );
        const noGlobalErrors = Object.values(newErrors).every(
          errors => errors.length === 0
        );

        return {
          ...prev,
          fields: newFields,
          errors: newErrors,
          isValid: allFieldsValid && noGlobalErrors,
        };
      });

      // Update error handler with loop prevention
      if (fieldErrors.length > 0) {
        // Prevent infinite loops by checking if these errors already exist
        const existingErrors = errorHandler.getFieldErrors(fieldName);
        const newErrors = fieldErrors.filter(
          error =>
            !existingErrors.some(
              existing => existing.category.userMessage.message === error
            )
        );

        newErrors.forEach(error => {
          errorHandler.addError(new Error(error), fieldName, {
            validationType: "field",
            fieldName,
            preventLoop: true,
          });
        });
      } else {
        // Clear field errors without triggering validation
        const fieldErrors = errorHandler.getFieldErrors(fieldName);
        fieldErrors.forEach(error => {
          errorHandler.removeError(error.id);
        });
      }
    },
    [config, validateField, performAsyncValidation, errorHandler]
  );

  // Set the ref after function is defined
  validateFieldWithRulesRef.current = validateFieldWithRules;

  /**
   * Validate entire form
   */
  const validateForm = useCallback(async (): Promise<boolean> => {
    setValidationState(prev => ({ ...prev, isValidating: true }));

    try {
      // Validate all fields
      const fieldValidationPromises = Object.keys(config.fields).map(
        fieldName => validateFieldWithRules(fieldName, formData[fieldName])
      );

      await Promise.all(fieldValidationPromises);

      // Validate cross-field rules
      if (config.crossFieldValidation) {
        const crossFieldErrors = await validateCrossFields(
          config.crossFieldValidation
        );

        // Add cross-field errors with loop prevention
        Object.entries(crossFieldErrors).forEach(([fieldName, errors]) => {
          const existingErrors = errorHandler.getFieldErrors(fieldName);
          const newErrors = errors.filter(
            error =>
              !existingErrors.some(
                existing => existing.category.userMessage.message === error
              )
          );

          newErrors.forEach(error => {
            errorHandler.addError(new Error(error), fieldName, {
              validationType: "cross-field",
              fieldName,
              preventLoop: true,
            });
          });
        });
      }

      setValidationState(prev => ({ ...prev, isValidating: false }));

      // Return overall validity
      const hasErrors = Object.values(validationState.errors).some(
        errors => errors.length > 0
      );
      return !hasErrors;
    } catch (error) {
      console.error("Form validation error:", error);
      setValidationState(prev => ({ ...prev, isValidating: false }));
      return false;
    }
  }, [
    config,
    formData,
    validateFieldWithRules,
    validateCrossFields,
    validationState.errors,
    errorHandler,
  ]);

  /**
   * Update field value with validation
   */
  const updateField = useCallback(
    (fieldName: string, value: any) => {
      setFormData(prev => ({
        ...prev,
        [fieldName]: value,
      }));

      // Mark field as dirty and touched
      setValidationState(prev => ({
        ...prev,
        dirtyFields: new Set([...prev.dirtyFields, fieldName]),
        touchedFields: new Set([...prev.touchedFields, fieldName]),
      }));

      // Trigger validation based on timing configuration
      if (
        config.validationTiming === "onChange" ||
        config.validationTiming === "hybrid"
      ) {
        debouncedValidate(fieldName, value);
      }
    },
    [config.validationTiming, debouncedValidate]
  );

  /**
   * Handle field blur event
   */
  const handleFieldBlur = useCallback(
    (fieldName: string) => {
      setValidationState(prev => ({
        ...prev,
        touchedFields: new Set([...prev.touchedFields, fieldName]),
      }));

      if (
        config.validationTiming === "onBlur" ||
        config.validationTiming === "hybrid"
      ) {
        validateFieldWithRules(fieldName, formData[fieldName]);
      }
    },
    [config.validationTiming, validateFieldWithRules, formData]
  );

  /**
   * Reset form validation state
   */
  const resetValidation = useCallback(() => {
    setValidationState({
      isValid: false,
      isValidating: false,
      errors: {},
      fields: {},
      touchedFields: new Set(),
      dirtyFields: new Set(),
    });

    errorHandler.clearAllErrors();

    // Clear all timeouts
    validationTimeouts.current.forEach(timeout => clearTimeout(timeout));
    validationTimeouts.current.clear();
  }, [errorHandler]);

  /**
   * Get field validation status
   */
  const getFieldStatus = useCallback(
    (fieldName: string) => {
      return (
        validationState.fields[fieldName] || {
          isValid: true,
          errors: [],
          isValidating: false,
          isDirty: false,
          isTouched: false,
        }
      );
    },
    [validationState.fields]
  );

  /**
   * Check if field should show errors
   */
  const shouldShowFieldErrors = useCallback(
    (fieldName: string): boolean => {
      const field = getFieldStatus(fieldName);

      switch (config.validationTiming) {
        case "onBlur":
          return field.isTouched && field.errors.length > 0;
        case "onChange":
          return field.isDirty && field.errors.length > 0;
        case "hybrid":
          return (field.isTouched || field.isDirty) && field.errors.length > 0;
        case "onSubmit":
          return false; // Only show on submit
        default:
          return field.errors.length > 0;
      }
    },
    [config.validationTiming, getFieldStatus]
  );

  /**
   * Clean up timeouts on unmount
   */
  useEffect(() => {
    return () => {
      validationTimeouts.current.forEach(timeout => clearTimeout(timeout));
      validationTimeouts.current.clear();
    };
  }, []);

  return {
    // Form data
    formData,
    setFormData,
    updateField,

    // Validation state
    ...validationState,

    // Validation functions
    validateForm,
    validateFieldWithRules,
    resetValidation,

    // Field helpers
    getFieldStatus,
    shouldShowFieldErrors,
    handleFieldBlur,

    // Error handling integration
    errorHandler,

    // Computed properties
    hasAnyErrors: Object.values(validationState.errors).some(
      errors => errors.length > 0
    ),
    touchedFieldsArray: Array.from(validationState.touchedFields),
    dirtyFieldsArray: Array.from(validationState.dirtyFields),
    validationProgress: {
      total: Object.keys(config.fields).length,
      validated: Object.keys(validationState.fields).length,
      valid: Object.values(validationState.fields).filter(
        field => field.isValid
      ).length,
    },
  };
}
