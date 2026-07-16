import { NotificationItem } from '../../services/api/types';
import { Palette } from '../../theme';

export type NotificationVisual = {
  title: string;
  message: string;
  color: string;
  family: 'feather' | 'mc';
  icon: string;
};

const str = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const num = (value: unknown): number | undefined => (typeof value === 'number' ? value : undefined);

/**
 * Maps a notification to the handoff's type → colour/icon language and builds a
 * human message from whatever the payload provides (falling back to generic copy).
 */
export const notificationView = (item: NotificationItem, colors: Palette): NotificationVisual => {
  const type = item.type.toLowerCase();
  const p = item.payload;
  const street = str(p.streetName) ?? str(p.street);
  const points = num(p.points);
  const pointsSuffix = points != null ? ` · +${points} pts` : '';

  if (/(captur|conquist_rua|street_captured|won)/.test(type)) {
    return {
      title: 'Rua conquistada',
      message: street ? `Você conquistou a ${street}${pointsSuffix}` : `Você conquistou uma nova rua${pointsSuffix}`,
      color: colors.green,
      family: 'feather',
      icon: 'flag',
    };
  }
  if (/(lost|perd|taken|takeover)/.test(type)) {
    const by = str(p.byName) ?? str(p.opponent);
    return {
      title: 'Rua perdida',
      message: by ? `${by} tomou ${street ?? 'uma rua'} de você.` : 'Um corredor tomou uma rua sua.',
      color: colors.danger,
      family: 'feather',
      icon: 'alert-triangle',
    };
  }
  if (/(top|rank)/.test(type)) {
    const rank = num(p.rank);
    return {
      title: 'Você entrou no Top 10!',
      message: rank ? `Agora você é #${rank} no ranking da cidade.` : 'Você entrou no Top 10 da cidade.',
      color: colors.gold,
      family: 'mc',
      icon: 'trophy',
    };
  }
  if (/(neighbor|bairro|region)/.test(type)) {
    return {
      title: 'Novo bairro conquistado',
      message: str(p.name) ? `Você explorou ${str(p.name)}.` : 'Você conquistou um novo bairro.',
      color: colors.green,
      family: 'feather',
      icon: 'flag',
    };
  }
  if (/(achiev|badge|desbloq)/.test(type)) {
    return {
      title: 'Conquista desbloqueada',
      message: str(p.title) ? `Você desbloqueou ${str(p.title)}.` : 'Você desbloqueou uma nova conquista.',
      color: colors.purple,
      family: 'feather',
      icon: 'star',
    };
  }
  return {
    title: str(p.title) ?? 'Aviso',
    message: str(p.message) ?? 'Você tem uma nova atualização do jogo.',
    color: colors.primary,
    family: 'feather',
    icon: 'bell',
  };
};

export const relativeTime = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
};

export type NotificationGroup = { label: string; items: NotificationItem[] };

const dayKey = (iso: string): number => {
  const date = new Date(iso);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
};

export const groupByDay = (items: NotificationItem[]): NotificationGroup[] => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;

  const buckets = new Map<string, NotificationItem[]>();
  const order: string[] = [];
  const push = (label: string, item: NotificationItem): void => {
    if (!buckets.has(label)) {
      buckets.set(label, []);
      order.push(label);
    }
    buckets.get(label)!.push(item);
  };

  for (const item of items) {
    const key = dayKey(item.createdAt);
    if (key === today) push('Hoje', item);
    else if (key === yesterday) push('Ontem', item);
    else push('Anteriores', item);
  }

  return order.map((label) => ({ label, items: buckets.get(label)! }));
};
