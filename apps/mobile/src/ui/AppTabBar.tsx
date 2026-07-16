import { ComponentProps, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Palette, fonts, useTheme } from '../theme';
import { Hexagon } from './Hexagon';

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

export type AppTabBarProps = BottomTabBarProps & { onStartRun?: () => void };

/**
 * Custom tab bar: Mapa · Atividades · central hexagonal FAB (start run) ·
 * Ranking · Perfil, matching TabBar.dc.html.
 */
export const AppTabBar = ({ state, navigation, onStartRun }: AppTabBarProps) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const go = (index: number, name: string) => {
    const focused = state.index === index;
    const event = navigation.emit({ type: 'tabPress', target: state.routes[index].key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(name);
  };

  const order = state.routes.map((r, i) => ({ name: r.name, index: i }));
  const left = order.slice(0, 2);
  const right = order.slice(2);

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {left.map((r) => (
        <TabItem key={r.name} routeName={r.name} focused={state.index === r.index} onPress={() => go(r.index, r.name)} />
      ))}

      <Pressable
        style={styles.fab}
        onPress={onStartRun ?? (() => navigation.navigate('Activities'))}
        accessibilityRole="button"
        accessibilityLabel="Iniciar corrida"
        testID="tab-start-run"
      >
        <Hexagon size={56} color={colors.primaryDeep} glowColor={colors.primary}>
          <Feather name="plus" size={26} color={colors.white} />
        </Hexagon>
      </Pressable>

      {right.map((r) => (
        <TabItem key={r.name} routeName={r.name} focused={state.index === r.index} onPress={() => go(r.index, r.name)} />
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
    fab: { width: 56, alignItems: 'center', marginTop: -30 },
  });
