import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ApiClient } from '../../services/api/api-client.port';
import { Activity } from '../../services/api/types';
import { ActivitiesScreen } from './ActivitiesScreen';

const makeApi = (activities: Activity[]): ApiClient =>
  ({ getActivities: jest.fn().mockResolvedValue(activities) }) as unknown as ApiClient;

const processedRun: Activity = {
  id: 'a1',
  provider: 'strava',
  providerActivityId: 's1',
  status: 'processed',
  distanceM: 6234,
  movingTimeS: 1925,
  avgPaceSKm: 310,
  startedAt: '2026-07-10T09:32:00',
  rejectionReason: null,
};

describe('ActivitiesScreen', () => {
  it('lists imported activities with distance and status', async () => {
    render(<ActivitiesScreen api={makeApi([processedRun])} />);

    await waitFor(() => expect(screen.getByTestId('activity-a1')).toBeOnTheScreen());
    expect(screen.getByText('6,2 km')).toBeOnTheScreen();
    expect(screen.getByText('Processada')).toBeOnTheScreen();
  });

  it('prompts to connect when there are no activities', async () => {
    const onOpenConnections = jest.fn();
    render(<ActivitiesScreen api={makeApi([])} onOpenConnections={onOpenConnections} />);

    await waitFor(() => expect(screen.getByTestId('activities-empty')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('activities-connect'));
    expect(onOpenConnections).toHaveBeenCalledTimes(1);
  });
});
