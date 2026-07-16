import { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ApiClient } from '../../services/api/api-client.port';
import { useApiResource } from '../../services/useApiResource';
import { Palette, fonts, useTheme } from '../../theme';
import { EmptyView, ErrorView, LoadingView, Screen, ScreenHeader } from '../../ui';
import { NotificationRow } from './NotificationRow';
import { groupByDay } from './notificationView';

export type NotificationsCenterProps = {
  api: ApiClient;
  onBack?: () => void;
};

export const NotificationsCenter = ({ api, onBack }: NotificationsCenterProps) => {
  const loader = useCallback(() => api.getNotifications(), [api]);
  const { data: notifications, loading, error, reload } = useApiResource(loader);
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const markRead = useCallback(
    async (id: string): Promise<void> => {
      await api.markNotificationRead(id);
      reload();
    },
    [api, reload],
  );

  const markAll = useCallback(async (): Promise<void> => {
    const unread = (notifications ?? []).filter((item) => item.readAt === null);
    await Promise.all(unread.map((item) => api.markNotificationRead(item.id)));
    reload();
  }, [api, notifications, reload]);

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="Avisos" onBack={onBack} />
        <LoadingView testID="notifications-loading" label="Carregando avisos…" />
      </Screen>
    );
  }
  if (error || !notifications) {
    return (
      <Screen>
        <ScreenHeader title="Avisos" onBack={onBack} />
        <ErrorView testID="notifications-error" onRetry={reload} />
      </Screen>
    );
  }

  if (notifications.length === 0) {
    return (
      <Screen>
        <ScreenHeader title="Avisos" onBack={onBack} />
        <EmptyView
          testID="notifications-empty"
          icon={<Feather name="bell" size={42} color={colors.textLo} />}
          title="Tudo em dia"
          message="Você não tem avisos novos. Conquiste ruas para receber atualizações do jogo por aqui."
        />
      </Screen>
    );
  }

  const hasUnread = notifications.some((item) => item.readAt === null);
  const groups = groupByDay(notifications);

  return (
    <Screen>
      <ScreenHeader
        title="Avisos"
        onBack={onBack}
        right={
          hasUnread ? (
            <Text testID="notifications-mark-all" onPress={() => void markAll()} style={styles.markAll}>
              Marcar lidas
            </Text>
          ) : null
        }
      />
      <ScrollView
        accessibilityLabel="Central de notificações"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {groups.map((group) => (
          <View key={group.label} style={styles.group}>
            <Text style={styles.groupLabel}>{group.label}</Text>
            <View style={styles.rows}>
              {group.items.map((item) => (
                <View key={item.id} testID={`notification-${item.id}`}>
                  <NotificationRow item={item} onMarkRead={(id) => void markRead(id)} />
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
};

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    markAll: { fontFamily: fonts.manropeSemiBold, fontSize: 12, color: c.primary },
    scroll: { paddingHorizontal: 16, paddingBottom: 24 },
    group: { marginTop: 8 },
    groupLabel: {
      fontFamily: fonts.manropeBold,
      fontSize: 11.5,
      color: c.textMid,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginHorizontal: 4,
      marginBottom: 8,
    },
    rows: { gap: 8 },
  });
