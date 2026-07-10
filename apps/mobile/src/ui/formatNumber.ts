/**
 * Formats an integer with pt-BR thousands separators (e.g. 1250 → "1.250").
 * Uses a manual grouping so output is deterministic regardless of the runtime's
 * Intl/ICU data.
 */
export const formatNumber = (value: number): string => {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? '-' : '';
  return sign + Math.abs(rounded).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};
