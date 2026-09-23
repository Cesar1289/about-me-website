// Server-side JavaScript (Express)
// Contact form persistence uses Replit App Storage at: data/contactReceived.json
const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_KEY = "data/contactReceived.json";
const LOCAL_FILE = path.join(__dirname, "data", "contactReceived.json");
const REASONS = ["Comment", "Question", "Partnership", "Opportunity", "Other"];

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || "about-me-website-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true }
}));

// ---------- App Storage layer (Replit App Storage first, local file fallback) ----------
let replitStorage = null;
try {
  const mod = require("@replit/storage");
  if (mod.Storage) replitStorage = new mod.Storage();
  else if (typeof mod.get === "function") replitStorage = mod;
} catch (e) { /* not on Replit */ }

async function readMessages() {
  let raw = null;
  if (replitStorage) {
    raw = await replitStorage.get(DATA_KEY);
    if (typeof raw === "string") raw = JSON.parse(raw);
  } else if (process.env.REPLIT_DB_URL) {
    const res = await fetch(process.env.REPLIT_DB_URL + "/" + encodeURIComponent(DATA_KEY));
    if (res.status === 200) raw = JSON.parse(await res.text());
  } else {
    if (fs.existsSync(LOCAL_FILE)) raw = JSON.parse(fs.readFileSync(LOCAL_FILE, "utf8"));
  }
  if (!Array.isArray(raw)) raw = []; // initialize to [] if missing
  return raw;
}

async function writeMessages(arr) {
  const json = JSON.stringify(arr, null, 2);
  if (replitStorage) {
    await replitStorage.set(DATA_KEY, json);
  } else if (process.env.REPLIT_DB_URL) {
    await fetch(process.env.REPLIT_DB_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: DATA_KEY + "=" + encodeURIComponent(json)
    });
  } else {
    fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true });
    fs.writeFileSync(LOCAL_FILE, json);
  }
}

// ---------- Public contact endpoint ----------
app.post("/api/contact", async (req, res) => {
  try {
    const { firstName, lastName, email, reason, message } = req.body || {};
    const valid =
      firstName && typeof firstName === "string" && firstName.trim() &&
      lastName && typeof lastName === "string" && lastName.trim() &&
      email && typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
      REASONS.includes(reason) &&
      message && typeof message === "string" && message.trim();
    if (!valid) return res.status(400).json({ error: "Invalid submission. All fields are required and the email must be valid." });

    const messages = await readMessages();
    const record = {
      id: Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      reason,
      message: message.trim(),
      submittedAt: new Date().toISOString(),
      replied: false,
      repliedAt: null
    };
    messages.push(record);
    await writeMessages(messages);
    res.status(201).json(record);
  } catch (err) {
    console.error("Storage failure:", err);
    res.status(500).json({ error: "Could not save your message. Please try again later." });
  }
});

// ---------- Admin endpoints (password from Replit Secrets) ----------
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body || {};
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Incorrect password." });
  }
  req.session.admin = true;
  res.json({ success: true });
});

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.admin) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

app.get("/api/admin/messages", requireAdmin, async (req, res) => {
  try {
    const messages = await readMessages();
    messages.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)); // newest first
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Could not read messages." });
  }
});

app.patch("/api/admin/messages/:id/replied", requireAdmin, async (req, res) => {
  try {
    const messages = await readMessages();
    const msg = messages.find((m) => m.id === req.params.id);
    if (!msg) return res.status(404).json({ error: "Message not found." });
    msg.replied = true;
    msg.repliedAt = new Date().toISOString();
    await writeMessages(messages);
    res.json(msg);
  } catch (err) {
    res.status(500).json({ error: "Could not update message." });
  }
});

// ---------- Static site ----------
app.use(express.static(__dirname));

app.use((req, res) => res.status(404).send("404: Page not found"));

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
