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
        } else {
          console.warn(`Debug: User "${username}" does not exist in the database.`);
          // list users for debug (HQ Only or in dev)
          const allUsers = await db('users').select('username').limit(5);
          console.log(`Available users: ${allUsers.map(u => u.username).join(', ')}`);
        }
        return res.status(401).json({ error: "Invalid credentials" });
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
      
      let errorMessage = "Database error during login";
      let hint = "";

      if (err.code === 'ECONNREFUSED' || err.code === 'ER_ACCESS_DENIED_ERROR') {
        const currentHost = (db.client.config.connection as any).host;
        if (currentHost === 'localhost' || currentHost === '127.0.0.1' || currentHost === '::1') {
          hint = "CRITICAL: You are trying to connect to MySQL on 'localhost'. This environment (AI Studio) DOES NOT have a MySQL server. You MUST use your remote database hostname (e.g., mysql.hostinger.com) in your environment variables.";
        } else {
          hint = "Could not connect to your remote database. Please verify your DB_HOST, DB_USER, and DB_PASSWORD are correct and that Remote MySQL is enabled on your host.";
        }
      }

      res.status(500).json({ 
        error: errorMessage, 
        details: err.message,
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
