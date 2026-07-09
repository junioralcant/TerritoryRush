import { render, screen, waitFor } from '@testing-library/react-native';
import { ApiClient } from '../../services/api/api-client.port';
import { AchievementView } from '../../services/api/types';
import { AchievementsScreen } from './AchievementsScreen';

const achievements: AchievementView[] = [
  { code: 'first_run', title: 'Primeira corrida', category: 'milestone', threshold: 1, unlocked: true, unlockedAt: '2026-07-09T00:00:00Z' },
  { code: 'streets_100', title: '100 ruas dominadas', category: 'streets', threshold: 100, unlocked: false, unlockedAt: null },
];

const makeApi = (): ApiClient =>
  ({ getAchievements: jest.fn().mockResolvedValue(achievements) } as unknown as ApiClient);

describe('AchievementsScreen', () => {
  it('renders unlocked and pending achievements', async () => {
    render(<AchievementsScreen api={makeApi()} />);

    await waitFor(() => expect(screen.getByTestId('achievement-first_run')).toBeOnTheScreen());
    expect(screen.getByTestId('achievement-status-first_run')).toHaveTextContent('Desbloqueada');
    expect(screen.getByTestId('achievement-status-streets_100')).toHaveTextContent('Pendente');
  });
});
