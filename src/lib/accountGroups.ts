/** Minimum chart-of-accounts groups created for every branch (incl. cash & bank). */
export const REQUIRED_ACCOUNT_GROUPS = [
  'Capital Account',
  'Current Assets',
  'Current Liabilities',
  'Fixed Assets',
  'Investments',
  'Loans (Liability)',
  'Suspense Account',
  'Sales Account',
  'Purchase Account',
  'Direct Income',
  'Indirect Income',
  'Direct Expenses',
  'Indirect Expenses',
  'Reserves and Surplus',
  'Bank Accounts',
  'Cash-in-hand',
] as const;

/** Groups shown under Cash / Bank Book (includes legacy "Cash" name). */
export const CASH_BANK_GROUP_NAMES = ['Cash-in-hand', 'Bank Accounts', 'Cash'] as const;

export function isCashBankGroup(groupName?: string | null): boolean {
  if (!groupName) return false;
  const g = groupName.trim();
  return (CASH_BANK_GROUP_NAMES as readonly string[]).includes(g);
}
