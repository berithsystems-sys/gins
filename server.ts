import express from "express";
import "dotenv/config";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db, initDB } from "./src/db.ts";

async function startServer() {
  await initDB();
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "Tally Prime ERP", db: db.client.config.client });
  });

  // Auth
  app.post("/api/login", async (req, res) => {
    const { username, password, code } = req.body;
    
    try {
      const user = await db('users').where({ username, password }).first();
      
      if (!user) return res.status(401).json({ error: "Invalid credentials" });
      
      if (user.role === 'BRANCH') {
        const branch = await db('branches').where({ id: user.branchId }).first();
        if (!branch || (code && branch.code !== code)) {
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
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error during login" });
    }
  });

  // Audit Logs (HQ Only)
  app.get("/api/audit", async (req, res) => {
    const logs = await db('audit_logs').orderBy('timestamp', 'desc').limit(100);
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
    const newBranch = { ...req.body, id: Date.now().toString() };
    await db('branches').insert(newBranch);
    res.json(newBranch);
  });

  app.delete("/api/branches/:id", async (req, res) => {
    await db('branches').where({ id: req.params.id }).delete();
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
