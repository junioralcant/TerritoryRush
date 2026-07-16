import { ReactNode, useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Palette, useTheme } from '../theme';

export type ScreenProps = {
  children: ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  style?: ViewStyle;
  accessibilityLabel?: string;
  testID?: string;
};

/**
 * App surface with a matching status bar. Wraps content in a SafeAreaView so
 * screens don't repeat the background / inset boilerplate. Colours follow the
 * active theme (light by default).
 */
export const Screen = ({ children, edges = ['top'], style, accessibilityLabel, testID }: ScreenProps) => {
  const { colors, statusBarStyle } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <SafeAreaView
      edges={edges}
      style={[styles.safe, style]}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      <StatusBar style={statusBarStyle} />
      <View style={styles.fill}>{children}</View>
    </SafeAreaView>
  );
};

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bgApp },
    fill: { flex: 1 },
  });
