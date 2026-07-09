import { AntiCheatInput } from './anti-cheat.types';
import {
  averageHeartrate,
  validateCoherence,
  validateHeartrate,
  validateOrigin,
  validateSpeed,
} from './validators';

const input = (overrides: Partial<AntiCheatInput> = {}): AntiCheatInput => ({
  provider: 'strava',
  distanceM: 5000,
  movingTimeS: 1500,
  avgPaceSKm: 300,
  avgHeartrate: 150,
  ...overrides,
});

describe('averageHeartrate', () => {
  it('averages the heartrate stream', () => {
    expect(averageHeartrate({ latlng: [], time: [], heartrate: [100, 140, 160] })).toBe(400 / 3);
  });

  it('returns null when there is no heartrate stream', () => {
    expect(averageHeartrate({ latlng: [], time: [] })).toBeNull();
  });
});

describe('validateOrigin', () => {
  it('accepts supported providers', () => {
    expect(validateOrigin(input({ provider: 'strava' }))).toBeNull();
    expect(validateOrigin(input({ provider: 'garmin' }))).toBeNull();
  });

  it('rejects an unsupported provider', () => {
    expect(validateOrigin(input({ provider: 'polar' as never }))).toContain('Origem');
  });
});

describe('validateSpeed', () => {
  it('accepts a running-speed activity', () => {
    expect(validateSpeed(input({ distanceM: 5000, movingTimeS: 1500 }))).toBeNull();
  });

  it('rejects a vehicle-speed activity', () => {
    expect(validateSpeed(input({ distanceM: 40_000, movingTimeS: 1500 }))).toContain('Velocidade');
  });

  it('rejects an activity without valid distance/time', () => {
    expect(validateSpeed(input({ distanceM: 0 }))).toContain('distância ou tempo');
    expect(validateSpeed(input({ movingTimeS: null }))).toContain('distância ou tempo');
  });
});

describe('validateCoherence', () => {
  it('accepts a coherent distance/time/pace triple', () => {
    expect(validateCoherence(input({ distanceM: 5000, movingTimeS: 1500, avgPaceSKm: 300 }))).toBeNull();
  });

  it('rejects an incoherent pace', () => {
    expect(validateCoherence(input({ distanceM: 5000, movingTimeS: 1500, avgPaceSKm: 600 }))).toContain('Incoerência');
  });

  it('skips the check when pace is absent', () => {
    expect(validateCoherence(input({ avgPaceSKm: null }))).toBeNull();
  });
});

describe('validateHeartrate', () => {
  it('is a no-op when heartrate is absent', () => {
    expect(validateHeartrate(input({ avgHeartrate: null }))).toBeNull();
  });

  it('accepts a plausible heartrate', () => {
    expect(validateHeartrate(input({ avgHeartrate: 150 }))).toBeNull();
  });

  it('rejects an implausibly low heartrate', () => {
    expect(validateHeartrate(input({ avgHeartrate: 20 }))).toContain('Frequência cardíaca');
  });
});
