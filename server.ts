// ─────────────────────────────────────────────────────────────────────────────
// ADD THIS ENDPOINT to your server.ts — place it near the other /api/ledgers routes
// ─────────────────────────────────────────────────────────────────────────────
//
// GET /api/ledgers/:id/balance?branchId=xxx
//
// Returns the CURRENT (running) balance for a ledger:
//   openingBalance ± all posted voucher entries
//
// Response shape:
//   { balance: number, type: 'Dr' | 'Cr', ledgerId: string, name: string }
//
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/ledgers/:id/balance', async (req, res) => {
  const { id } = req.params;
  const { branchId } = req.query as { branchId?: string };

  try {
    // 1. Fetch the ledger (opening balance + balanceType)
    let ledgerQuery = db('ledgers').where({ id });
    const ledger = await ledgerQuery.first();

    if (!ledger) {
      return res.status(404).json({ error: 'Ledger not found' });
    }

    const openingBalance: number = Number(ledger.openingBalance || 0);
    const openingType: 'Dr' | 'Cr' = ledger.balanceType === 'Cr' ? 'Cr' : 'Dr';

    // Convert opening balance to a signed number (Dr = positive, Cr = negative)
    let runningBalance = openingType === 'Dr' ? openingBalance : -openingBalance;

    // 2. Sum all voucher entries for this ledger
    //    Dr entries increase the balance, Cr entries decrease it
    let entryQuery = db('voucher_entries')
      .join('vouchers', 'voucher_entries.voucherId', '=', 'vouchers.id')
      .where('voucher_entries.ledgerId', id);

    if (branchId) {
      entryQuery = entryQuery.where('vouchers.branchId', branchId);
    }

    const entries = await entryQuery.select(
      'voucher_entries.amount',
      'voucher_entries.type'
    );

    for (const entry of entries) {
      const amt = Number(entry.amount || 0);
      if (entry.type === 'Dr') {
        runningBalance += amt;
      } else {
        runningBalance -= amt;
      }
    }

    // 3. Resolve sign → Dr/Cr label
    const balanceType: 'Dr' | 'Cr' = runningBalance >= 0 ? 'Dr' : 'Cr';
    const balanceAmount = Math.abs(runningBalance);

    res.json({
      ledgerId: id,
      name: ledger.name,
      balance: balanceAmount,
      type: balanceType,
      openingBalance,
      openingType,
      transactionCount: entries.length,
    });
  } catch (err: any) {
    console.error(`[Balance Error] Ledger ${id}:`, err.message);
    res.status(500).json({
      error: 'Failed to compute ledger balance',
      details: err.message,
    });
  }
});
