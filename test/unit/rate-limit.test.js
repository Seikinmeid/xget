import { describe, expect, it, vi } from 'vitest';
import { handleRequest } from '../../src/app/handle-request.js';

/**
 * Rate limit tests.
 *
 * The limit is OPT-IN: without the RATE_LIMITER binding, behavior is
 * unchanged (covered by the existing suite). With the binding, requests
 * beyond the limit within the window get 429 with Retry-After.
 */
describe('Xget Rate Limit', () => {
  const ctx = { waitUntil: () => {}, passThroughOnException: () => {} };

  /**
   * Builds a fake Rate Limiting binding.
   * @param {boolean} overLimit Whether the fake limiter reports being over the limit.
   */
  function makeLimiter(overLimit) {
    return {
      limit: vi.fn(async () => ({
        success: !overLimit,
        reset: 42
      }))
    };
  }

  it('passes requests through when under the limit', async () => {
    const env = { RATE_LIMITER: makeLimiter(false) };
    const response = await handleRequest(
      new Request('https://example.com/gh/microsoft/vscode/archive/refs/heads/main.zip'),
      env,
      ctx
    );
    expect(response.status).not.toBe(429);
    expect(env.RATE_LIMITER.limit).toHaveBeenCalledWith({ key: 'global' });
  });

  it('returns 429 with Retry-After when over the limit', async () => {
    const env = { RATE_LIMITER: makeLimiter(true) };
    const response = await handleRequest(
      new Request('https://example.com/gh/microsoft/vscode/archive/refs/heads/main.zip'),
      env,
      ctx
    );
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('42');
  });

  it('keeps original behavior when RATE_LIMITER is not configured', async () => {
    const response = await handleRequest(
      new Request('https://example.com/gh/microsoft/vscode/archive/refs/heads/main.zip'),
      {},
      ctx
    );
    expect(response.status).not.toBe(429);
  });
});
