import { useCallback } from 'react';
import { ApiClient } from '../../services/api/api-client.port';
import { useApiResource } from '../../services/useApiResource';
import { RankingScreen } from './RankingScreen';

export type RankingRouteProps = {
  api: ApiClient;
};

export const RankingRoute = ({ api }: RankingRouteProps) => {
  const loader = useCallback(() => api.getProfile(), [api]);
  const { data } = useApiResource(loader);
  return <RankingScreen api={api} cityId={data?.cityId ?? null} />;
};
