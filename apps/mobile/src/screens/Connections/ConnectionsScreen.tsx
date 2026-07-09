import { ActivityIndicator, Button, Text, View } from 'react-native';
import { ApiClient } from '../../services/api/api-client.port';
import { useConnections } from './useConnections';

export type ConnectionsScreenProps = {
  api: ApiClient;
  startStravaAuth: () => Promise<string | null>;
};

export const ConnectionsScreen = ({ api, startStravaAuth }: ConnectionsScreenProps) => {
  const { connection, loading, connect, disconnect } = useConnections(api, { startStravaAuth });

  if (loading) {
    return <ActivityIndicator testID="connections-loading" />;
  }

  const connected = connection?.connected ?? false;

  return (
    <View accessibilityLabel="Conexões de contas">
      <Text testID="strava-status">
        {connected ? 'Strava conectado' : 'Strava não conectado'}
      </Text>
      {connected ? (
        <Button testID="disconnect-strava" title="Desconectar Strava" onPress={() => void disconnect()} />
      ) : (
        <Button testID="connect-strava" title="Conectar Strava" onPress={() => void connect()} />
      )}
    </View>
  );
};
