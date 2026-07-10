import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ApiClient } from '../../services/api/api-client.port';
import { RankingScreen } from './RankingScreen';

const makeApi = (): ApiClient =>
  ({
    getCityRanking: jest.fn().mockResolvedValue([{ userId: 'u1', name: 'Ana', rank: 1, streetsOwned: 7 }]),
    getExplorerRanking: jest.fn().mockResolvedValue([{ userId: 'u2', name: 'Bruno', rank: 1, streetsVisited: 30 }]),
  }) as unknown as ApiClient;

describe('RankingScreen', () => {
  it('shows the city leaderboard by default and switches to explorers', async () => {
    render(<RankingScreen api={makeApi()} cityId="city-a" />);

    await waitFor(() => expect(screen.getByTestId('city-rank-1')).toBeOnTheScreen());
    expect(screen.getByTestId('city-rank-1')).toHaveTextContent(/Ana/);

    fireEvent.press(screen.getByTestId('ranking-tab-explorers'));

    await waitFor(() => expect(screen.getByTestId('explorer-rank-1')).toBeOnTheScreen());
    expect(screen.getByTestId('explorer-rank-1')).toHaveTextContent(/Bruno/);
  });

  it('defaults to explorers and never queries the city board when there is no city', async () => {
    const api = makeApi();
    render(<RankingScreen api={api} cityId={null} />);

    await waitFor(() => expect(screen.getByTestId('explorer-rank-1')).toBeOnTheScreen());
    expect(api.getCityRanking).not.toHaveBeenCalled();
    expect(screen.queryByTestId('city-rank-1')).toBeNull();
  });
});
