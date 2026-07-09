import { BadRequestException } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { ActivityRepository } from './ports/activity-repository.port';

const makeRepo = (): jest.Mocked<ActivityRepository> => ({
  createIfAbsent: jest.fn(),
  updateStatus: jest.fn(),
  saveIngestedData: jest.fn(),
  findByUserAndStatus: jest.fn().mockResolvedValue([]),
  findByProviderActivityId: jest.fn(),
});

describe('ActivitiesService', () => {
  it('lists all activities when no status filter is given', async () => {
    const repo = makeRepo();

    await new ActivitiesService(repo).listActivities('user-1', undefined);

    expect(repo.findByUserAndStatus).toHaveBeenCalledWith('user-1', undefined);
  });

  it('passes a valid status filter through to the repository', async () => {
    const repo = makeRepo();

    await new ActivitiesService(repo).listActivities('user-1', 'processed');

    expect(repo.findByUserAndStatus).toHaveBeenCalledWith('user-1', 'processed');
  });

  it('rejects an invalid status filter', async () => {
    const repo = makeRepo();

    await expect(new ActivitiesService(repo).listActivities('user-1', 'bogus')).rejects.toThrow(
      BadRequestException,
    );
    expect(repo.findByUserAndStatus).not.toHaveBeenCalled();
  });
});
