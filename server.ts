import express from "express";
import "dotenv/config";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db, initDB } from "./src/db.ts";

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
      // Test basic connection
      await db.raw('SELECT 1 as connected');
      
      // Get table list
      const tablesResult = await db.raw("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?", [(db.client.config.connection as any).database]);
      const tables = tablesResult[0].map((t: any) => t.TABLE_NAME);
      
      // Get user count
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
        // Check if user exists at all without password to narrow down the issue
        const userExists = await db('users').where({ username }).first();
        if (userExists) {
          console.warn(`Debug: User "${username}" exists, but password did not match.`);
          return res.status(401).json({ error: "Invalid credentials - password incorrect" });
        } else {
          console.warn(`Debug: User "${username}" does not exist in the database.`);
          // list users for debug (HQ Only or in dev)
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

      // Log the login
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

      // Check connection issues
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
        // Create branch
        await trx('branches').insert(newBranch);
        
        // Create corresponding user
        await trx('users').insert({
          id: Date.now().toString() + "_user",
          username: email,
          password: password,
          role: 'BRANCH',
          branchId: branchId
        });

        // Seed default groups for the new branch
        const defaultGroups = [
          'Capital Account', 'Current Assets', 'Current Liabilities', 'Fixed Assets', 
          'Investments', 'Loans (Liability)', 'Suspense Account', 'Sales Account', 
          'Purchase Account', 'Direct Income', 'Indirect Income', 'Direct Expenses', 
          'Indirect Expenses'
        ].map((name, index) => ({ id: `${branchId}_g_${index}`, name, branchId }));
        
        await trx('account_groups').insert(defaultGroups);
      });
      
      res.json(newBranch);
    } catch (err: any) {
      console.error("Failed to create branch and user:", err);
      res.status(500).json({ error: "Failed to create branch", details: err.message });
    }
  });

  app.delete("/api/branches/:id", async (req, res) => {
    await db('branches').where({ id: req.params.id }).delete();
    // Also delete user associated with this branch
    await db('users').where({ branchId: req.params.id }).delete();
    res.json({ success: true });
  });

  app.put("/api/branches/:id/reset-password", async (req, res) => {
    const { password } = req.body;
    await db('users').where({ branchId: req.params.id }).update({ password });
    res.json({ success: true });
  });

  app.put("/api/users/:id/password", async (req, res) => {
    const { password } = req.body;
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

  app.get("/api/ledgers", async (req, res) => {
    const { branchId } = req.query;
    let query = db('ledgers').select('*');
    if (branchId) {
      query = query.where({ branchId });
    }
    const ledgers = await query;
    res.json(ledgers.map(l => ({ ...l, group: l.group_name }))); // Compatibility
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
    await db('ledgers').where({ id: req.params.id }).delete();
    res.json({ success: true });
  });

  app.get("/api/vouchers", async (req, res) => {
    const { branchId } = req.query;
    let query = db('vouchers').select('*');
    if (branchId) {
      query = query.where({ branchId });
    }
    const vouchers = await query;
    
    // Fetch entries for each voucher
    const vouchersWithEntries = await Promise.all(vouchers.map(async (v) => {
      const entries = await db('voucher_entries').where({ voucherId: v.id });
      return { ...v, entries };
    }));
    
    res.json(vouchersWithEntries);
  });

  app.post("/api/vouchers", async (req, res) => {
    const { entries, ...voucherData } = req.body;
    const voucherId = Date.now().toString();
    const newVoucher = { id: voucherId, ...voucherData };
    
    await db.transaction(async (trx) => {
      await trx('vouchers').insert(newVoucher);
      if (entries && entries.length > 0) {
        const entriesWithId = entries.map((e: any) => ({ ...e, voucherId }));
        await trx('voucher_entries').insert(entriesWithId);
      }
    });

    res.json({ ...newVoucher, entries });
  });

  // Banking: Reconciliations
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

  // Bank statement import (bulk)
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

  // Simple reconciliation report
  app.get('/api/bank/reconciliations/report', async (req, res) => {
    const { branchId } = req.query as any;
    let q = db('bank_reconciliations').select('*');
    if (branchId) q = q.where({ branchId });
    const rows = await q;
    const total = rows.reduce((acc: any, r: any) => acc + Number(r.amount || 0), 0);
    const reconciled = rows.filter((r: any) => r.status === 'RECONCILED').length;
    res.json({ total, count: rows.length, reconciled });
  });

  // Sync a reconciliation to a voucher (simple support) - requires ledgerId in body
  app.post('/api/bank/reconciliations/:id/sync', async (req, res) => {
    const { ledgerId } = req.body as any;
    const id = req.params.id;
    try {
      const row = await db('bank_reconciliations').where({ id }).first();
      if (!row) return res.status(404).json({ error: 'Not found' });
      // Create a simple voucher for this reconciliation
      const voucherId = Date.now().toString();
      const voucher = { id: voucherId, date: row.date || new Date().toISOString(), type: 'Bank Reconciliation', narration: row.particulars || '', amount: Number(row.amount || 0), branchId: row.branchId };
      await db.transaction(async (trx) => {
        await trx('vouchers').insert(voucher);
        if (ledgerId) {
          // debit or credit depends on txnType
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

  // PDCS endpoints
  app.get('/api/pdcs', async (req, res) => {
    const { branchId } = req.query as any;
    // auto-clear PDCS whose chequeDate <= today
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

  // Cheque templates
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
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
