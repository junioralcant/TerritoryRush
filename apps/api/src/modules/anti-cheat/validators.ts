import { GpsStreams, Provider } from '../activities/activities.types';
import { AntiCheatInput } from './anti-cheat.types';

const SUPPORTED_PROVIDERS: readonly Provider[] = ['strava', 'garmin'];
const MAX_RUNNING_SPEED_KMH = 25;
const COHERENCE_TOLERANCE = 0.1;
const MIN_PLAUSIBLE_HEARTRATE = 40;

export const averageHeartrate = (streams: GpsStreams): number | null => {
  const samples = streams.heartrate;
  if (!samples || samples.length === 0) {
    return null;
  }
  return samples.reduce((sum, value) => sum + value, 0) / samples.length;
};

export const validateOrigin = (input: AntiCheatInput): string | null =>
  SUPPORTED_PROVIDERS.includes(input.provider) ? null : 'Origem da atividade não suportada';

export const validateSpeed = (input: AntiCheatInput): string | null => {
  if (!input.distanceM || !input.movingTimeS || input.distanceM <= 0 || input.movingTimeS <= 0) {
    return 'Atividade sem distância ou tempo válidos';
  }
  const speedKmh = (input.distanceM / input.movingTimeS) * 3.6;
  if (speedKmh > MAX_RUNNING_SPEED_KMH) {
    return 'Velocidade média incompatível com corrida';
  }
  return null;
};

export const validateCoherence = (input: AntiCheatInput): string | null => {
  if (input.avgPaceSKm === null || !input.distanceM || !input.movingTimeS) {
    return null;
  }
  const computedPace = input.movingTimeS / (input.distanceM / 1000);
  if (computedPace <= 0) {
    return null;
  }
  const deviation = Math.abs(input.avgPaceSKm - computedPace) / computedPace;
  return deviation > COHERENCE_TOLERANCE ? 'Incoerência entre distância, tempo e ritmo' : null;
};

export const validateHeartrate = (input: AntiCheatInput): string | null => {
  if (input.avgHeartrate === null) {
    return null;
  }
  return input.avgHeartrate < MIN_PLAUSIBLE_HEARTRATE
    ? 'Frequência cardíaca incompatível com esforço'
    : null;
};
