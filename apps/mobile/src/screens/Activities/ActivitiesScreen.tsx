import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';
import { EmptyView, PrimaryButton, Screen } from '../../ui';

export type ActivitiesScreenProps = {
  onOpenConnections?: () => void;
};

/**
 * Activities feed placeholder. Runs are imported from Strava/Garmin; until an
 * account is connected there is nothing to show, so this prompts the runner to
 * connect rather than inventing activity data.
 */
export const ActivitiesScreen = ({ onOpenConnections }: ActivitiesScreenProps) => (
  <Screen>
    <View style={styles.header}>
      <Text style={styles.title}>Atividades</Text>
    </View>
    <EmptyView
      testID="activities-empty"
      icon={<MaterialCommunityIcons name="run" size={42} color={colors.textLo} />}
      title="Nenhuma corrida ainda"
      message="Conecte o Strava para importar suas corridas automaticamente e conquistar ruas enquanto corre."
      action={<PrimaryButton testID="activities-connect" label="Conectar conta" color={colors.accent} onPress={onOpenConnections} />}
    />
  </Screen>
);

const styles = StyleSheet.create({
  header: { paddingHorizontal: 18, paddingVertical: 6 },
  title: { fontFamily: fonts.sairaExtraBold, fontSize: 22, color: colors.textHi },
});
