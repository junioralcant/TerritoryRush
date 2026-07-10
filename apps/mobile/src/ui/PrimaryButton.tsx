import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, fonts, radii } from '../theme';

export type PrimaryButtonProps = {
  label: string;
  onPress?: () => void;
  color?: string;
  textColor?: string;
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

/**
 * Filled CTA button (blue by default; pass `color` for the orange energy CTAs).
 */
export const PrimaryButton = ({
  label,
  onPress,
  color = colors.primary,
  textColor = colors.white,
  icon,
  loading = false,
  disabled = false,
  style,
  testID,
  accessibilityLabel,
  accessibilityHint,
}: PrimaryButtonProps) => (
  <Pressable
    testID={testID}
    onPress={onPress}
    disabled={disabled || loading}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel ?? label}
    accessibilityHint={accessibilityHint}
    accessibilityState={{ disabled: disabled || loading }}
    style={({ pressed }) => [
      styles.button,
      { backgroundColor: color, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
      style,
    ]}
  >
    {loading ? (
      <ActivityIndicator color={textColor} />
    ) : (
      <>
        {icon}
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      </>
    )}
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 22,
    borderRadius: radii.button,
  },
  label: { fontFamily: fonts.manropeBold, fontSize: 15 },
});
