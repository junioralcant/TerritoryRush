import { StreetOwnership } from '../../services/api/types';
import { ownershipColors } from '../../theme';

export type OwnershipStyle = {
  color: string;
  accessibilityLabel: string;
};

// Fixed street-ownership colours — must match the handoff's ownership table
// (dark theme) and never change meaning. The legend always pairs colour with
// text so state is not conveyed by colour alone.
const STYLES: Record<StreetOwnership, OwnershipStyle> = {
  unclaimed: { color: ownershipColors.unclaimed, accessibilityLabel: 'Rua sem dono' },
  mine: { color: ownershipColors.mine, accessibilityLabel: 'Rua dominada por você' },
  other: { color: ownershipColors.other, accessibilityLabel: 'Rua dominada por outro corredor' },
};

export const ownershipStyle = (ownership: StreetOwnership): OwnershipStyle => STYLES[ownership];

export const OWNERSHIP_STATES: StreetOwnership[] = ['unclaimed', 'mine', 'other'];

export const OWNERSHIP_LEGEND_LABEL: Record<StreetOwnership, string> = {
  unclaimed: 'Ruas livres',
  mine: 'Suas ruas',
  other: 'Ruas de outros corredores',
};
