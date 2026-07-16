import { StreetOwnership } from '../../services/api/types';
import { OwnershipColors, lightOwnership } from '../../theme';

export type OwnershipStyle = {
  color: string;
  accessibilityLabel: string;
};

// Ownership meaning is fixed (livre / sua / de outro) and paired with text so
// state is never conveyed by colour alone. The exact hue comes from the active
// theme's ownership palette (defaults to light, the app default).
const ACCESSIBILITY_LABEL: Record<StreetOwnership, string> = {
  unclaimed: 'Rua sem dono',
  mine: 'Rua dominada por você',
  other: 'Rua dominada por outro corredor',
};

export const ownershipStyle = (
  ownership: StreetOwnership,
  palette: OwnershipColors = lightOwnership,
): OwnershipStyle => ({
  color: palette[ownership],
  accessibilityLabel: ACCESSIBILITY_LABEL[ownership],
});

export const OWNERSHIP_STATES: StreetOwnership[] = ['unclaimed', 'mine', 'other'];

export const OWNERSHIP_LEGEND_LABEL: Record<StreetOwnership, string> = {
  unclaimed: 'Ruas livres',
  mine: 'Suas ruas',
  other: 'Ruas de outros corredores',
};
