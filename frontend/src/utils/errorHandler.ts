/**
 * Error Handler Utility
 * Extracts error messages from various backend response formats
 */
import type { AxiosError } from 'axios';

interface BackendErrorResponse {
  detail?: string;
  error?: string;
  message?: string;
  non_field_errors?: string[];
  [key: string]: any; // For field-specific errors
}

/**
 * Extract error message from backend response
 * Handles multiple backend error formats:
 * - { detail: "..." }
 * - { error: "..." }
 * - { message: "..." }
 * - { non_field_errors: ["..."] }
 * - { field_name: ["..."] }
 * 
 * @param error - Axios error object
 * @param defaultMessage - Fallback message if no error found
 * @returns Extracted error message
 */
export const extractErrorMessage = (
  error: AxiosError<BackendErrorResponse> | AxiosError<any> | any,
  defaultMessage: string = 'An unexpected error occurred'
): string => {
  const data = error.response?.data;

  if (!data) {
    return error.message || defaultMessage;
  }

  // Check for common error fields
  if (data.detail) return data.detail;
  if (data.error) return data.error;
  if (data.message) return data.message;

  // Check for non_field_errors (DRF serializer errors)
  if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
    return data.non_field_errors[0] || defaultMessage;
  }

  // Check for field-specific errors
  const fieldErrors: string[] = [];
  Object.keys(data).forEach((key) => {
    if (Array.isArray(data[key])) {
      const fieldError = data[key][0];
      if (fieldError) {
        fieldErrors.push(`${key}: ${fieldError}`);
      }
    } else if (typeof data[key] === 'string') {
      fieldErrors.push(`${key}: ${data[key]}`);
    }
  });

  if (fieldErrors.length > 0) {
    return fieldErrors.join('; ');
  }

  return defaultMessage;
};

/**
 * Format validation errors for display
 * @param error - Axios error object
 * @returns Array of error messages
 */
export const extractValidationErrors = (
  error: AxiosError<BackendErrorResponse>
): string[] => {
  const data = error.response?.data;
  const errors: string[] = [];

  if (!data) {
    return [error.message || 'Validation failed'];
  }

  // Handle non_field_errors
  if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
    errors.push(...data.non_field_errors);
  }

  // Handle field-specific errors
  Object.keys(data).forEach((key) => {
    if (key === 'non_field_errors') return; // Already handled

    if (Array.isArray(data[key])) {
      data[key].forEach((msg: string) => {
        errors.push(`${key}: ${msg}`);
      });
    } else if (typeof data[key] === 'string') {
      errors.push(`${key}: ${data[key]}`);
    }
  });

  return errors.length > 0 ? errors : ['Validation failed'];
};
