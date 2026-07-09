import { useMemo } from 'react';
import { Button } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthScreen } from './src/auth/AuthScreen';
import { useSession } from './src/auth/useSession';
import { startStravaOAuth } from './src/auth/stravaOAuth';
import { loadConfig } from './src/config';
import { createHttpApiClient } from './src/services/api/http-api-client';
import { Bbox } from './src/services/api/types';
import { ConnectionsScreen } from './src/screens/Connections/ConnectionsScreen';
import { MapScreen } from './src/screens/Map/MapScreen';

const Stack = createNativeStackNavigator();

const DEFAULT_BBOX: Bbox = { minLng: -46.7, minLat: -23.6, maxLng: -46.6, maxLat: -23.5 };

export default function App() {
  const { session, authenticating, signInWith } = useSession();
  const config = useMemo(() => loadConfig(), []);
  const api = useMemo(
    () => createHttpApiClient(config.apiUrl, async () => session?.access_token ?? null),
    [config.apiUrl, session],
  );

  if (!session) {
    return (
      <AuthScreen
        authenticating={authenticating}
        onSignInWithGoogle={() => void signInWith('google')}
        onSignInWithApple={() => void signInWith('apple')}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="Map"
            options={({ navigation }) => ({
              title: 'Território',
              headerRight: () => (
                <Button title="Conexões" onPress={() => navigation.navigate('Connections')} />
              ),
            })}
          >
            {() => <MapScreen api={api} bbox={DEFAULT_BBOX} />}
          </Stack.Screen>
          <Stack.Screen name="Connections">
            {() => (
              <ConnectionsScreen api={api} startStravaAuth={() => startStravaOAuth(config.stravaClientId)} />
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
