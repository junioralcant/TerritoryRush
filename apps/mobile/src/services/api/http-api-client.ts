import { ApiClient } from './api-client.port';
import {
  AchievementView,
  Bbox,
  CityRankingEntry,
  ExplorerRankingEntry,
  NotificationItem,
  RunnerProfileDetail,
  StravaConnectionState,
  StreetDetail,
  StreetSummary,
} from './types';

export type TokenProvider = () => Promise<string | null>;

const bboxParam = (bbox: Bbox): string =>
  `${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}`;

export const createHttpApiClient = (baseUrl: string, getToken: TokenProvider): ApiClient => {
  const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    const token = await getToken();
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
    });
    if (!response.ok) {
      throw new Error(`Request ${path} failed with status ${response.status}`);
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  };

  return {
    getStreets: (bbox) => request<StreetSummary[]>(`/streets?bbox=${bboxParam(bbox)}`),
    getStreet: (id) => request<StreetDetail>(`/streets/${id}`),
    getStravaConnection: () => request<StravaConnectionState>('/integrations/strava'),
    connectStrava: (code) =>
      request<StravaConnectionState>('/integrations/strava/connect', {
        method: 'POST',
        body: JSON.stringify({ code }),
      }),
    disconnectStrava: () =>
      request<void>('/integrations/strava/disconnect', { method: 'DELETE' }),
    getProfile: () => request<RunnerProfileDetail>('/me/profile'),
    getCityRanking: (cityId) => request<CityRankingEntry[]>(`/rankings/city/${cityId}`),
    getExplorerRanking: () => request<ExplorerRankingEntry[]>('/rankings/explorers'),
    getAchievements: () => request<AchievementView[]>('/me/achievements'),
    getNotifications: () => request<NotificationItem[]>('/me/notifications'),
    markNotificationRead: (id) =>
      request<void>(`/me/notifications/${id}/read`, { method: 'POST' }),
    registerDeviceToken: (token, platform) =>
      request<void>('/me/device-tokens', { method: 'POST', body: JSON.stringify({ token, platform }) }),
  };
};
