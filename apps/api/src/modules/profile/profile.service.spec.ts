import { AuthUser } from '../auth/auth.types';
import { ProfileRepository } from './ports/profile-repository.port';
import { ProfileService } from './profile.service';
import { RunnerProfile } from './profile.types';

const makeProfile = (overrides: Partial<RunnerProfile> = {}): RunnerProfile => ({
  id: 'profile-1',
  userId: 'user-1',
  name: 'junior',
  city: null,
  photoUrl: null,
  totalDistanceM: 0,
  streakDays: 0,
  lastActiveOn: null,
  createdAt: '2026-07-09T00:00:00.000Z',
  updatedAt: '2026-07-09T00:00:00.000Z',
  ...overrides,
});

const makeRepository = (): jest.Mocked<ProfileRepository> => ({
  findByUserId: jest.fn(),
  create: jest.fn(),
  loadAggregates: jest.fn().mockResolvedValue({
    totalPoints: 0,
    streetsOwned: 0,
    streetsExplored: 0,
    cityId: null,
    cityRank: null,
    nationalRank: 1,
  }),
});

const USER: AuthUser = { id: 'user-1', email: 'junior@example.com' };

describe('ProfileService', () => {
  it('returns the existing profile without creating a new one', async () => {
    const repository = makeRepository();
    const existing = makeProfile();
    repository.findByUserId.mockResolvedValue(existing);

    const result = await new ProfileService(repository).ensureProfileForUser(USER);

    expect(result).toBe(existing);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('creates the profile on first access, deriving the name from the email', async () => {
    const repository = makeRepository();
    const created = makeProfile();
    repository.findByUserId.mockResolvedValue(null);
    repository.create.mockResolvedValue(created);

    const result = await new ProfileService(repository).ensureProfileForUser(USER);

    expect(repository.create).toHaveBeenCalledWith({ userId: 'user-1', name: 'junior' });
    expect(result).toBe(created);
  });

  it('creates the profile with a null name when the user has no email', async () => {
    const repository = makeRepository();
    repository.findByUserId.mockResolvedValue(null);
    repository.create.mockResolvedValue(makeProfile({ name: null }));

    await new ProfileService(repository).ensureProfileForUser({ id: 'user-1', email: null });

    expect(repository.create).toHaveBeenCalledWith({ userId: 'user-1', name: null });
  });

  it('is idempotent: a second call for an existing profile does not create again', async () => {
    const repository = makeRepository();
    const existing = makeProfile();
    repository.findByUserId.mockResolvedValue(existing);
    const service = new ProfileService(repository);

    await service.ensureProfileForUser(USER);
    await service.ensureProfileForUser(USER);

    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.findByUserId).toHaveBeenCalledTimes(2);
  });
});
