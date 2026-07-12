import { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthScreen } from './src/auth/AuthScreen';
import { useSession } from './src/auth/useSession';
import { startStravaOAuth } from './src/auth/stravaOAuth';
import { loadConfig } from './src/config';
import { createHttpApiClient } from './src/services/api/http-api-client';
import { ApiClient } from './src/services/api/api-client.port';
import { ActivitiesScreen } from './src/screens/Activities/ActivitiesScreen';
import { ConnectionsScreen } from './src/screens/Connections/ConnectionsScreen';
import { MapScreen } from './src/screens/Map/MapScreen';
import { ProfileScreen } from './src/screens/Profile/ProfileScreen';
import { RankingRoute } from './src/screens/Ranking/RankingRoute';
import { AchievementsScreen } from './src/screens/Achievements/AchievementsScreen';
import { NotificationsCenter } from './src/screens/Notifications/NotificationsCenter';
import { usePushRegistration } from './src/screens/Notifications/usePushRegistration';
import { getExpoPushToken } from './src/screens/Notifications/getExpoPushToken';
import { AppTabBar, BrandIcon, Wordmark } from './src/ui';
import { colors } from './src/theme';
import { useAppFonts } from './src/theme/useAppFonts';

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bgApp, card: colors.bgApp, primary: colors.primary },
};

const Tabs = ({ api }: { api: ApiClient }) => (
  <Tab.Navigator
    screenOptions={{ headerShown: false }}
    tabBar={(props) => <AppTabBar {...props} />}
  >
    <Tab.Screen name="Map">
      {({ navigation }) => (
        <MapScreen api={api} onOpenNotifications={() => navigation.navigate('Notifications')} />
      )}
    </Tab.Screen>
    <Tab.Screen name="Activities">
      {({ navigation }) => <ActivitiesScreen api={api} onOpenConnections={() => navigation.navigate('Connections')} />}
    </Tab.Screen>
    <Tab.Screen name="Ranking">{() => <RankingRoute api={api} />}</Tab.Screen>
    <Tab.Screen name="Profile">
      {({ navigation }) => <ProfileScreen api={api} onOpenSettings={() => navigation.navigate('Connections')} />}
    </Tab.Screen>
  </Tab.Navigator>
);

const MainNavigator = ({ api, stravaClientId }: { api: ApiClient; stravaClientId: string }) => {
  usePushRegistration(api, getExpoPushToken, Platform.OS);
  return (
    <NavigationContainer theme={navTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Tabs">{() => <Tabs api={api} />}</RootStack.Screen>
        <RootStack.Screen name="Notifications">
          {({ navigation }) => <NotificationsCenter api={api} onBack={() => navigation.goBack()} />}
        </RootStack.Screen>
        <RootStack.Screen name="Achievements">
          {({ navigation }) => <AchievementsScreen api={api} onBack={() => navigation.goBack()} />}
        </RootStack.Screen>
        <RootStack.Screen name="Connections">
          {({ navigation }) => (
            <ConnectionsScreen
              api={api}
              startStravaAuth={() => startStravaOAuth(stravaClientId)}
              onBack={() => navigation.goBack()}
            />
          )}
        </RootStack.Screen>
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

const Splash = () => (
  <View style={styles.splash}>
    <StatusBar style="light" />
    <BrandIcon size={96} />
    <View style={styles.splashWord}>
      <Wordmark size={30} />
    </View>
  </View>
);

export default function App() {
  const fontsLoaded = useAppFonts();
  const { session, authenticating, signInWith } = useSession();
  const config = useMemo(() => loadConfig(), []);
  const api = useMemo(
    () => createHttpApiClient(config.apiUrl, async () => session?.access_token ?? null),
    [config.apiUrl, session],
  );

  if (!fontsLoaded) {
    return (
      <SafeAreaProvider>
        <Splash />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      {!session ? (
        <AuthScreen
          authenticating={authenticating}
          onSignInWithGoogle={() => void signInWith('google')}
          onSignInWithApple={() => void signInWith('apple')}
        />
      ) : (
        <MainNavigator api={api} stravaClientId={config.stravaClientId} />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.bgApp, alignItems: 'center', justifyContent: 'center', gap: 24 },
  splashWord: { alignItems: 'center' },
});
