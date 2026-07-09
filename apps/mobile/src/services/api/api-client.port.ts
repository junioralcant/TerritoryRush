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

/**
 * Contract for the Territory Rush backend consumed by the app. Implementations
 * attach the Supabase JWT; tests provide a fake implementation.
 */
export interface ApiClient {
  getStreets(bbox: Bbox): Promise<StreetSummary[]>;
  getStreet(id: string): Promise<StreetDetail>;
  getStravaConnection(): Promise<StravaConnectionState>;
  connectStrava(code: string): Promise<StravaConnectionState>;
  disconnectStrava(): Promise<void>;
  getProfile(): Promise<RunnerProfileDetail>;
  getCityRanking(cityId: string): Promise<CityRankingEntry[]>;
  getExplorerRanking(): Promise<ExplorerRankingEntry[]>;
  getAchievements(): Promise<AchievementView[]>;
  getNotifications(): Promise<NotificationItem[]>;
  markNotificationRead(id: string): Promise<void>;
  registerDeviceToken(token: string, platform: string): Promise<void>;
}
