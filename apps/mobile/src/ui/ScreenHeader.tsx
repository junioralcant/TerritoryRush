import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSize } from '../theme';

export type ScreenHeaderProps = {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
  testID?: string;
};

/**
 * Stacked-screen header: optional back chevron + Saira title + optional right slot.
 */
export const ScreenHeader = ({ title, onBack, right, testID }: ScreenHeaderProps) => (
  <View style={styles.header} testID={testID}>
    <View style={styles.left}>
      {onBack ? (
        <Pressable
          testID="header-back"
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          hitSlop={10}
        >
          <Feather name="chevron-left" size={24} color={colors.textHi} />
        </Pressable>
      ) : null}
      <Text style={styles.title}>{title}</Text>
    </View>
    {right ?? null}
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 8,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontFamily: fonts.sairaExtraBold, fontSize: fontSize.heading, color: colors.textHi },
});
