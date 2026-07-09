import { ExpoPushClient } from './ports/expo-push-client.port';
import { NotificationRepository } from './ports/notification-repository.port';
import { NotificationsService } from './notifications.service';

const makeRepo = (): jest.Mocked<NotificationRepository> => ({
  create: jest.fn().mockResolvedValue('notif-1'),
  markSent: jest.fn(),
  listForUser: jest.fn(),
  findDeviceTokens: jest.fn().mockResolvedValue(['ExpoTok[abc]']),
  upsertDeviceToken: jest.fn(),
  hasNotificationForCity: jest.fn().mockResolvedValue(false),
});

const makePush = (): jest.Mocked<ExpoPushClient> => ({ send: jest.fn().mockResolvedValue(undefined) });

describe('NotificationsService', () => {
  it('persists a notification, sends the push and marks it sent', async () => {
    const repo = makeRepo();
    const push = makePush();

    await new NotificationsService(repo, push).notify('user-1', 'street_captured', { streetId: 's1' });

    expect(repo.create).toHaveBeenCalledWith({ userId: 'user-1', type: 'street_captured', payload: { streetId: 's1' } });
    expect(push.send).toHaveBeenCalledWith(['ExpoTok[abc]'], expect.objectContaining({ title: expect.any(String) }));
    expect(repo.markSent).toHaveBeenCalledWith('notif-1');
  });

  it('keeps the notification (unsent) when the push fails — non-blocking', async () => {
    const repo = makeRepo();
    const push = makePush();
    push.send.mockRejectedValue(new Error('expo down'));

    await expect(
      new NotificationsService(repo, push).notify('user-1', 'street_captured', {}),
    ).resolves.toBeUndefined();
    expect(repo.markSent).not.toHaveBeenCalled();
  });

  it('does not send a push when the user has no device tokens', async () => {
    const repo = makeRepo();
    const push = makePush();
    repo.findDeviceTokens.mockResolvedValue([]);

    await new NotificationsService(repo, push).notify('user-1', 'street_lost', {});

    expect(push.send).not.toHaveBeenCalled();
    expect(repo.create).toHaveBeenCalled();
  });

  it('notifyCityOnce skips when a city notification already exists', async () => {
    const repo = makeRepo();
    const push = makePush();
    repo.hasNotificationForCity.mockResolvedValue(true);

    await new NotificationsService(repo, push).notifyCityOnce('user-1', 'top10_city', 'city-a', { cityId: 'city-a' });

    expect(repo.create).not.toHaveBeenCalled();
  });
});
