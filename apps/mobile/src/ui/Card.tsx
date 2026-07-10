import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../theme';

export type CardProps = {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  testID?: string;
  accessibilityLabel?: string;
};

export const Card = ({ children, style, testID, accessibilityLabel }: CardProps) => (
  <View testID={testID} accessibilityLabel={accessibilityLabel} style={[styles.card, style]}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.stroke,
    padding: spacing.m,
  },
});
