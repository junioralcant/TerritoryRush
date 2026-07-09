import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

const STRAVA_AUTHORIZE_URL = 'https://www.strava.com/oauth/authorize';

export const buildStravaAuthorizeUrl = (clientId: string, redirectUri: string): string => {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read',
  });
  return `${STRAVA_AUTHORIZE_URL}?${params.toString()}`;
};

export const extractCodeFromRedirect = (redirectUrl: string): string | null => {
  const match = redirectUrl.match(/[?&]code=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

/**
 * Opens the Strava authorize page and resolves with the OAuth code once the user
 * approves (null if they cancel). The code is exchanged server-side via
 * ApiClient.connectStrava.
 */
export const startStravaOAuth = async (clientId: string): Promise<string | null> => {
  const redirectUri = Linking.createURL('strava-callback');
  const authUrl = buildStravaAuthorizeUrl(clientId, redirectUri);
  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
  if (result.type !== 'success') {
    return null;
  }
  return extractCodeFromRedirect(result.url);
};
