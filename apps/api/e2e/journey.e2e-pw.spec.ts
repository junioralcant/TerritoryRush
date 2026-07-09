import { expect, request, test } from '@playwright/test';

/**
 * Playwright E2E against a *served* stack (API + infra), driven over HTTP.
 * Set E2E_BASE_URL (and optionally E2E_TOKEN for authenticated routes) after
 * bringing up the stack per e2e/README.md. Skipped otherwise.
 *
 * NestJS cannot be imported into Playwright's transpiler (parameter decorators),
 * so the fully-mocked in-process journey lives in the jest suite
 * (test/journey.int-spec.ts); this suite validates the real served endpoints.
 */
const baseURL = process.env.E2E_BASE_URL;
const authToken = process.env.E2E_TOKEN;

test.describe('Key journey (served stack)', () => {
  test.skip(!baseURL, 'Set E2E_BASE_URL to run against a served API');

  test('exposes metrics and the authenticated profile', async () => {
    const ctx = await request.newContext({ baseURL });
    try {
      const metrics = await ctx.get('/metrics');
      expect(metrics.status()).toBe(200);
      expect(await metrics.text()).toContain('territory_rush_');

      if (authToken) {
        const profile = await ctx.get('/me/profile', { headers: { Authorization: `Bearer ${authToken}` } });
        expect(profile.status()).toBe(200);
      }
    } finally {
      await ctx.dispose();
    }
  });
});
