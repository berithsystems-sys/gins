// ─────────────────────────────────────────────────────────────────────────────
// ADD THIS BLOCK to your server.ts
// Place it right after your existing app.get("/api/ledgers", ...) route
// ─────────────────────────────────────────────────────────────────────────────

  // Current balance for a single ledger = opening balance ± all voucher entries
  app.get("/api/ledgers/:id/balance", async (req, res) => {
    const { id } = req.params;
    const { branchId } = req.query as { branchId?: string };

    try {
      // 1. Get the ledger's opening balance
      const ledger = await db('ledgers').where({ id }).first();
      if (!ledger) return res.status(404).json({ error: 'Ledger not found' });

      const openingBalance = Number(ledger.openingBalance || 0);
      // Dr = positive, Cr = negative
      let running = ledger.balanceType === 'Cr' ? -openingBalance : openingBalance;

      // 2. Sum all posted voucher entries for this ledger
      let query = db('voucher_entries')
        .join('vouchers', 'voucher_entries.voucherId', '=', 'vouchers.id')
        .where('voucher_entries.ledgerId', id)
        .select('voucher_entries.amount', 'voucher_entries.type');

      if (branchId) query = query.where('vouchers.branchId', branchId);

      const entries = await query;
      for (const e of entries) {
        const amt = Number(e.amount || 0);
        running += e.type === 'Dr' ? amt : -amt;
      }

      // 3. Return normalised result
      res.json({
        ledgerId: id,
        name: ledger.name,
        balance: Math.abs(running),
        type: running >= 0 ? 'Dr' : 'Cr',
      });
    } catch (err: any) {
      console.error(`[Balance] Ledger ${id}:`, err.message);
      res.status(500).json({ error: 'Failed to compute balance', details: err.message });
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
