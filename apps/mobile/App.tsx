import { useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
import { EditProfileScreen } from './src/screens/Profile/EditProfileScreen';
import { RankingRoute } from './src/screens/Ranking/RankingRoute';
import { AchievementsScreen } from './src/screens/Achievements/AchievementsScreen';
import { NotificationsCenter } from './src/screens/Notifications/NotificationsCenter';
import { usePushRegistration } from './src/screens/Notifications/usePushRegistration';
import { getExpoPushToken } from './src/screens/Notifications/getExpoPushToken';
import { AppTabBar, SplashScreen } from './src/ui';
import { ThemeProvider, useTheme } from './src/theme';
import { useAppFonts } from './src/theme/useAppFonts';

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const Tabs = ({ api, profileVersion }: { api: ApiClient; profileVersion: number }) => (
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
      {({ navigation }) => (
        <ProfileScreen
          key={profileVersion}
          api={api}
          onOpenSettings={() => navigation.navigate('Connections')}
          onEditProfile={() => navigation.navigate('EditProfile')}
        />
      )}
    </Tab.Screen>
  </Tab.Navigator>
);

const MainNavigator = ({ api, stravaClientId }: { api: ApiClient; stravaClientId: string }) => {
  usePushRegistration(api, getExpoPushToken, Platform.OS);
  const { colors, isDark } = useTheme();
  const [profileVersion, setProfileVersion] = useState(0);
  const navTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return { ...base, colors: { ...base.colors, background: colors.bgApp, card: colors.bgApp, primary: colors.primary } };
  }, [colors, isDark]);
  return (
    <NavigationContainer theme={navTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Tabs">{() => <Tabs api={api} profileVersion={profileVersion} />}</RootStack.Screen>
        <RootStack.Screen name="EditProfile">
          {({ navigation }) => (
            <EditProfileScreen
              api={api}
              onSaved={() => {
                setProfileVersion((version) => version + 1);
                navigation.goBack();
              }}
              onCancel={() => navigation.goBack()}
            />
          )}
        </RootStack.Screen>
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

const AppContent = () => {
  const fontsLoaded = useAppFonts();
  const { session, authenticating, signInWith } = useSession();
  const config = useMemo(() => loadConfig(), []);
  const api = useMemo(
    () => createHttpApiClient(config.apiUrl, async () => session?.access_token ?? null),
    [config.apiUrl, session],
  );

  if (!fontsLoaded) {
    return <SplashScreen />;
  }

  return !session ? (
    <AuthScreen
      authenticating={authenticating}
      onSignInWithGoogle={() => void signInWith('google')}
      onSignInWithApple={() => void signInWith('apple')}
    />
  ) : (
    <MainNavigator api={api} stravaClientId={config.stravaClientId} />
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
