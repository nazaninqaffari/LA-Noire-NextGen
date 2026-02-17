/**
 * Test utilities and helpers
 * Common testing utilities for React components
 */
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

/**
 * Render component with Router wrapper
 * @param {React.Component} ui - Component to render
 * @param {Object} options - Render options
 * @returns {Object} Testing library render result
 */
export function renderWithRouter(ui, options = {}) {
  return render(ui, {
    wrapper: ({ children }) => <BrowserRouter>{children}</BrowserRouter>,
    ...options,
  });
}

/**
 * Mock API response helper
 * @param {any} data - Response data
 * @param {number} status - HTTP status code
 * @returns {Object} Mock response
 */
export function mockApiResponse(data, status = 200) {
  return {
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: {},
  };
}

/**
 * Mock API error helper
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @returns {Error} Mock error
 */
export function mockApiError(message, status = 400) {
  const error = new Error(message);
  error.response = {
    data: { detail: message },
    status,
    statusText: 'Error',
  };
  return error;
}

/**
 * Wait for element helper
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after delay
 */
export function wait(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mock user data generator
 * @param {Object} overrides - Override default values
 * @returns {Object} Mock user object
 */
export function createMockUser(overrides = {}) {
  return {
    id: 1,
    username: 'testuser',
    email: 'test@lapd.gov',
    first_name: 'Cole',
    last_name: 'Phelps',
    role: {
      id: 1,
      name: 'Detective',
      hierarchy_level: 5,
    },
    ...overrides,
  };
}

/**
 * Mock case data generator
 * @param {Object} overrides - Override default values
 * @returns {Object} Mock case object
 */
export function createMockCase(overrides = {}) {
  return {
    id: 1,
    case_id: 'CASE-001',
    title: 'Test Investigation',
    description: 'A test case for investigation',
    status: 'in_progress',
    crime_level: 2,
    assigned_to: createMockUser(),
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Mock evidence data generator
 * @param {Object} overrides - Override default values
 * @returns {Object} Mock evidence object
 */
export function createMockEvidence(overrides = {}) {
  return {
    id: 1,
    evidence_type: 'testimony',
    title: 'Witness Statement',
    description: 'Statement from witness',
    case: 1,
    registered_by: createMockUser(),
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Mock suspect data generator
 * @param {Object} overrides - Override default values
 * @returns {Object} Mock suspect object
 */
export function createMockSuspect(overrides = {}) {
  return {
    id: 1,
    name: 'John Doe',
    status: 'under_pursuit',
    danger_score: 45,
    case: 1,
    crime_level: 2,
    ...overrides,
  };
}

export default {
  renderWithRouter,
  mockApiResponse,
  mockApiError,
  wait,
  createMockUser,
  createMockCase,
  createMockEvidence,
  createMockSuspect,
};
