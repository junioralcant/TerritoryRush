import { render, screen, waitFor } from '@testing-library/react-native';
import { ApiClient } from '../../services/api/api-client.port';
import { RankingScreen } from './RankingScreen';

const makeApi = (): ApiClient =>
  ({
    getCityRanking: jest.fn().mockResolvedValue([{ userId: 'u1', name: 'Ana', rank: 1, streetsOwned: 7 }]),
    getExplorerRanking: jest.fn().mockResolvedValue([{ userId: 'u2', name: 'Bruno', rank: 1, streetsVisited: 30 }]),
  }) as unknown as ApiClient;

describe('RankingScreen', () => {
  it('renders the city and explorer leaderboards', async () => {
    render(<RankingScreen api={makeApi()} cityId="city-a" />);

    await waitFor(() => expect(screen.getByTestId('city-rank-1')).toBeOnTheScreen());
    expect(screen.getByTestId('city-rank-1')).toHaveTextContent(/Ana/);
    expect(screen.getByTestId('explorer-rank-1')).toHaveTextContent(/Bruno/);
  });

  it('shows only explorers when there is no city', async () => {
    const api = makeApi();
    render(<RankingScreen api={api} cityId={null} />);

    await waitFor(() => expect(screen.getByTestId('explorer-rank-1')).toBeOnTheScreen());
    expect(api.getCityRanking).not.toHaveBeenCalled();
    expect(screen.queryByTestId('city-rank-1')).toBeNull();
  });
});
