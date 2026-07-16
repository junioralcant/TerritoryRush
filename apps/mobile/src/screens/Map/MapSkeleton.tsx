import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Palette, useTheme } from '../../theme';
import { LoadingView, Skeleton, Wordmark } from '../../ui';

/**
 * Loading skeleton for the territory screen (handoff state 9a): pulsing header /
 * hero blocks with a spinner over the map area.
 */
export const MapSkeleton = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.container} testID="map-loading">
      <View style={styles.topBar}>
        <Wordmark size={18} align="left" />
        <Skeleton width={120} height={40} radius={12} />
      </View>
      <View style={styles.hero}>
        <Skeleton width="60%" height={118} radius={18} />
        <Skeleton width="36%" height={118} radius={18} />
      </View>
      <View style={styles.map}>
        <LoadingView />
      </View>
      <View style={styles.activity}>
        <Skeleton height={62} radius={16} />
      </View>
    </View>
  );
};

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bgApp },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 },
    hero: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 8 },
    map: { flex: 1, marginTop: 10, backgroundColor: c.surfaceInnerDeep },
    activity: { paddingHorizontal: 16, paddingVertical: 12 },
  });
