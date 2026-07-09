import { ExpoPushMessage, NotificationPayload, NotificationType } from './notifications.types';

const MESSAGES: Record<NotificationType, ExpoPushMessage> = {
  street_captured: { title: 'Rua conquistada!', body: 'Você conquistou uma nova rua.' },
  street_lost: { title: 'Você perdeu uma rua', body: 'Outro corredor tomou uma rua sua. Reconquiste!' },
  top10_city: { title: 'Top 10 da cidade!', body: 'Você entrou no Top 10 da sua cidade.' },
  achievement_unlocked: { title: 'Nova conquista!', body: 'Você desbloqueou uma conquista.' },
  new_neighborhood: { title: 'Novo bairro!', body: 'Você conquistou um novo bairro.' },
};

export const buildPushMessage = (
  type: NotificationType,
  _payload: NotificationPayload,
): ExpoPushMessage => MESSAGES[type];
