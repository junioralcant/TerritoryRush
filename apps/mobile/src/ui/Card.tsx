import { ReactNode, useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Palette, radii, spacing, useTheme } from '../theme';

export type CardProps = {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  testID?: string;
  accessibilityLabel?: string;
};

export const Card = ({ children, style, testID, accessibilityLabel }: CardProps) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View testID={testID} accessibilityLabel={accessibilityLabel} style={[styles.card, style]}>
      {children}
    </View>
  );
};

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surfaceCard,
      borderRadius: radii.card,
      borderWidth: 1,
      borderColor: c.stroke,
      padding: spacing.m,
    },
  });
