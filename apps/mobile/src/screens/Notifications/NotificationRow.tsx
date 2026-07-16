import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { NotificationItem } from '../../services/api/types';
import { Palette, fonts, radii, useTheme } from '../../theme';
import { notificationView, relativeTime } from './notificationView';

export type NotificationRowProps = {
  item: NotificationItem;
  onMarkRead: (id: string) => void;
};

export const NotificationRow = ({ item, onMarkRead }: NotificationRowProps) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const visual = notificationView(item, colors);
  const unread = item.readAt === null;

  const content = (
    <>
      <View style={[styles.icon, { backgroundColor: `${visual.color}29` }]}>
        {visual.family === 'feather' ? (
          <Feather name={visual.icon as never} size={20} color={visual.color} />
        ) : (
          <MaterialCommunityIcons name={visual.icon as never} size={20} color={visual.color} />
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{visual.title}</Text>
        <Text style={styles.message}>{visual.message}</Text>
      </View>
      <View style={styles.meta}>
        <Text style={styles.time}>{relativeTime(item.createdAt)}</Text>
        {unread ? <View style={styles.dot} /> : null}
      </View>
    </>
  );

  if (unread) {
    return (
      <Pressable
        testID={`notification-mark-${item.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${visual.title}, não lida`}
        onPress={() => onMarkRead(item.id)}
        style={[styles.card, styles.unread]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View testID={`notification-read-${item.id}`} accessibilityLabel={`${visual.title}, lida`} style={[styles.card, styles.read]}>
      {content}
    </View>
  );
};

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, borderRadius: radii.box, padding: 12 },
    unread: { backgroundColor: c.primarySurface, borderWidth: 1, borderColor: c.primaryBorderSoft },
    read: { opacity: 0.72 },
    icon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    body: { flex: 1, minWidth: 0 },
    title: { fontFamily: fonts.manropeBold, fontSize: 13.5, color: c.textHi },
    message: { fontFamily: fonts.manrope, fontSize: 12, color: c.textMid, marginTop: 2, lineHeight: 16 },
    meta: { alignItems: 'flex-end', gap: 6 },
    time: { fontFamily: fonts.manrope, fontSize: 10.5, color: c.textLo },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary },
  });
