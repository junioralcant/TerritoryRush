import { NotificationItem } from '../../services/api/types';
import { groupByDay, notificationView, relativeTime } from './notificationView';

const make = (over: Partial<NotificationItem>): NotificationItem => ({
  id: 'n', type: 'street_captured', payload: {}, sentAt: null, readAt: null, createdAt: '2026-07-09T00:00:00Z', ...over,
});

describe('notificationView', () => {
  it('maps a captured-street notification to green/flag with a rich message', () => {
    const view = notificationView(make({ type: 'street_captured', payload: { streetName: 'Rua Maranhão', points: 120 } }));
    expect(view.title).toBe('Rua conquistada');
    expect(view.icon).toBe('flag');
    expect(view.message).toContain('Rua Maranhão');
    expect(view.message).toContain('+120 pts');
  });

  it('maps a lost-street notification to the danger alert', () => {
    const view = notificationView(make({ type: 'street_lost', payload: { byName: 'Marina', streetName: 'R. Minas' } }));
    expect(view.title).toBe('Rua perdida');
    expect(view.icon).toBe('alert-triangle');
    expect(view.message).toContain('Marina');
  });

  it('maps an achievement notification to the purple star', () => {
    const view = notificationView(make({ type: 'achievement_unlocked', payload: { title: 'Dominador' } }));
    expect(view.title).toBe('Conquista desbloqueada');
    expect(view.icon).toBe('star');
    expect(view.message).toContain('Dominador');
  });

  it('falls back to a generic aviso for unknown types', () => {
    const view = notificationView(make({ type: 'weird_new_type', payload: {} }));
    expect(view.title).toBe('Aviso');
    expect(view.icon).toBe('bell');
  });
});

describe('relativeTime', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(new Date('2026-07-09T12:00:00Z')));
  afterEach(() => jest.useRealTimers());

  it('formats minutes, hours and days', () => {
    expect(relativeTime('2026-07-09T11:59:30Z')).toBe('agora');
    expect(relativeTime('2026-07-09T11:30:00Z')).toBe('30 min');
    expect(relativeTime('2026-07-09T07:00:00Z')).toBe('5 h');
    expect(relativeTime('2026-07-07T12:00:00Z')).toBe('2 d');
  });
});

describe('groupByDay', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(new Date('2026-07-09T12:00:00Z')));
  afterEach(() => jest.useRealTimers());

  it('buckets notifications into Hoje / Ontem / Anteriores in order', () => {
    const groups = groupByDay([
      make({ id: 'a', createdAt: '2026-07-09T09:00:00Z' }),
      make({ id: 'b', createdAt: '2026-07-08T18:00:00Z' }),
      make({ id: 'c', createdAt: '2026-07-01T10:00:00Z' }),
    ]);
    expect(groups.map((g) => g.label)).toEqual(['Hoje', 'Ontem', 'Anteriores']);
    expect(groups[0].items[0].id).toBe('a');
  });
});
