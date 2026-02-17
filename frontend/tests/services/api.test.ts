/**
 * API Service Tests
 * Tests the API instance configuration and CSRF interceptor
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

// Track interceptor registrations - must use vi.hoisted for mock factory references
const { mockRequestUse, mockResponseUse } = vi.hoisted(() => ({
  mockRequestUse: vi.fn(),
  mockResponseUse: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    create: vi.fn((config: Record<string, unknown>) => ({
      defaults: { ...config },
      interceptors: {
        request: { use: mockRequestUse },
        response: { use: mockResponseUse },
      },
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    })),
  },
}));

import { api } from '../../src/services/api';

describe('API Service', () => {
  afterEach(() => {
    document.cookie = 'csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  });

  it('creates axios instance with correct config', () => {
    expect(api).toBeDefined();
    expect(api.defaults.baseURL).toBe('/api/v1');
    expect(api.defaults.withCredentials).toBe(true);
  });

  it('registers request and response interceptors', () => {
    expect(mockRequestUse).toHaveBeenCalled();
    expect(mockResponseUse).toHaveBeenCalled();
  });

  it('adds CSRF token to request headers', () => {
    document.cookie = 'csrftoken=test-csrf-token';

    // Get the request interceptor handler (first arg of first call)
    const requestHandler = mockRequestUse.mock.calls[0][0];
    const config = { headers: {} as Record<string, string> };
    const result = requestHandler(config);

    expect(result.headers['X-CSRFToken']).toBe('test-csrf-token');
  });

  it('does not add CSRF token if cookie is missing', () => {
    document.cookie = 'csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

    const requestHandler = mockRequestUse.mock.calls[0][0];
    const config = { headers: {} as Record<string, string> };
    const result = requestHandler(config);

    expect(result.headers['X-CSRFToken']).toBeUndefined();
  });
});
