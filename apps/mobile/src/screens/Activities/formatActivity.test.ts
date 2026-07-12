import {
  formatActivityDate,
  formatActivityDistance,
  formatActivityDuration,
  formatActivityPace,
} from './formatActivity';

describe('formatActivity', () => {
  it('formats distance in km with a comma and dash for null', () => {
    expect(formatActivityDistance(6234)).toBe('6,2 km');
    expect(formatActivityDistance(950)).toBe('0,9 km');
    expect(formatActivityDistance(null)).toBe('—');
  });

  it('formats duration as minutes and hours', () => {
    expect(formatActivityDuration(1925)).toBe('32min');
    expect(formatActivityDuration(3925)).toBe('1h 05min');
    expect(formatActivityDuration(null)).toBe('—');
  });

  it('formats pace as mm:ss per km', () => {
    expect(formatActivityPace(310)).toBe('5:10 /km');
    expect(formatActivityPace(65)).toBe('1:05 /km');
    expect(formatActivityPace(null)).toBe('—');
  });

  it('formats the start date and guards invalid input', () => {
    expect(formatActivityDate('2026-07-10T09:32:00')).toBe('10 jul · 09:32');
    expect(formatActivityDate(null)).toBe('—');
    expect(formatActivityDate('not-a-date')).toBe('—');
  });
});
