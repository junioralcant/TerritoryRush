import { useCallback } from 'react';
import { ActivityIndicator, Button, ScrollView, Text, View } from 'react-native';
import { ApiClient } from '../../services/api/api-client.port';
import { useApiResource } from '../../services/useApiResource';

export type NotificationsCenterProps = {
  api: ApiClient;
};

export const NotificationsCenter = ({ api }: NotificationsCenterProps) => {
  const loader = useCallback(() => api.getNotifications(), [api]);
  const { data: notifications, loading, error, reload } = useApiResource(loader);

  const markRead = async (id: string): Promise<void> => {
    await api.markNotificationRead(id);
    reload();
  };

  if (loading) {
    return <ActivityIndicator testID="notifications-loading" />;
  }
  if (error || !notifications) {
    return <Text testID="notifications-error">Não foi possível carregar as notificações</Text>;
  }

  return (
    <ScrollView accessibilityLabel="Central de notificações">
      {notifications.map((notification) => (
        <View
          key={notification.id}
          testID={`notification-${notification.id}`}
          accessibilityLabel={`${notification.type}, ${notification.readAt ? 'lida' : 'não lida'}`}
        >
          <Text>{notification.type}</Text>
          {notification.readAt ? (
            <Text testID={`notification-read-${notification.id}`}>Lida</Text>
          ) : (
            <Button
              testID={`notification-mark-${notification.id}`}
              title="Marcar como lida"
              onPress={() => void markRead(notification.id)}
            />
          )}
        </View>
      ))}
    </ScrollView>
  );
};
