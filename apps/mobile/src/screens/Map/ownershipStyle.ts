import { StreetOwnership } from '../../services/api/types';

export type OwnershipStyle = {
  color: string;
  accessibilityLabel: string;
};

const STYLES: Record<StreetOwnership, OwnershipStyle> = {
  unclaimed: { color: '#9E9E9E', accessibilityLabel: 'Rua sem dono' },
  mine: { color: '#1E88E5', accessibilityLabel: 'Rua dominada por você' },
  other: { color: '#E53935', accessibilityLabel: 'Rua dominada por outro corredor' },
};

export const ownershipStyle = (ownership: StreetOwnership): OwnershipStyle => STYLES[ownership];

export const OWNERSHIP_STATES: StreetOwnership[] = ['unclaimed', 'mine', 'other'];
