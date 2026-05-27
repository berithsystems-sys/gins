// ─────────────────────────────────────────────────────────────────────────────
// PATCH THIS INTO server.ts
//
// 1. Find the existing DELETE route for vouchers:
//      app.delete("/api/vouchers/:id", ...
//    PASTE the new PATCH route IMMEDIATELY BEFORE it.
//
// 2. No other changes needed — the GET /api/vouchers route already returns
//    all columns (including `voided` / `voidedAt`) from the DB.
//    The frontend already filters client-side based on the voidFilter toggle.
// ─────────────────────────────────────────────────────────────────────────────

// ── SOFT-VOID / RESTORE a voucher (PATCH) ────────────────────────────────────
// Called by the Day Book panel with  { voided: true }  to void,
// or  { voided: false, voidedAt: null }  to restore.
// The voucher row and its entries are KEPT in the database.
app.patch("/api/vouchers/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await db("vouchers").where({ id }).first();
    if (!existing) {
      return res.status(404).json({
        error: `Voucher ${id} not found.`,
      });
    }

    // Only allow patching the void-related fields for safety.
    // Strip anything else the client might accidentally send.
    const { voided, voidedAt } = req.body as {
      voided?: boolean;
      voidedAt?: string | null;
    };

    const patch: Record<string, unknown> = {};
    if (voided !== undefined) patch.voided = voided ? 1 : 0; // SQLite stores booleans as 0/1
    if (voidedAt !== undefined) patch.voidedAt = voidedAt ?? null;

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "Nothing to patch." });
    }

    await db.transaction(async (trx) => {
      await trx("vouchers").where({ id }).update(patch);

      await trx("audit_logs").insert({
        id: `${Date.now()}_patch`,
        userId: "system",
        username: "system",
        action: voided ? "VOUCHER_VOID" : "VOUCHER_RESTORE",
        timestamp: new Date().toISOString(),
        branchId: existing.branchId,
        details: `${voided ? "Voided" : "Restored"} ${existing.type} Voucher: ${
          existing.number || id
        }`,
      });
    });

    const updated = await db("vouchers").where({ id }).first();
    return res.json({ success: true, voucher: updated });
  } catch (err: any) {
    console.error("[Voucher PATCH Error]:", err);
    return res.status(500).json({
      error: "Failed to update voucher",
      details: err.sqlMessage || err.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE MIGRATION NOTE
// If your `vouchers` table does not yet have `voided` and `voidedAt` columns,
// run this SQL once in your DB console (MySQL / SQLite syntax shown):
//
//   ALTER TABLE vouchers ADD COLUMN voided     TINYINT(1) NOT NULL DEFAULT 0;
//   ALTER TABLE vouchers ADD COLUMN voidedAt   DATETIME   DEFAULT NULL;
//
// For SQLite use:
//   ALTER TABLE vouchers ADD COLUMN voided   INTEGER NOT NULL DEFAULT 0;
//   ALTER TABLE vouchers ADD COLUMN voidedAt TEXT    DEFAULT NULL;
// ─────────────────────────────────────────────────────────────────────────────
