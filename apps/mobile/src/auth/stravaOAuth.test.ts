import { buildStravaAuthorizeUrl, extractCodeFromRedirect } from './stravaOAuth';

describe('buildStravaAuthorizeUrl', () => {
  it('builds the Strava authorize URL with client id, redirect and scope', () => {
    const url = buildStravaAuthorizeUrl('client-1', 'territoryrush://strava-callback');
    expect(url).toContain('https://www.strava.com/oauth/authorize?');
    expect(url).toContain('client_id=client-1');
    expect(url).toContain('response_type=code');
    expect(url).toContain('scope=read%2Cactivity%3Aread');
    expect(url).toContain('approval_prompt=force');
  });
});

describe('extractCodeFromRedirect', () => {
  it('extracts the code from a redirect URL', () => {
    expect(extractCodeFromRedirect('territoryrush://strava-callback?code=abc123&scope=read')).toBe('abc123');
  });

  it('returns null when there is no code', () => {
    expect(extractCodeFromRedirect('territoryrush://strava-callback?error=access_denied')).toBeNull();
  });
});
