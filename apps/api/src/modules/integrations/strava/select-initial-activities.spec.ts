import { selectInitialActivities } from './select-initial-activities';
import { StravaActivitySummary } from './strava.types';

const activity = (id: string, startedAt: string | null): StravaActivitySummary => ({
  providerActivityId: id,
  sportType: 'Run',
  startedAt,
});

const SIGNUP = Date.parse('2026-07-10T00:00:00Z');

describe('selectInitialActivities', () => {
  it('keeps only the N most recent runs before signup as the seed', () => {
    const activities = [
      activity('a', '2026-07-09T10:00:00Z'),
      activity('b', '2026-07-08T10:00:00Z'),
      activity('c', '2026-07-07T10:00:00Z'),
      activity('d', '2026-07-06T10:00:00Z'),
      activity('e', '2026-07-05T10:00:00Z'),
      activity('f', '2026-07-04T10:00:00Z'),
      activity('g', '2026-07-03T10:00:00Z'),
    ];

    const result = selectInitialActivities(activities, SIGNUP, 5);

    expect(result.map((a) => a.providerActivityId)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('always includes runs on/after signup and adds the pre-signup seed', () => {
    const activities = [
      activity('new1', '2026-07-12T10:00:00Z'),
      activity('new2', '2026-07-11T10:00:00Z'),
      activity('old1', '2026-07-09T10:00:00Z'),
      activity('old2', '2026-07-08T10:00:00Z'),
      activity('old3', '2026-07-01T10:00:00Z'),
    ];

    const result = selectInitialActivities(activities, SIGNUP, 2).map((a) => a.providerActivityId);

    expect(result).toContain('new1');
    expect(result).toContain('new2');
    expect(result).toContain('old1');
    expect(result).toContain('old2');
    expect(result).not.toContain('old3');
  });

  it('drops activities without a start date', () => {
    const activities = [activity('a', '2026-07-09T10:00:00Z'), activity('b', null)];

    const result = selectInitialActivities(activities, SIGNUP, 5).map((a) => a.providerActivityId);

    expect(result).toEqual(['a']);
  });
});
