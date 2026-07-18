import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Palette, useTheme } from '../../theme';

export type MapSyncButtonProps = {
  onPress?: () => void;
  syncing?: boolean;
  top?: number;
};

/**
 * Floating blue action button (top-left) that syncs Strava activities on
 * demand, matching the "Atualizar atividades" control in TerritoryRush.dc.html.
 */
export const MapSyncButton = ({ onPress, syncing, top = 14 }: MapSyncButtonProps) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable
      onPress={onPress}
      disabled={syncing}
      accessibilityRole="button"
      accessibilityLabel="Atualizar atividades"
      testID="map-sync"
      style={[styles.fab, { top }]}
    >
      {syncing ? (
        <ActivityIndicator size="small" color={colors.white} />
      ) : (
        <Feather name="refresh-cw" size={21} color={colors.white} />
      )}
    </Pressable>
  );
};

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    fab: {
      position: 'absolute',
      left: 14,
      width: 44,
      height: 44,
      borderRadius: 13,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: c.primary,
      shadowOpacity: 0.45,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
    },
  });
