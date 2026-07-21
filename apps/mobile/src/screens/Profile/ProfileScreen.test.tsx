import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ApiClient } from '../../services/api/api-client.port';
import { RunnerProfileDetail } from '../../services/api/types';
import { ProfileScreen } from './ProfileScreen';

const profile: RunnerProfileDetail = {
  id: 'p1',
  userId: 'u1',
  name: 'Ana',
  city: 'São Paulo',
  photoUrl: null,
  totalDistanceM: 42000,
  streakDays: 5,
  totalPoints: 3000,
  streetsOwned: 7,
  streetsExplored: 20,
  cityId: 'city-a',
  cityRank: 2,
  nationalRank: 1,
};

const makeApi = (getProfile: jest.Mock): ApiClient => ({ getProfile } as unknown as ApiClient);

describe('ProfileScreen', () => {
  it('renders the runner aggregates', async () => {
    render(<ProfileScreen api={makeApi(jest.fn().mockResolvedValue(profile))} />);

    await waitFor(() => expect(screen.getByTestId('profile-name')).toHaveTextContent('Ana'));
    expect(screen.getByTestId('profile-city')).toHaveTextContent('São Paulo');
    expect(screen.getByTestId('profile-streets-owned')).toHaveTextContent('7');
    expect(screen.getByTestId('profile-streets-explored')).toHaveTextContent('20');
    expect(screen.getByTestId('profile-distance')).toHaveTextContent('42 km');
    expect(screen.getByTestId('profile-streak')).toHaveTextContent(/5 dias/);
    expect(screen.getByTestId('profile-city-rank')).toHaveTextContent('#2');
    expect(screen.getByTestId('profile-national-rank')).toHaveTextContent('#1');
  });

  it('renders the runner photo when available', async () => {
    render(<ProfileScreen api={makeApi(jest.fn().mockResolvedValue({ ...profile, photoUrl: 'https://cdn/pic.jpg' }))} />);

    await waitFor(() => expect(screen.getByTestId('profile-avatar-photo')).toBeOnTheScreen());
  });

  it('shows an error state when the profile fails to load', async () => {
    render(<ProfileScreen api={makeApi(jest.fn().mockRejectedValue(new Error('nope')))} />);

    await waitFor(() => expect(screen.getByTestId('profile-error')).toBeOnTheScreen());
  });

  it('opens the edit screen when the name is tapped', async () => {
    const onEditProfile = jest.fn();
    render(<ProfileScreen api={makeApi(jest.fn().mockResolvedValue(profile))} onEditProfile={onEditProfile} />);

    await waitFor(() => expect(screen.getByTestId('profile-edit')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('profile-edit'));

    expect(onEditProfile).toHaveBeenCalledTimes(1);
  });
});
