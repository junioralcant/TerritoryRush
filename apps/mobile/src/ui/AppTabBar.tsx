import { ComponentProps, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Palette, fonts, useTheme } from '../theme';

type FeatherName = ComponentProps<typeof Feather>['name'];

type TabMeta = { label: string; family: 'feather' | 'mc'; icon: string };

const TABS: Record<string, TabMeta> = {
  Map: { label: 'Mapa', family: 'feather', icon: 'map' },
  Activities: { label: 'Atividades', family: 'mc', icon: 'run' },
  Ranking: { label: 'Ranking', family: 'mc', icon: 'trophy-outline' },
  Profile: { label: 'Perfil', family: 'feather', icon: 'user' },
};

const TabItem = ({
  routeName,
  focused,
  onPress,
}: {
  routeName: string;
  focused: boolean;
  onPress: () => void;
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const meta = TABS[routeName];
  if (!meta) return null;
  const color = focused ? colors.primary : colors.textLo;
  return (
    <Pressable
      style={styles.item}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={meta.label}
      testID={`tab-${routeName.toLowerCase()}`}
    >
      {meta.family === 'feather' ? (
        <Feather name={meta.icon as FeatherName} size={22} color={color} />
      ) : (
        <MaterialCommunityIcons name={meta.icon as never} size={23} color={color} />
      )}
      <Text style={[styles.label, { color, fontFamily: focused ? fonts.manropeBold : fonts.manropeSemiBold }]}>
        {meta.label}
      </Text>
    </Pressable>
  );
};

export type AppTabBarProps = BottomTabBarProps;

/**
 * Custom tab bar: Mapa · Atividades · Ranking · Perfil, matching TabBar.dc.html.
 */
export const AppTabBar = ({ state, navigation }: AppTabBarProps) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const go = (index: number, name: string) => {
    const focused = state.index === index;
    const event = navigation.emit({ type: 'tabPress', target: state.routes[index].key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(name);
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {state.routes.map((route, index) => (
        <TabItem
          key={route.name}
          routeName={route.name}
          focused={state.index === index}
          onPress={() => go(index, route.name)}
        />
      ))}
    </View>
  );
};

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      backgroundColor: c.tabBar,
      borderTopWidth: 1,
      borderTopColor: c.stroke,
      paddingTop: 9,
      paddingHorizontal: 22,
    },
    item: { flex: 1, alignItems: 'center', gap: 4 },
    label: { fontSize: 10 },
  });
