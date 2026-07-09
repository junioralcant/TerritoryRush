import { Bbox, StravaConnectionState, StreetDetail, StreetSummary } from './types';

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
}
