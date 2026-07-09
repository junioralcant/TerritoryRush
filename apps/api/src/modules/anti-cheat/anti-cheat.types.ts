import { Provider } from '../activities/activities.types';

export type AntiCheatInput = {
  provider: Provider;
  distanceM: number | null;
  movingTimeS: number | null;
  avgPaceSKm: number | null;
  avgHeartrate: number | null;
};

export type AntiCheatVerdict =
  | { approved: true }
  | { approved: false; reason: string };
