/** Normalise voided flag from SQLite (0/1) or MySQL (boolean). */
export const isVoided = (v: { voided?: unknown } | null | undefined): boolean =>
  v?.voided === true || v?.voided === 1 || v?.voided === '1';

export const activeVouchers = <T extends { voided?: unknown }>(vouchers: T[]): T[] =>
  (Array.isArray(vouchers) ? vouchers : []).filter((v) => !isVoided(v));
