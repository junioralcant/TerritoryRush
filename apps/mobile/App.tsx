import { useMemo } from 'react';
import { Button, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthScreen } from './src/auth/AuthScreen';
import { useSession } from './src/auth/useSession';
import { startStravaOAuth } from './src/auth/stravaOAuth';
import { loadConfig } from './src/config';
import { createHttpApiClient } from './src/services/api/http-api-client';
import { ApiClient } from './src/services/api/api-client.port';
import { Bbox } from './src/services/api/types';
import { ConnectionsScreen } from './src/screens/Connections/ConnectionsScreen';
import { MapScreen } from './src/screens/Map/MapScreen';
import { ProfileScreen } from './src/screens/Profile/ProfileScreen';
import { RankingRoute } from './src/screens/Ranking/RankingRoute';
import { AchievementsScreen } from './src/screens/Achievements/AchievementsScreen';
import { NotificationsCenter } from './src/screens/Notifications/NotificationsCenter';

const Stack = createNativeStackNavigator();

const DEFAULT_BBOX: Bbox = { minLng: -46.7, minLat: -23.6, maxLng: -46.6, maxLat: -23.5 };

type NavButtonsProps = { navigate: (screen: string) => void };

const HeaderNav = ({ navigate }: NavButtonsProps) => (
  <View style={{ flexDirection: 'row' }}>
    <Button title="Perfil" onPress={() => navigate('Profile')} />
    <Button title="Ranking" onPress={() => navigate('Ranking')} />
    <Button title="Conquistas" onPress={() => navigate('Achievements')} />
    <Button title="Avisos" onPress={() => navigate('Notifications')} />
    <Button title="Conexões" onPress={() => navigate('Connections')} />
  </View>
);

const MainNavigator = ({ api, stravaClientId }: { api: ApiClient; stravaClientId: string }) => (
  <SafeAreaProvider>
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Map"
          options={({ navigation }) => ({
            title: 'Território',
            headerRight: () => <HeaderNav navigate={(screen) => navigation.navigate(screen)} />,
          })}
        >
          {() => <MapScreen api={api} bbox={DEFAULT_BBOX} />}
        </Stack.Screen>
        <Stack.Screen name="Profile" options={{ title: 'Perfil' }}>
          {() => <ProfileScreen api={api} />}
        </Stack.Screen>
        <Stack.Screen name="Ranking" options={{ title: 'Ranking' }}>
          {() => <RankingRoute api={api} />}
        </Stack.Screen>
        <Stack.Screen name="Achievements" options={{ title: 'Conquistas' }}>
          {() => <AchievementsScreen api={api} />}
        </Stack.Screen>
        <Stack.Screen name="Notifications" options={{ title: 'Notificações' }}>
          {() => <NotificationsCenter api={api} />}
        </Stack.Screen>
        <Stack.Screen name="Connections" options={{ title: 'Conexões' }}>
          {() => (
            <ConnectionsScreen api={api} startStravaAuth={() => startStravaOAuth(stravaClientId)} />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  </SafeAreaProvider>
);

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

  return <MainNavigator api={api} stravaClientId={config.stravaClientId} />;
}
