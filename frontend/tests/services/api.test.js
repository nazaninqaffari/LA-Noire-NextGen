/**
 * API Service Tests
 * Tests for the API service configuration and interceptors
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { api } from '../../src/services/api';

// Mock axios
vi.mock('axios');

describe('API Service', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Mock axios.create to return our api instance
    axios.create.mockReturnValue(api);
  });

  afterEach(() => {
    // Clean up cookies
    document.cookie = 'csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  });

  it('creates axios instance with correct config', () => {
    expect(api.defaults.baseURL).toBe('/api');
    expect(api.defaults.withCredentials).toBe(true);
    expect(api.defaults.headers['Content-Type']).toBe('application/json');
  });

  it('adds CSRF token to request headers', async () => {
    // Set CSRF token cookie
    document.cookie = 'csrftoken=test-csrf-token';
    
    // Create a mock request config
    const config = {
      headers: {},
    };
    
    // Get the request interceptor
    const requestInterceptor = api.interceptors.request.handlers[0];
    const modifiedConfig = requestInterceptor.fulfilled(config);
    
    expect(modifiedConfig.headers['X-CSRFToken']).toBe('test-csrf-token');
  });

  it('does not add CSRF token if cookie is missing', async () => {
    // Ensure no CSRF cookie
    document.cookie = 'csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    const config = {
      headers: {},
    };
    
    const requestInterceptor = api.interceptors.request.handlers[0];
    const modifiedConfig = requestInterceptor.fulfilled(config);
    
    expect(modifiedConfig.headers['X-CSRFToken']).toBeUndefined();
  });
});
