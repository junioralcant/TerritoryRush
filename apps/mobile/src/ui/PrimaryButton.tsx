import { ReactNode, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { fonts, radii, useTheme } from '../theme';

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
  color,
  textColor,
  icon,
  loading = false,
  disabled = false,
  style,
  testID,
  accessibilityLabel,
  accessibilityHint,
}: PrimaryButtonProps) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(), []);
  const bg = color ?? colors.primary;
  const fg = textColor ?? colors.white;
  return (
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
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, { color: fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
};

const makeStyles = () =>
  StyleSheet.create({
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
