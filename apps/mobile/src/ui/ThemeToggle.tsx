import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Palette, ThemeName, fonts, radii, useTheme } from '../theme';

type Option = { value: ThemeName; label: string; icon: 'sun' | 'moon' };

const OPTIONS: Option[] = [
  { value: 'light', label: 'Claro', icon: 'sun' },
  { value: 'dark', label: 'Escuro', icon: 'moon' },
];

/**
 * Appearance card with a segmented Claro / Escuro control that switches the app
 * theme at runtime (persisted). Matches the design's segmented selectors.
 */
export const ThemeToggle = ({ testID }: { testID?: string }) => {
  const { name, colors, setTheme } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.card} testID={testID}>
      <Text style={styles.title}>Aparência</Text>
      <Text style={styles.subtitle}>Escolha o tema do app</Text>
      <View style={styles.segment}>
        {OPTIONS.map((option) => {
          const active = name === option.value;
          return (
            <Pressable
              key={option.value}
              testID={`theme-option-${option.value}`}
              onPress={() => setTheme(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Tema ${option.label}`}
              style={[styles.option, active && styles.optionActive]}
            >
              <Feather name={option.icon} size={16} color={active ? colors.white : colors.textMid} />
              <Text style={[styles.optionLabel, { color: active ? colors.white : colors.textMid }]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surfaceCard,
      borderWidth: 1,
      borderColor: c.stroke,
      borderRadius: radii.card,
      padding: 16,
    },
    title: { fontFamily: fonts.sairaExtraBold, fontSize: 17, color: c.textHi },
    subtitle: { fontFamily: fonts.manrope, fontSize: 12, color: c.textMid, marginTop: 3 },
    segment: {
      flexDirection: 'row',
      gap: 4,
      marginTop: 12,
      backgroundColor: c.surfaceInner,
      borderRadius: radii.boxSm,
      padding: 4,
    },
    option: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 9,
      borderRadius: radii.boxSm - 3,
    },
    optionActive: { backgroundColor: c.primary },
    optionLabel: { fontFamily: fonts.manropeBold, fontSize: 13 },
  });
