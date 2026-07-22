/* ===========================================================
   History, Family, and Me — Email List API (Railway)
   Endpoints:
     GET  /                     health check
     POST /api/subscribe        public signup  { name?, email }
     GET  /api/subscribers      admin (Bearer ADMIN_TOKEN)
     DELETE /api/subscribers/:email  admin (Bearer ADMIN_TOKEN)
   =========================================================== */
"use strict";

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
if (!ADMIN_TOKEN) {
  console.error("ADMIN_TOKEN is not set");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("railway.internal")
    ? false
    : { rejectUnauthorized: false },
});

const app = express();
app.use(express.json({ limit: "10kb" }));
app.use(
  cors({
    origin(origin, cb) {
      // Allow no-origin requests (curl, server-to-server) and configured origins.
      if (!origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin) || origin === "null") {
        return cb(null, true);
      }
      cb(new Error("Not allowed by CORS"));
    },
  })
);

/* ---- tiny per-IP rate limit for signups (20/hour) ---- */
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const entry = hits.get(ip) || [];
  const recent = entry.filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear(); // crude memory guard
  return recent.length > 20;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || "";
  if (auth === `Bearer ${ADMIN_TOKEN}`) return next();
  res.status(401).json({ error: "Unauthorized" });
}

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscribers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL UNIQUE,
      source TEXT NOT NULL DEFAULT 'website',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "hfm-email-list-api" });
});

app.post("/api/subscribe", async (req, res) => {
  try {
    if (rateLimited(req.ip)) {
      return res.status(429).json({ error: "Too many requests — try again later." });
    }
    const name = String(req.body.name || "").trim().slice(0, 80);
    const email = String(req.body.email || "").trim().toLowerCase().slice(0, 120);
    const source = String(req.body.source || "website").trim().slice(0, 20);
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: "Please provide a valid email address." });
    }
    const result = await pool.query(
      `INSERT INTO subscribers (name, email, source)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [name, email, source]
    );
    res.json({ success: true, duplicate: result.rowCount === 0 });
  } catch (err) {
    console.error("subscribe error:", err);
    res.status(500).json({ error: "Something went wrong — please try again." });
  }
});

app.get("/api/subscribers", requireAdmin, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT name, email, source, to_char(created_at, 'YYYY-MM-DD') AS date
       FROM subscribers ORDER BY created_at DESC`
    );
    res.json({ subscribers: rows });
  } catch (err) {
    console.error("list error:", err);
    res.status(500).json({ error: "Failed to load subscribers." });
  }
});

app.delete("/api/subscribers/:email", requireAdmin, async (req, res) => {
  try {
    const email = String(req.params.email || "").trim().toLowerCase();
    const result = await pool.query("DELETE FROM subscribers WHERE email = $1", [email]);
    res.json({ success: true, removed: result.rowCount });
  } catch (err) {
    console.error("delete error:", err);
    res.status(500).json({ error: "Failed to remove subscriber." });
  }
});

/* Admin can also add manually (same auth) */
app.post("/api/subscribers", requireAdmin, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim().slice(0, 80);
    const email = String(req.body.email || "").trim().toLowerCase().slice(0, 120);
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: "Please provide a valid email address." });
    }
    const result = await pool.query(
      `INSERT INTO subscribers (name, email, source)
       VALUES ($1, $2, 'manual')
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [name, email]
    );
    res.json({ success: true, duplicate: result.rowCount === 0 });
  } catch (err) {
    console.error("admin add error:", err);
    res.status(500).json({ error: "Failed to add subscriber." });
  }
});

init()
  .then(() => {
    app.listen(PORT, () => console.log(`hfm-email-list-api listening on :${PORT}`));
  })
  .catch((err) => {
    console.error("init failed:", err);
    process.exit(1);
  });
