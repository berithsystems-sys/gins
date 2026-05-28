import express from "express";
import "dotenv/config";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db, initDB } from "./src/db.ts";
import { REQUIRED_ACCOUNT_GROUPS } from "./src/lib/accountGroups.ts";
import {
  computeLedgerBalances,
  sumCashBankClosingBalance,
} from "./src/lib/ledgerBalance.ts";

async function ensureStandardAccountGroups(branchId: string) {
  const existing = await db('account_groups').where({ branchId }).select('name');
  const names = new Set(existing.map((g: { name: string }) => g.name));
  const missing = REQUIRED_ACCOUNT_GROUPS.filter((name) => !names.has(name));
  if (missing.length === 0) return;

  const toInsert = missing.map((name, index) => ({
    id: `${branchId}_std_${Date.now()}_${index}`,
    name,
    branchId,
  }));
  await db('account_groups').insert(toInsert);
  console.log(`[account-groups] Added ${missing.length} group(s) for branch ${branchId}: ${missing.join(', ')}`);
}

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

async function startServer() {
  console.log("Starting server process...");
  
  const app = express();
  const PORT = 3000;
  const HOST = '0.0.0.0';

  console.log(`Port Config: ${PORT} (from env.PORT: ${process.env.PORT})`);

  app.use(express.json());

  // Database Connection Debug Endpoint
  app.get("/api/db-test", async (req, res) => {
    console.log("Starting DB connection test...");
    try {
      await db.raw('SELECT 1 as connected');
      
      const tablesResult = await db.raw("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?", [(db.client.config.connection as any).database]);
      const tables = tablesResult[0].map((t: any) => t.TABLE_NAME);
      
      const userCount = await db('users').count('* as count').first();

      res.json({
        status: "success",
        message: "Connected to Hostinger successfully!",
        config: {
          host: (db.client.config.connection as any).host,
          database: (db.client.config.connection as any).database,
          user: (db.client.config.connection as any).user
        },
        tables: tables,
        users_in_db: userCount?.count || 0
      });
    } catch (err: any) {
      console.error("DB Test Error:", err.message);
      res.status(500).json({
        status: "error",
        message: err.message,
        code: err.code,
        hint: "If this is a timeout or access denied, make sure you added your IP to 'Remote MySQL' in Hostinger hPanel.",
        your_ip_hint: "Check 'what is my ip' on Google and add it to Hostinger."
      });
    }
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "Tally Prime ERP", db: db.client.config.client });
  });

  // Debug endpoint (Developer only)
  app.get("/api/debug", async (req, res) => {
    try {
      const users = await db('users').select('username', 'role', 'branchId');
      const branches = await db('branches').select('*');
      res.json({
        status: "success",
        database: {
          client: db.client.config.client,
          host: (db.client.config.connection as any).host || 'local',
          dbName: (db.client.config.connection as any).database || 'sqlite'
        },
        counts: {
          users: users.length,
          branches: branches.length
        },
        users,
        branches,
        env: {
          NODE_ENV: process.env.NODE_ENV,
          DB_CLIENT: process.env.DB_CLIENT,
          DB_HOST: process.env.DB_HOST ? `${process.env.DB_HOST.substring(0, 3)}...` : 'not set'
        }
      });
    } catch (err: any) {
      res.status(500).json({ 
        status: "error", 
        message: err.message,
        hint: "This often happens if the database connection failed."
      });
    }
  });

  // Auth
  app.post("/api/login", async (req, res) => {
    const { username, password, code } = req.body;
    console.log(`Login attempt: user="${username}", hasPassword=${!!password}, branchCode="${code || 'N/A'}"`);
    
    try {
      const user = await db('users').where({ username, password }).first();
      
      if (!user) {
        console.warn(`Login failed: No user found for credentials matching "${username}"`);
        const userExists = await db('users').where({ username }).first();
        if (userExists) {
          console.warn(`Debug: User "${username}" exists, but password did not match.`);
          return res.status(401).json({ error: "Invalid credentials - password incorrect" });
        } else {
          console.warn(`Debug: User "${username}" does not exist in the database.`);
          const allUsers = await db('users').select('username').limit(5);
          console.log(`Available users: ${allUsers.map(u => u.username).join(', ')}`);
          return res.status(401).json({ error: "Invalid credentials - user not found", hint: `Available users: ${allUsers.map(u => u.username).join(', ')}` });
        }
      }
      
      console.log(`Login success: user="${user.username}", role="${user.role}"`);

      if (user.role === 'BRANCH') {
        const branch = await db('branches').where({ id: user.branchId }).first();
        if (!branch || (code && branch.code !== code)) {
          console.warn(`Login failed: Branch validation failed for user ${username}. BranchId: ${user.branchId}`);
          return res.status(401).json({ error: "Invalid Branch Code" });
        }
      }

      await db('audit_logs').insert({
        id: Date.now().toString(),
        userId: user.id,
        username: user.username,
        action: 'LOGIN',
        timestamp: new Date().toISOString(),
        branchId: user.branchId,
        details: `Successful SQL Login: ${user.role}`
      });
      
      res.json(user);
    } catch (err: any) {
      console.error("Login Database Error:", err);
      console.error("Error code:", err.code);
      console.error("Error message:", err.message);
      
      let errorMessage = "Database error during login";
      let hint = "";

      if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR') {
        const currentHost = (db.client.config.connection as any).host;
        hint = `Cannot connect to database server: ${currentHost}. Please verify: 1) Hostinger Remote MySQL is enabled, 2) Your IP is whitelisted, 3) The hostname is correct.`;
      } else if (err.code === 'ER_ACCESS_DENIED_ERROR' || err.code === 'ER_BAD_DB_ERROR') {
        hint = `Authentication failed. Please check your DB_USER and DB_PASSWORD in environment variables.`;
      } else if (err.code === 'ER_NO_SUCH_TABLE') {
        hint = `Table doesn't exist. Please run the SQL setup script in PhpMyAdmin first.`;
      } else if (err.message.includes('ENOTFOUND') || err.message.includes('getaddrinfo')) {
        hint = `Cannot resolve database hostname. The host "${(db.client.config.connection as any).host}" is not reachable.`;
      }

      res.status(500).json({ 
        error: errorMessage, 
        details: err.message,
        code: err.code,
        hint: hint || "Check your database connection settings in the environment variables."
      });
    }
  });

  // Audit Logs (HQ Only)
  app.get("/api/audit", async (req, res) => {
    const { branchId } = req.query;
    let query = db('audit_logs').orderBy('timestamp', 'desc');
    if (branchId) {
      query = query.where({ branchId });
    }
    const logs = await query.limit(100);
    res.json(logs);
  });

  app.get("/api/export", async (req, res) => {
    const branches = await db('branches').select('*');
    const users = await db('users').select('*');
    const ledgers = await db('ledgers').select('*');
    const vouchers = await db('vouchers').select('*');
    const entries = await db('voucher_entries').select('*');
    const logs = await db('audit_logs').select('*');
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=tally_full_backup.json');
    res.send(JSON.stringify({ branches, users, ledgers, vouchers, entries, logs, timestamp: new Date().toISOString() }, null, 2));
  });

  // Import API (Bulk restore)
  app.post("/api/import", async (req, res) => {
    const data = req.body;
    
    try {
      await db.transaction(async (trx) => {
        if (data.branches?.length) {
          for (const b of data.branches) {
            await trx('branches').insert(b).onConflict('id').merge();
          }
        }
        
        if (data.users?.length) {
          for (const u of data.users) {
            await trx('users').insert(u).onConflict('id').merge();
          }
        }
        
        if (data.ledgers?.length) {
          for (const l of data.ledgers) {
            await trx('ledgers').insert(l).onConflict('id').merge();
          }
        }
        
        if (data.vouchers?.length) {
          for (const v of data.vouchers) {
            const { entries, ...vData } = v;
            await trx('vouchers').insert(vData).onConflict('id').merge();
          }
        }

        if (data.entries?.length) {
           const voucherIds = [...new Set(data.entries.map((e: any) => e.voucherId))];
           if (voucherIds.length > 0) {
             await trx('voucher_entries').whereIn('voucherId', voucherIds as string[]).delete();
           }
           await trx('voucher_entries').insert(data.entries);
        }

        if (data.logs?.length) {
          for (const log of data.logs) {
            await trx('audit_logs').insert(log).onConflict('id').merge();
          }
        }
      });

      res.json({ 
        success: true, 
        branches: data.branches?.length || 0,
        ledgers: data.ledgers?.length || 0,
        vouchers: data.vouchers?.length || 0
      });
    } catch (err: any) {
      console.error("Import Error:", err);
      res.status(500).json({ error: "Failed to import data", details: err.message });
    }
  });

  // Branches (HQ Only)
  app.get("/api/branches", async (req, res) => {
    const branches = await db('branches').select('*');
    res.json(branches);
  });

  app.post("/api/branches", async (req, res) => {
    const { email, password, ...branchData } = req.body;
    const branchId = Date.now().toString();
    const newBranch = { ...branchData, id: branchId };
    
    try {
      await db.transaction(async (trx) => {
        await trx('branches').insert(newBranch);
        
        await trx('users').insert({
          id: Date.now().toString() + "_user",
          username: email,
          password: password,
          role: 'BRANCH',
          branchId: branchId
        });

        const defaultGroups = REQUIRED_ACCOUNT_GROUPS.map((name, index) => ({
          id: `${branchId}_g_${index}`,
          name,
          branchId,
        }));

        await trx('account_groups').insert(defaultGroups);
      });
      
      res.json(newBranch);
    } catch (err: any) {
      console.error("Failed to create branch and user:", err);
      res.status(500).json({ error: "Failed to create branch", details: err.message });
    }
  });

  app.delete("/api/branches/:id", async (req, res) => {
    const { id } = req.params;
    const existing = await db('branches').where({ id }).first();
    if (!existing) {
      return res.status(404).json({ error: 'Branch not found.' });
    }
    try {
      await db.transaction(async (trx) => {
        await trx('users').where({ branchId: id }).delete();
        await trx('branches').where({ id }).delete();
      });
      res.json({ success: true });
    } catch (err: any) {
      console.error('[DELETE branch]', err);
      res.status(500).json({
        error: 'Failed to delete branch. Remove or reassign linked data if this persists.',
        details: err.message,
      });
    }
  });

  /** HQ consolidated cash & bank closing balances (opening + active vouchers, excl. voided). */
  app.get("/api/hq/summary", async (_req, res) => {
    try {
      const branches = await db('branches').select('id', 'code', 'name', 'location');
      const ledgersRaw = await db('ledgers').select('id', 'branchId', 'group_name', 'openingBalance', 'balanceType');
      const ledgers = ledgersRaw.map((l: { group_name?: string }) => ({
        ...l,
        group: l.group_name,
      }));

      const entries = await db('voucher_entries as ve')
        .join('vouchers as v', 've.voucherId', 'v.id')
        .where((qb) => {
          qb.where('v.voided', 0).orWhereNull('v.voided');
        })
        .select('ve.ledgerId', 've.amount', 've.type');

      const balances = computeLedgerBalances(ledgers, entries);
      const consolidatedCashBank = sumCashBankClosingBalance(ledgers, balances);

      const perBranch = branches.map((b: { id: string; code: string; name: string; location: string }) => {
        const cashBank = sumCashBankClosingBalance(ledgers, balances, b.id);
        return {
          id: b.id,
          code: b.code,
          name: b.name,
          location: b.location,
          cashBankBalance: cashBank,
          cashBankBalanceAbs: Math.abs(cashBank),
          cashBankSide: cashBank >= 0 ? 'Dr' : 'Cr',
        };
      });

      res.json({
        branchCount: branches.length,
        consolidatedCashBank,
        consolidatedCashBankAbs: Math.abs(consolidatedCashBank),
        consolidatedSide: consolidatedCashBank >= 0 ? 'Dr' : 'Cr',
        perBranch,
      });
    } catch (err: any) {
      console.error('[HQ summary]', err);
      res.status(500).json({ error: 'Failed to load HQ summary', details: err.message });
    }
  });

  app.put("/api/branches/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await db('branches').where({ id }).update(req.body);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to update branch", details: err.message });
    }
  });

  app.put("/api/branches/:id/reset-password", async (req, res) => {
    const { password } = req.body;
    await db('users').where({ branchId: req.params.id }).update({ password });
    res.json({ success: true });
  });

  app.put("/api/users/:id/password", async (req, res) => {
    const { currentPassword, newPassword, password } = req.body;

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: "Current password is required" });
      }

      const user = await db('users').where({ id: req.params.id, password: currentPassword }).first();
      if (!user) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      await db('users').where({ id: req.params.id }).update({ password: newPassword });
      return res.json({ success: true });
    }

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    await db('users').where({ id: req.params.id }).update({ password });
    res.json({ success: true });
  });

  app.put("/api/users/:id/email", async (req, res) => {
    const { email } = req.body;
    await db('users').where({ id: req.params.id }).update({ username: email });
    res.json({ success: true });
  });

  // Account Groups
  app.get("/api/account-groups", async (req, res) => {
    const { branchId } = req.query;
    if (branchId) {
      await ensureStandardAccountGroups(String(branchId));
    }
    let query = db('account_groups').select('*');
    if (branchId) query = query.where({ branchId });
    res.json(await query);
  });

  app.post("/api/account-groups", async (req, res) => {
    const newGroup = { id: Date.now().toString(), ...req.body };
    await db('account_groups').insert(newGroup);
    res.json(newGroup);
  });

  app.put("/api/account-groups/:id", async (req, res) => {
    await db('account_groups').where({ id: req.params.id }).update(req.body);
    res.json({ success: true });
  });

  app.delete("/api/account-groups/:id", async (req, res) => {
    await db('account_groups').where({ id: req.params.id }).delete();
    res.json({ success: true });
  });

  // Cost Centres
  app.get("/api/cost-centres", async (req, res) => {
    const { branchId } = req.query;
    let query = db('cost_centres').select('*');
    if (branchId) query = query.where({ branchId });
    res.json(await query);
  });

  app.post("/api/cost-centres", async (req, res) => {
    const newCC = { id: Date.now().toString(), ...req.body };
    await db('cost_centres').insert(newCC);
    res.json(newCC);
  });

  app.put("/api/cost-centres/:id", async (req, res) => {
    await db('cost_centres').where({ id: req.params.id }).update(req.body);
    res.json({ success: true });
  });

  app.delete("/api/cost-centres/:id", async (req, res) => {
    await db('cost_centres').where({ id: req.params.id }).delete();
    res.json({ success: true });
  });

  // Employees
  app.get("/api/employees", async (req, res) => {
    const { branchId } = req.query;
    let query = db('employees').select('*');
    if (branchId) query = query.where({ branchId });
    res.json(await query);
  });

  app.post("/api/employees", async (req, res) => {
    const newEmployee = { id: Date.now().toString(), ...req.body };
    await db('employees').insert(newEmployee);
    res.json(newEmployee);
  });

  app.put("/api/employees/:id", async (req, res) => {
    await db('employees').where({ id: req.params.id }).update(req.body);
    res.json({ success: true });
  });

  app.delete("/api/employees/:id", async (req, res) => {
    await db('employees').where({ id: req.params.id }).delete();
    res.json({ success: true });
  });

  // ── LEDGERS ────────────────────────────────────────────────────────────────

  app.get("/api/ledgers", async (req, res) => {
    const { branchId } = req.query;
    let query = db('ledgers').select('*');
    if (branchId) {
      query = query.where({ branchId });
    }
    const ledgers = await query;
    res.json(ledgers.map(l => ({ ...l, group: l.group_name })));
  });

  // IMPORTANT: this /balance route must stay BEFORE /api/ledgers/:id
  // so Express does not treat "balance" as a ledger ID.
  app.get("/api/ledgers/:id/balance", async (req, res) => {
    const { id } = req.params;
    const { branchId } = req.query as { branchId?: string };
    try {
      const ledger = await db('ledgers').where({ id }).first();
      if (!ledger) return res.status(404).json({ error: 'Ledger not found' });

      const openingBalance = Number(ledger.openingBalance || 0);
      let running = ledger.balanceType === 'Cr' ? -openingBalance : openingBalance;

      const entries = await db('voucher_entries')
        .join('vouchers', 'voucher_entries.voucherId', '=', 'vouchers.id')
        .where('voucher_entries.ledgerId', id)
        .where(function () {
          if (branchId) this.where('vouchers.branchId', branchId);
        })
        .where(function () {
          this.where('vouchers.voided', 0).orWhereNull('vouchers.voided');
        })
        .select('voucher_entries.amount', 'voucher_entries.type');

      for (const e of entries) {
        const amt = Number(e.amount || 0);
        running += e.type === 'Dr' ? amt : -amt;
      }

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

  app.post("/api/ledgers", async (req, res) => {
    const { group, ...rest } = req.body;
    const newLedger = { 
      id: Date.now().toString(), 
      group_name: group || rest.group_name,
      ...rest 
    };
    delete (newLedger as any).group;
    await db('ledgers').insert(newLedger);
    res.json(newLedger);
  });

  app.put("/api/ledgers/:id", async (req, res) => {
    const { group, ...rest } = req.body;
    const updateData = { 
      ...rest,
      group_name: group || rest.group_name
    };
    delete (updateData as any).group;
    await db('ledgers').where({ id: req.params.id }).update(updateData);
    res.json({ success: true });
  });

  app.delete("/api/ledgers/:id", async (req, res) => {
    const id = req.params.id;
    const ledger = await db('ledgers').where({ id }).first();
    if (!ledger) {
      return res.status(404).json({ error: 'Ledger not found.' });
    }
    const entryRow = await db('voucher_entries').where({ ledgerId: id }).count('* as count').first();
    const entryCount = Number((entryRow as { count?: number | string })?.count ?? 0);
    if (entryCount > 0) {
      return res.status(400).json({
        error: `Cannot delete "${ledger.name}": it has ${entryCount} voucher line(s). Void or remove those transactions first.`,
      });
    }
    await db('ledgers').where({ id }).delete();
    res.json({ success: true });
  });

  // ── VOUCHERS ───────────────────────────────────────────────────────────────

  app.get("/api/vouchers", async (req, res) => {
    const { branchId } = req.query;
    let query = db('vouchers').select('*');
    if (branchId) {
      query = query.where({ branchId });
    }
    const vouchers = await query;
    
    const vouchersWithEntries = await Promise.all(vouchers.map(async (v) => {
      const entries = await db('voucher_entries')
        .join('ledgers', 'voucher_entries.ledgerId', '=', 'ledgers.id')
        .where({ voucherId: v.id })
        .select('voucher_entries.*', 'ledgers.name as ledger_name');
      return { ...v, entries };
    }));
    
    res.json(vouchersWithEntries);
  });

  app.get("/api/voucher-entries", async (req, res) => {
    const { branchId } = req.query;
    let query = db('voucher_entries')
      .join('vouchers', 'voucher_entries.voucherId', '=', 'vouchers.id')
      .select('voucher_entries.*', 'vouchers.date');
    
    if (branchId) {
      query = query.where('vouchers.branchId', branchId);
    }
    
    const entries = await query;
    res.json(entries);
  });

  app.post("/api/vouchers", async (req, res) => {
    try {
      const { entries, userId, username, ...voucherData } = req.body;
      console.log(`[Voucher POST] Payload received: type=${voucherData.type}, entries=${entries?.length}`);
      
      if (!entries || entries.length === 0) {
        return res.status(400).json({ error: "Voucher must have at least one entry." });
      }

      const voucherId = Date.now().toString();
      const newVoucher = { id: voucherId, ...voucherData };
      
      await db.transaction(async (trx) => {
        console.log(`[Voucher POST] Starting transaction for ID: ${voucherId}`);
        await trx('vouchers').insert(newVoucher);

        const entriesWithId = entries.map((e: any) => ({
          voucherId,
          ledgerId: e.ledgerId,
          amount: Number(e.amount),
          type: e.type,
          costCentreId: e.costCentreId || null,
          methodAdjustment: e.methodAdjustment || 'On Account',
          refNo: e.refNo || ''
        }));
        await trx('voucher_entries').insert(entriesWithId);

        await trx('audit_logs').insert({
          id: Date.now().toString() + "_" + Math.floor(Math.random() * 1000),
          userId: userId || 'system',
          username: username || 'system',
          action: 'VOUCHER_CREATE',
          timestamp: new Date().toISOString(),
          branchId: voucherData.branchId,
          details: `Created ${voucherData.type} Voucher: ${voucherData.number || voucherId} for ₹${voucherData.amount}`
        });
        console.log(`[Voucher POST] Transaction committed for ID: ${voucherId}`);
      });

      res.json({ success: true, id: voucherId });
    } catch (err: any) {
      console.error('[Voucher POST Error]:', err);
      res.status(500).json({ 
        error: 'Internal Server Error during voucher save', 
        details: err.sqlMessage || err.message || 'Check server console for details'
      });
    }
  });

  // ── UPDATE a voucher (Edit Voucher in Day Book) ───────────────────────────
  app.put("/api/vouchers/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const { entries, userId, username, ...voucherData } = req.body;

      const existing = await db('vouchers').where({ id }).first();
      if (!existing) {
        return res.status(404).json({ error: `Voucher ${id} not found.` });
      }

      await db.transaction(async (trx) => {
        if (Object.keys(voucherData).length > 0) {
          await trx('vouchers').where({ id }).update(voucherData);
        }

        if (Array.isArray(entries) && entries.length > 0) {
          await trx('voucher_entries').where({ voucherId: id }).delete();

          const newEntries = entries.map((e: any) => ({
            voucherId: id,
            ledgerId: e.ledgerId,
            amount: Number(e.amount),
            type: e.type,
            costCentreId: e.costCentreId || null,
            methodAdjustment: e.methodAdjustment || 'On Account',
            refNo: e.refNo || '',
          }));
          await trx('voucher_entries').insert(newEntries);
        }

        await trx('audit_logs').insert({
          id: Date.now().toString() + '_upd',
          userId: userId || 'system',
          username: username || 'system',
          action: 'VOUCHER_UPDATE',
          timestamp: new Date().toISOString(),
          branchId: voucherData.branchId || existing.branchId,
          details: `Updated ${existing.type} Voucher: ${existing.number || id}`,
        });
      });

      res.json({ success: true, id });
    } catch (err: any) {
      console.error('[Voucher PUT Error]:', err);
      res.status(500).json({
        error: 'Failed to update voucher',
        details: err.sqlMessage || err.message,
      });
    }
  });

  // ── SOFT-VOID / RESTORE a voucher ─────────────────────────────────────────
  // Called by the Day Book panel with { voided: true } to void,
  // or { voided: false, voidedAt: null } to restore.
  // The voucher row and all its entries are KEPT in the database.
  //
  // DB MIGRATION (run once if columns don't exist yet):
  //   MySQL:  ALTER TABLE vouchers ADD COLUMN voided   TINYINT(1) NOT NULL DEFAULT 0;
  //           ALTER TABLE vouchers ADD COLUMN voidedAt DATETIME   DEFAULT NULL;
  //   SQLite: ALTER TABLE vouchers ADD COLUMN voided   INTEGER NOT NULL DEFAULT 0;
  //           ALTER TABLE vouchers ADD COLUMN voidedAt TEXT    DEFAULT NULL;
  app.patch("/api/vouchers/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const existing = await db('vouchers').where({ id }).first();
      if (!existing) {
        return res.status(404).json({ error: `Voucher ${id} not found.` });
      }

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
        await trx('vouchers').where({ id }).update(patch);

        await trx('audit_logs').insert({
          id: `${Date.now()}_patch`,
          userId: 'system',
          username: 'system',
          action: voided ? 'VOUCHER_VOID' : 'VOUCHER_RESTORE',
          timestamp: new Date().toISOString(),
          branchId: existing.branchId,
          details: `${voided ? 'Voided' : 'Restored'} ${existing.type} Voucher: ${existing.number || id}`,
        });
      });

      const updated = await db('vouchers').where({ id }).first();
      return res.json({ success: true, voucher: updated });
    } catch (err: any) {
      console.error('[Voucher PATCH Error]:', err);
      return res.status(500).json({
        error: 'Failed to update voucher',
        details: err.sqlMessage || err.message,
      });
    }
  });

  // ── HARD-DELETE a voucher (permanent — use Void above for soft-delete) ────
  app.delete("/api/vouchers/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const existing = await db('vouchers').where({ id }).first();
      if (!existing) {
        return res.status(404).json({
          error: `Voucher ${id} not found. It may have already been deleted.`,
        });
      }

      await db.transaction(async (trx) => {
        await trx('voucher_entries').where({ voucherId: id }).delete();
        await trx('vouchers').where({ id }).delete();

        await trx('audit_logs').insert({
          id: Date.now().toString() + '_void',
          userId: 'system',
          username: 'system',
          action: 'VOUCHER_DELETE',
          timestamp: new Date().toISOString(),
          branchId: existing.branchId,
          details: `Hard-deleted ${existing.type} Voucher: ${existing.number || id} for ₹${existing.amount}`,
        });
      });

      res.json({ success: true, id });
    } catch (err: any) {
      console.error('[Voucher DELETE Error]:', err);
      res.status(500).json({
        error: 'Failed to delete voucher',
        details: err.sqlMessage || err.message,
      });
    }
  });

  // ── BANKING ────────────────────────────────────────────────────────────────

  app.get('/api/bank/reconciliations', async (req, res) => {
    const { branchId } = req.query as any;
    let query = db('bank_reconciliations').select('*').orderBy('date', 'desc');
    if (branchId) query = query.where({ branchId });
    const rows = await query.limit(1000);
    res.json(rows);
  });

  app.post('/api/bank/reconciliations', async (req, res) => {
    const payload = req.body;
    try {
      if (payload.id) {
        payload.updatedAt = new Date().toISOString();
        await db('bank_reconciliations').where({ id: payload.id }).update(payload);
        const updated = await db('bank_reconciliations').where({ id: payload.id }).first();
        return res.json(updated);
      }

      const id = Date.now().toString();
      const now = new Date().toISOString();
      const newRow = { id, createdAt: now, updatedAt: now, status: payload.bankDate ? 'RECONCILED' : 'UNRECONCILED', ...payload };
      await db('bank_reconciliations').insert(newRow);
      res.json(newRow);
    } catch (err: any) {
      console.error('Failed to save reconciliation:', err);
      res.status(500).json({ error: 'Failed to save reconciliation', details: err.message });
    }
  });

  app.delete('/api/bank/reconciliations/:id', async (req, res) => {
    await db('bank_reconciliations').where({ id: req.params.id }).delete();
    res.json({ success: true });
  });

  app.post('/api/bank/import', async (req, res) => {
    const { branchId, rows, fileName } = req.body as any;
    if (!rows || !Array.isArray(rows)) return res.status(400).json({ error: 'Invalid rows' });

    const importId = Date.now().toString();
    const now = new Date().toISOString();
    try {
      await db.transaction(async (trx) => {
        await trx('bank_imports').insert({ id: importId, branchId, fileName: fileName || 'uploaded', rows: rows.length, importedAt: now });

        const toInsert = rows.map((r: any, idx: number) => ({
          id: `${importId}_${idx}`,
          branchId,
          date: r.date || r.txnDate || r.statementDate,
          particulars: r.particulars || r.description || r.particulars || '',
          amount: Number(r.amount) || 0,
          txnType: r.txnType || (r.amount && Number(r.amount) < 0 ? 'DR' : 'CR'),
          bankDate: null,
          status: 'UNRECONCILED',
          createdAt: now,
          updatedAt: now
        }));

        if (toInsert.length > 0) await trx('bank_reconciliations').insert(toInsert);
      });

      const inserted = await db('bank_reconciliations').where({ branchId }).orderBy('createdAt', 'desc').limit(rows.length);
      res.json({ importId, rows: inserted });
    } catch (err: any) {
      console.error('Import failed:', err);
      res.status(500).json({ error: 'Import failed', details: err.message });
    }
  });

  app.get('/api/bank/reconciliations/report', async (req, res) => {
    const { branchId } = req.query as any;
    let q = db('bank_reconciliations').select('*');
    if (branchId) q = q.where({ branchId });
    const rows = await q;
    const total = rows.reduce((acc: any, r: any) => acc + Number(r.amount || 0), 0);
    const reconciled = rows.filter((r: any) => r.status === 'RECONCILED').length;
    res.json({ total, count: rows.length, reconciled });
  });

  app.post('/api/bank/reconciliations/:id/sync', async (req, res) => {
    const { ledgerId } = req.body as any;
    const id = req.params.id;
    try {
      const row = await db('bank_reconciliations').where({ id }).first();
      if (!row) return res.status(404).json({ error: 'Not found' });
      const voucherId = Date.now().toString();
      const voucher = { id: voucherId, date: row.date || new Date().toISOString(), type: 'Bank Reconciliation', narration: row.particulars || '', amount: Number(row.amount || 0), branchId: row.branchId };
      await db.transaction(async (trx) => {
        await trx('vouchers').insert(voucher);
        if (ledgerId) {
          const entry = { voucherId, ledgerId, amount: Number(row.amount || 0), type: row.txnType === 'DR' ? 'Dr' : 'Cr' };
          await trx('voucher_entries').insert(entry);
        }
        await trx('bank_reconciliations').where({ id }).update({ status: 'RECONCILED', updatedAt: new Date().toISOString(), bankDate: new Date().toISOString() });
      });
      res.json({ success: true, voucherId });
    } catch (err: any) {
      console.error('Sync failed:', err);
      res.status(500).json({ error: 'Sync failed', details: err.message });
    }
  });

  // ── PDCS ───────────────────────────────────────────────────────────────────

  app.get('/api/pdcs', async (req, res) => {
    const { branchId } = req.query as any;
    try {
      const today = new Date().toISOString().slice(0,10);
      await db('pdcs').where('chequeDate', '<=', today).andWhere({ status: 'PENDING' }).update({ status: 'CLEARED', updatedAt: new Date().toISOString() });
    } catch (e) {
      console.error('Auto-clear PDCS failed:', e);
    }
    let q = db('pdcs').select('*').orderBy('chequeDate','asc');
    if (branchId) q = q.where({ branchId });
    const rows = await q;
    res.json(rows);
  });

  app.post('/api/pdcs', async (req, res) => {
    const { id, branchId, payer, amount, chequeNo, chequeDate, status } = req.body as any;
    try {
      if (id) {
        await db('pdcs').where({ id }).update({ payer, amount, chequeNo, chequeDate, status, updatedAt: new Date().toISOString() });
        return res.json(await db('pdcs').where({ id }).first());
      }
      const nid = Date.now().toString();
      const now = new Date().toISOString();
      await db('pdcs').insert({ id: nid, branchId, payer, amount, chequeNo, chequeDate, status: status || 'PENDING', createdAt: now, updatedAt: now });
      res.json(await db('pdcs').where({ id: nid }).first());
    } catch (err: any) {
      console.error('PDC save failed:', err);
      res.status(500).json({ error: 'Failed to save PDC', details: err.message });
    }
  });

  app.delete('/api/pdcs/:id', async (req, res) => {
    await db('pdcs').where({ id: req.params.id }).delete();
    res.json({ success: true });
  });

  // Get vouchers for a specific ledger
  app.get('/api/vouchers/ledger/:ledgerId', async (req, res) => {
    const { ledgerId } = req.params;
    const { branchId } = req.query as any;

    try {
      let query = db('vouchers')
        .join('voucher_entries', 'vouchers.id', '=', 'voucher_entries.voucherId')
        .where('voucher_entries.ledgerId', ledgerId)
        .select('vouchers.*', 'voucher_entries.amount as entry_amount', 'voucher_entries.type as entry_type')
        .orderBy('vouchers.date', 'desc');

      if (branchId) {
        query = query.where('vouchers.branchId', branchId);
      }

      const rows = await query;
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch ledger vouchers', details: err.message });
    }
  });

  // ── CHEQUE TEMPLATES ───────────────────────────────────────────────────────

  app.get('/api/cheque/templates', async (req, res) => {
    const { branchId } = req.query as any;
    let q = db('cheque_templates').select('*');
    if (branchId) q = q.where({ branchId });
    res.json(await q);
  });

  app.post('/api/cheque/templates', async (req, res) => {
    const { id, branchId, name, template } = req.body as any;
    try {
      if (id) {
        await db('cheque_templates').where({ id }).update({ name, template, updatedAt: new Date().toISOString() });
        return res.json(await db('cheque_templates').where({ id }).first());
      }
      const nid = Date.now().toString();
      const now = new Date().toISOString();
      await db('cheque_templates').insert({ id: nid, branchId, name, template, createdAt: now, updatedAt: now });
      res.json(await db('cheque_templates').where({ id: nid }).first());
    } catch (err: any) {
      console.error('Template save failed:', err);
      res.status(500).json({ error: 'Failed to save template', details: err.message });
    }
  });

  app.delete('/api/cheque/templates/:id', async (req, res) => {
    await db('cheque_templates').where({ id: req.params.id }).delete();
    res.json({ success: true });
  });

  // ── FRONTEND ───────────────────────────────────────────────────────────────

  if (process.env.NODE_ENV !== "production") {
    console.log("Initializing Vite development server...");
    const startTime = Date.now();
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log(`Vite server initialized in ${Date.now() - startTime}ms`);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, async () => {
    console.log(`>>> Tally ERP Server is live on port ${PORT}`);

    try {
      console.log("Initializing database connection in background...");
      await initDB();
      console.log("Database initialized successfully.");
    } catch (error) {
      console.error("DB Initialization Error:", error);
    }
  });
}

startServer();
