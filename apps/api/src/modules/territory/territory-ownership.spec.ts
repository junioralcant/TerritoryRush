import { decideOwnership } from './territory-ownership';

describe('decideOwnership', () => {
  it('returns null when there are no scores', () => {
    expect(decideOwnership(null, [])).toBeNull();
  });

  it('grants a first claim to the top scorer', () => {
    expect(decideOwnership(null, [{ userId: 'a', points: 100 }, { userId: 'b', points: 50 }])).toEqual({
      ownerUserId: 'a',
      changed: true,
    });
  });

  it('transfers ownership to a strictly higher challenger', () => {
    expect(
      decideOwnership('a', [{ userId: 'a', points: 100 }, { userId: 'b', points: 110 }]),
    ).toEqual({ ownerUserId: 'b', changed: true });
  });

  it('keeps the current owner on a tie', () => {
    expect(
      decideOwnership('a', [{ userId: 'a', points: 100 }, { userId: 'b', points: 100 }]),
    ).toEqual({ ownerUserId: 'a', changed: false });
  });

  it('keeps the owner when they extend their lead', () => {
    expect(
      decideOwnership('a', [{ userId: 'a', points: 200 }, { userId: 'b', points: 100 }]),
    ).toEqual({ ownerUserId: 'a', changed: false });
  });
});
