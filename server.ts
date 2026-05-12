import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { getDB, saveDB } from "./src/db.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "Tally Prime ERP" });
  });

  // Auth
  app.post("/api/login", async (req, res) => {
    const { username, password, code } = req.body;
    const db = await getDB();
    const user = db.users.find(u => u.username === username && u.password === password);
    
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    
    if (user.role === 'BRANCH') {
      const branch = db.branches.find(b => b.id === user.branchId);
      if (!branch || (code && branch.code !== code)) {
        return res.status(401).json({ error: "Invalid Branch Code" });
      }
    }

    // Log the login
    db.auditLogs.unshift({
      id: Date.now().toString(),
      userId: user.id,
      username: user.username,
      action: 'LOGIN',
      timestamp: new Date().toISOString(),
      branchId: user.branchId,
      details: `Successful login from ${user.role}`
    });
    // Keep only last 1000 logs
    if (db.auditLogs.length > 1000) db.auditLogs.pop();
    await saveDB(db);
    
    res.json(user);
  });

  // Audit Logs (HQ Only)
  app.get("/api/audit", async (req, res) => {
    const db = await getDB();
    res.json(db.auditLogs);
  });

  app.get("/api/export", async (req, res) => {
    const db = await getDB();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=database.json');
    res.send(JSON.stringify(db, null, 2));
  });

  // Branches (HQ Only)
  app.get("/api/branches", async (req, res) => {
    const db = await getDB();
    res.json(db.branches);
  });

  app.post("/api/branches", async (req, res) => {
    const db = await getDB();
    const newBranch = { ...req.body, id: Date.now().toString() };
    db.branches.push(newBranch);
    await saveDB(db);
    res.json(newBranch);
  });

  app.delete("/api/branches/:id", async (req, res) => {
    const db = await getDB();
    db.branches = db.branches.filter(b => b.id !== req.params.id);
    db.ledgers = db.ledgers.filter(l => l.branchId !== req.params.id);
    db.vouchers = db.vouchers.filter(v => v.branchId !== req.params.id);
    await saveDB(db);
    res.json({ success: true });
  });

  app.get("/api/ledgers", async (req, res) => {
    const db = await getDB();
    const { branchId } = req.query;
    if (branchId) {
      return res.json(db.ledgers.filter((l: any) => l.branchId === branchId));
    }
    res.json(db.ledgers);
  });

  app.post("/api/ledgers", async (req, res) => {
    const db = await getDB();
    const newLedger = { id: Date.now().toString(), ...req.body };
    db.ledgers.push(newLedger);
    await saveDB(db);
    res.json(newLedger);
  });

  app.put("/api/ledgers/:id", async (req, res) => {
    const db = await getDB();
    const index = db.ledgers.findIndex((l: any) => l.id === req.params.id);
    if (index !== -1) {
      db.ledgers[index] = { ...db.ledgers[index], ...req.body };
      await saveDB(db);
      res.json(db.ledgers[index]);
    } else {
      res.status(404).json({ error: "Ledger not found" });
    }
  });

  app.get("/api/vouchers", async (req, res) => {
    const db = await getDB();
    const { branchId } = req.query;
    if (branchId) {
      return res.json(db.vouchers.filter((v: any) => v.branchId === branchId));
    }
    res.json(db.vouchers);
  });

  app.post("/api/vouchers", async (req, res) => {
    const db = await getDB();
    const newVoucher = { id: Date.now().toString(), ...req.body };
    db.vouchers.push(newVoucher);
    await saveDB(db);
    res.json(newVoucher);
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
