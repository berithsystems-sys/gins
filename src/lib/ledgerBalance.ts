import { isCashBankGroup } from './accountGroups';

export function isVoidedVoucher(v: { voided?: unknown } | null | undefined): boolean {
  return v?.voided === true || v?.voided === 1 || v?.voided === '1';
}

export function computeLedgerBalances(
  ledgers: Array<{ id: string; openingBalance?: number; balanceType?: string }>,
  entries: Array<{ ledgerId?: string; amount?: number; type?: string; entry_type?: string }>,
): Record<string, number> {
  const bals: Record<string, number> = {};
  ledgers.forEach((l) => {
    const ob = Number(l.openingBalance || 0);
    bals[l.id] = l.balanceType === 'Cr' ? -ob : ob;
  });
  entries.forEach((e) => {
    if (!e.ledgerId || bals[e.ledgerId] === undefined) return;
    const amt = Number(e.amount ?? 0);
    const typ = e.type || e.entry_type;
    bals[e.ledgerId] += typ === 'Cr' ? -amt : amt;
  });
  return bals;
}

export function sumCashBankClosingBalance(
  ledgers: Array<{ id: string; group?: string; group_name?: string; branchId?: string }>,
  balances: Record<string, number>,
  branchId?: string,
): number {
  return ledgers
    .filter((l) => {
      if (branchId && l.branchId !== branchId) return false;
      return isCashBankGroup(l.group_name || l.group);
    })
    .reduce((acc, l) => acc + (balances[l.id] ?? 0), 0);
}
