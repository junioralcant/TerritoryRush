import { extractGarminActivities } from './garmin-webhook-extract';

describe('extractGarminActivities', () => {
  it('keeps activities with both userId and summaryId', () => {
    expect(extractGarminActivities({ activities: [{ userId: 'g1', summaryId: 's1' }] })).toEqual([
      { userId: 'g1', summaryId: 's1' },
    ]);
  });

  it('drops entries missing userId or summaryId', () => {
    expect(
      extractGarminActivities({
        activities: [{ userId: '', summaryId: 's1' }, { userId: 'g1', summaryId: '' }],
      }),
    ).toEqual([]);
  });

  it('handles an empty payload', () => {
    expect(extractGarminActivities({})).toEqual([]);
  });
});
