import { AchievementView } from '../../services/api/types';
import { colors } from '../../theme';

export type AchievementVisual = {
  color: string;
  family: 'feather' | 'mc';
  icon: string;
};

const PALETTE = [colors.primary, colors.green, colors.purple, colors.gold, colors.danger, colors.teal];

const hash = (value: string): number => {
  let acc = 0;
  for (let i = 0; i < value.length; i += 1) acc = (acc * 31 + value.charCodeAt(i)) >>> 0;
  return acc;
};

/**
 * Maps an achievement to a badge colour + glyph following the handoff's category
 * language (streets → flag/blue, exploration → map/green, neighbourhood →
 * buildings/purple, streak → flame/red, etc.). Unknown categories get a stable
 * colour from the brand palette so the grid stays varied.
 */
export const achievementVisual = (achievement: AchievementView): AchievementVisual => {
  const key = `${achievement.category} ${achievement.code}`.toLowerCase();

  if (/(explor|visit|unique|única)/.test(key)) return { color: colors.green, family: 'feather', icon: 'map' };
  if (/(bairro|neighbor|region|cidade|city)/.test(key)) return { color: colors.purple, family: 'mc', icon: 'office-building-outline' };
  if (/(streak|consist|dias|day|sequ)/.test(key)) return { color: colors.danger, family: 'mc', icon: 'fire' };
  if (/(distance|km|dist)/.test(key)) return { color: colors.teal, family: 'mc', icon: 'road-variant' };
  if (/(domin|owned|dominad|500|1000|100)/.test(key)) return { color: colors.gold, family: 'mc', icon: 'crown' };
  if (/(street|rua|first|primeir|milestone)/.test(key)) return { color: colors.primary, family: 'feather', icon: 'flag' };

  return { color: PALETTE[hash(key) % PALETTE.length], family: 'feather', icon: 'award' };
};
