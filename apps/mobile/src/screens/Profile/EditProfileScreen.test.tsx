import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ApiClient } from '../../services/api/api-client.port';
import { RunnerProfileDetail } from '../../services/api/types';
import { EditProfileScreen } from './EditProfileScreen';

const profile: RunnerProfileDetail = {
  id: 'p1',
  userId: 'u1',
  name: 'Junior Lima',
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

const makeApi = (overrides: Partial<ApiClient> = {}): ApiClient =>
  ({
    getProfile: jest.fn().mockResolvedValue(profile),
    updateProfileName: jest.fn().mockResolvedValue({ ...profile, name: 'Novo Nome' }),
    ...overrides,
  } as unknown as ApiClient);

describe('EditProfileScreen', () => {
  it('prefills the current display name and character counter', async () => {
    render(<EditProfileScreen api={makeApi()} />);

    await waitFor(() => expect(screen.getByTestId('edit-name-input')).toBeOnTheScreen());
    expect(screen.getByTestId('edit-name-input').props.value).toBe('Junior Lima');
    expect(screen.getByTestId('edit-name-counter')).toHaveTextContent('11/30');
  });

  it('saves the trimmed name and calls onSaved', async () => {
    const updateProfileName = jest.fn().mockResolvedValue({ ...profile, name: 'Maria Souza' });
    const onSaved = jest.fn();
    render(<EditProfileScreen api={makeApi({ updateProfileName })} onSaved={onSaved} />);

    await waitFor(() => expect(screen.getByTestId('edit-name-input')).toBeOnTheScreen());
    fireEvent.changeText(screen.getByTestId('edit-name-input'), '  Maria Souza  ');
    fireEvent.press(screen.getByTestId('edit-name-save'));

    await waitFor(() => expect(updateProfileName).toHaveBeenCalledWith('Maria Souza'));
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('keeps save disabled when the name is unchanged', async () => {
    const updateProfileName = jest.fn();
    render(<EditProfileScreen api={makeApi({ updateProfileName })} />);

    await waitFor(() => expect(screen.getByTestId('edit-name-input')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('edit-name-save'));

    expect(updateProfileName).not.toHaveBeenCalled();
  });

  it('does not save an empty name', async () => {
    const updateProfileName = jest.fn();
    render(<EditProfileScreen api={makeApi({ updateProfileName })} />);

    await waitFor(() => expect(screen.getByTestId('edit-name-input')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('edit-name-clear'));
    expect(screen.getByTestId('edit-name-input').props.value).toBe('');
    fireEvent.press(screen.getByTestId('edit-name-save'));

    expect(updateProfileName).not.toHaveBeenCalled();
  });

  it('shows an error and does not navigate away when saving fails', async () => {
    const updateProfileName = jest.fn().mockRejectedValue(new Error('offline'));
    const onSaved = jest.fn();
    render(<EditProfileScreen api={makeApi({ updateProfileName })} onSaved={onSaved} />);

    await waitFor(() => expect(screen.getByTestId('edit-name-input')).toBeOnTheScreen());
    fireEvent.changeText(screen.getByTestId('edit-name-input'), 'Maria Souza');
    fireEvent.press(screen.getByTestId('edit-name-save'));

    await waitFor(() => expect(screen.getByTestId('edit-name-save-error')).toBeOnTheScreen());
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('shows an error state when the profile fails to load', async () => {
    render(<EditProfileScreen api={makeApi({ getProfile: jest.fn().mockRejectedValue(new Error('nope')) })} />);

    await waitFor(() => expect(screen.getByTestId('edit-profile-error')).toBeOnTheScreen());
  });

  it('calls onCancel from the cancel button', async () => {
    const onCancel = jest.fn();
    render(<EditProfileScreen api={makeApi()} onCancel={onCancel} />);

    await waitFor(() => expect(screen.getByTestId('edit-name-cancel')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('edit-name-cancel'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
