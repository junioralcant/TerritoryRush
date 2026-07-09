import { AntiCheatService } from './anti-cheat.service';
import { AntiCheatInput } from './anti-cheat.types';

const input = (overrides: Partial<AntiCheatInput> = {}): AntiCheatInput => ({
  provider: 'strava',
  distanceM: 5000,
  movingTimeS: 1500,
  avgPaceSKm: 300,
  avgHeartrate: 150,
  ...overrides,
});

describe('AntiCheatService', () => {
  const service = new AntiCheatService();

  it('approves a plausible running activity', () => {
    expect(service.evaluate(input())).toEqual({ approved: true });
  });

  it('rejects a vehicle-speed activity with a reason', () => {
    expect(service.evaluate(input({ distanceM: 40_000, movingTimeS: 1500 }))).toEqual({
      approved: false,
      reason: 'Velocidade média incompatível com corrida',
    });
  });

  it('rejects an incoherent activity', () => {
    expect(service.evaluate(input({ avgPaceSKm: 900 })).approved).toBe(false);
  });

  it('rejects an unsupported origin before other checks', () => {
    expect(service.evaluate(input({ provider: 'suunto' as never }))).toEqual({
      approved: false,
      reason: 'Origem da atividade não suportada',
    });
  });
});
