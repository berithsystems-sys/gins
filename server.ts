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

  app.get("/api/ledgers", async (req, res) => {
    const db = await getDB();
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
    const index = db.ledgers.findIndex(l => l.id === req.params.id);
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
