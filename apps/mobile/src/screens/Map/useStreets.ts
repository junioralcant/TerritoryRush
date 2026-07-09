import { useCallback, useEffect, useState } from 'react';
import { ApiClient } from '../../services/api/api-client.port';
import { Bbox, StreetDetail, StreetSummary } from '../../services/api/types';

export type UseStreetsResult = {
  streets: StreetSummary[];
  selected: StreetDetail | null;
  loading: boolean;
  selectStreet: (id: string) => Promise<void>;
};

export const useStreets = (api: ApiClient, bbox: Bbox): UseStreetsResult => {
  const [streets, setStreets] = useState<StreetSummary[]>([]);
  const [selected, setSelected] = useState<StreetDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .getStreets(bbox)
      .then((result) => {
        if (active) {
          setStreets(result);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [api, bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat]);

  const selectStreet = useCallback(
    async (id: string) => {
      setSelected(await api.getStreet(id));
    },
    [api],
  );

  return { streets, selected, loading, selectStreet };
};
