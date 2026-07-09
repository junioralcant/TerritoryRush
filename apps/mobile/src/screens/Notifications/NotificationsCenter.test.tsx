import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ApiClient } from '../../services/api/api-client.port';
import { NotificationItem } from '../../services/api/types';
import { NotificationsCenter } from './NotificationsCenter';

const unread: NotificationItem = {
  id: 'n1', type: 'street_captured', payload: {}, sentAt: '2026-07-09T00:00:00Z', readAt: null, createdAt: '2026-07-09T00:00:00Z',
};

describe('NotificationsCenter', () => {
  it('lists notifications and marks one as read', async () => {
    const getNotifications = jest.fn().mockResolvedValueOnce([unread]).mockResolvedValue([{ ...unread, readAt: '2026-07-09T01:00:00Z' }]);
    const markNotificationRead = jest.fn().mockResolvedValue(undefined);
    const api = { getNotifications, markNotificationRead } as unknown as ApiClient;

    render(<NotificationsCenter api={api} />);

    await waitFor(() => expect(screen.getByTestId('notification-mark-n1')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('notification-mark-n1'));

    await waitFor(() => expect(markNotificationRead).toHaveBeenCalledWith('n1'));
    await waitFor(() => expect(screen.getByTestId('notification-read-n1')).toBeOnTheScreen());
  });
});
