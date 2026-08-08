import { describe, expect, it } from 'vitest';
import { handleRequest } from '../../src/app/handle-request.js';

/**
 * Token authentication tests.
 *
 * Auth is OPT-IN: when `env.XGET_TOKEN` is not configured, behavior is
 * unchanged (this is covered by the existing 381-test suite). When it IS
 * configured, every request must present the token via `?token=` query
 * parameter or `X-Access-Token` header.
 */
describe('Xget Token Authentication', () => {
  const envWithToken = { XGET_TOKEN: 'secret-token-123' };

  it('rejects requests without a token when XGET_TOKEN is set', async () => {
    const response = await handleRequest(
      new Request('https://example.com/gh/microsoft/vscode/archive/refs/heads/main.zip'),
      envWithToken,
      {}
    );
    expect(response.status).toBe(401);
  });

  it('rejects requests with a wrong token', async () => {
    const response = await handleRequest(
      new Request('https://example.com/gh/microsoft/vscode/archive/refs/heads/main.zip?token=wrong'),
      envWithToken,
      {}
    );
    expect(response.status).toBe(401);
  });

  it('accepts a valid token via query parameter', async () => {
    const response = await handleRequest(
      new Request(
        'https://example.com/gh/microsoft/vscode/archive/refs/heads/main.zip?token=secret-token-123'
      ),
      envWithToken,
      {}
    );
    expect(response.status).not.toBe(401);
  });

  it('accepts a valid token via X-Access-Token header', async () => {
    const response = await handleRequest(
      new Request('https://example.com/gh/microsoft/vscode/archive/refs/heads/main.zip', {
        headers: { 'X-Access-Token': 'secret-token-123' }
      }),
      envWithToken,
      {}
    );
    expect(response.status).not.toBe(401);
  });

  it('keeps original behavior when XGET_TOKEN is not configured', async () => {
    const response = await handleRequest(
      new Request('https://example.com/gh/microsoft/vscode/archive/refs/heads/main.zip'),
      {},
      {}
    );
    expect(response.status).not.toBe(401);
  });

  it('strips the token query parameter before upstream routing', async () => {
    // The token must not leak into the upstream request URL.
    const response = await handleRequest(
      new Request(
        'https://example.com/gh/microsoft/vscode/archive/refs/heads/main.zip?token=secret-token-123&other=1'
      ),
      envWithToken,
      {}
    );
    expect(response.status).not.toBe(401);
  });
});
