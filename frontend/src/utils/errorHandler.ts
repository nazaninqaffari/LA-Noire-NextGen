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
  // Human-readable field name mapping
  const fieldLabels: Record<string, string> = {
    username: 'Username',
    email: 'Email',
    password: 'Password',
    password_confirm: 'Password confirmation',
    phone_number: 'Phone number',
    national_id: 'National ID',
    first_name: 'First name',
    last_name: 'Last name',
    title: 'Title',
    description: 'Description',
    crime_level: 'Crime level',
    complainant_statement: 'Statement',
    decision: 'Decision',
    rejection_reason: 'Rejection reason',
    case: 'Case',
    evidence_type: 'Evidence type',
    license_plate: 'License plate',
    serial_number: 'Serial number',
    owner_full_name: 'Owner name',
    document_type: 'Document type',
    witness: 'Witness',
    witness_name: 'Witness name',
    transcript: 'Transcript',
    images: 'Images',
    image: 'Image',
    model: 'Vehicle model',
    color: 'Color',
    coroner_analysis: 'Coroner analysis',
    person: 'Person',
    reason: 'Reason',
    photo: 'Photo',
    status: 'Status',
  };

  Object.keys(data).forEach((key) => {
    const label = fieldLabels[key] || key.replace(/_/g, ' ');
    if (Array.isArray(data[key])) {
      const fieldError = data[key][0];
      if (typeof fieldError === 'string' && fieldError.trim()) {
        fieldErrors.push(`${label}: ${fieldError}`);
      }
    } else if (typeof data[key] === 'string' && data[key].trim()) {
      fieldErrors.push(`${label}: ${data[key]}`);
    } else if (typeof data[key] === 'object' && data[key] !== null) {
      // Handle nested error objects
      Object.entries(data[key]).forEach(([subKey, subVal]) => {
        const subLabel = fieldLabels[subKey] || subKey.replace(/_/g, ' ');
        if (Array.isArray(subVal) && subVal[0]) {
          fieldErrors.push(`${label} → ${subLabel}: ${subVal[0]}`);
        } else if (typeof subVal === 'string') {
          fieldErrors.push(`${label} → ${subLabel}: ${subVal}`);
        }
      });
    }
  });

  if (fieldErrors.length > 0) {
    return fieldErrors.join('. ');
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

  // Handle field-specific errors with readable labels
  const fieldLabels: Record<string, string> = {
    username: 'Username', email: 'Email', password: 'Password',
    password_confirm: 'Password confirmation', phone_number: 'Phone number',
    national_id: 'National ID', first_name: 'First name', last_name: 'Last name',
  };

  Object.keys(data).forEach((key) => {
    if (key === 'non_field_errors') return;
    const label = fieldLabels[key] || key.replace(/_/g, ' ');

    if (Array.isArray(data[key])) {
      data[key].forEach((msg: string) => {
        if (typeof msg === 'string') errors.push(`${label}: ${msg}`);
      });
    } else if (typeof data[key] === 'string') {
      errors.push(`${label}: ${data[key]}`);
    }
  });

  return errors.length > 0 ? errors : ['Validation failed'];
};
