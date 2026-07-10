import { render, screen, waitFor } from '@testing-library/react-native';
import { ApiClient } from '../../services/api/api-client.port';
import { AchievementView } from '../../services/api/types';
import { AchievementsScreen } from './AchievementsScreen';

const achievements: AchievementView[] = [
  { code: 'first_run', title: 'Primeira corrida', category: 'milestone', threshold: 1, unlocked: true, unlockedAt: '2026-07-09T00:00:00Z' },
  { code: 'streets_100', title: '100 ruas dominadas', category: 'streets', threshold: 100, unlocked: false, unlockedAt: null },
];

const makeApi = (getAchievements: jest.Mock): ApiClient =>
  ({ getAchievements } as unknown as ApiClient);

describe('AchievementsScreen', () => {
  it('renders unlocked and locked achievements with progress', async () => {
    render(<AchievementsScreen api={makeApi(jest.fn().mockResolvedValue(achievements))} />);

    await waitFor(() => expect(screen.getByTestId('achievement-first_run')).toBeOnTheScreen());
    expect(screen.getByLabelText('Primeira corrida, desbloqueada')).toBeOnTheScreen();
    expect(screen.getByLabelText('100 ruas dominadas, bloqueada')).toBeOnTheScreen();
    expect(screen.getByText('50%')).toBeOnTheScreen();
  });

  it('shows the empty state with a start-run CTA', async () => {
    render(<AchievementsScreen api={makeApi(jest.fn().mockResolvedValue([]))} />);

    await waitFor(() => expect(screen.getByTestId('achievements-empty')).toBeOnTheScreen());
    expect(screen.getByTestId('achievements-start-run')).toBeOnTheScreen();
  });
});
