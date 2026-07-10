import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../theme';

export type ScreenProps = {
  children: ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  style?: ViewStyle;
  accessibilityLabel?: string;
  testID?: string;
};

/**
 * Dark app surface with a light status bar. Wraps content in a SafeAreaView so
 * screens don't repeat the background / inset boilerplate.
 */
export const Screen = ({ children, edges = ['top'], style, accessibilityLabel, testID }: ScreenProps) => (
  <SafeAreaView
    edges={edges}
    style={[styles.safe, style]}
    accessibilityLabel={accessibilityLabel}
    testID={testID}
  >
    <StatusBar style="light" />
    <View style={styles.fill}>{children}</View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgApp },
  fill: { flex: 1 },
});
