// Server-side JavaScript (Express)
// Contact form persistence uses Replit App Storage at data/contactReceived.json.
const express = require("express");
const session = require("express-session");
const { Client } = require("@replit/object-storage");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_KEY = "data/contactReceived.json";
const REASONS = ["Comment", "Question", "Partnership", "Opportunity", "Other"];
const storage = new Client();
// The SDK initializes its bucket asynchronously. Keep a rejected local
// development initialization from becoming an unhandled process error; API
// requests still report the storage failure with HTTP 500.
if (storage.state && storage.state.promise) storage.state.promise.catch(() => {});

app.set("trust proxy", 1);
app.use(express.json({ limit: "50kb" }));
app.use(session({
  secret: process.env.SESSION_SECRET || "local-development-session-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  }
}));

// App Storage is the only production data source. Writes are serialized so two
// visitors submitting at nearly the same time cannot overwrite one another.
let writeQueue = Promise.resolve();
function withStorageLock(task) {
  const next = writeQueue.then(task, task);
  writeQueue = next.catch(() => {});
  return next;
}

function isMissingObject(error) {
  const message = String(error && (error.message || error.code || error));
  return /404|not found|no such object|does not exist/i.test(message);
}

async function readMessages() {
  const result = await storage.downloadAsText(DATA_KEY);
  if (result.ok) {
    const messages = JSON.parse(result.value);
    if (!Array.isArray(messages)) throw new Error("Stored contact data is not a JSON array.");
    return messages;
  }

  if (!isMissingObject(result.error)) {
    throw new Error("App Storage read failed: " + String(result.error));
  }

  const initialize = await storage.uploadFromText(DATA_KEY, "[]");
  if (!initialize.ok) {
    throw new Error("App Storage initialization failed: " + String(initialize.error));
  }
  return [];
}

async function writeMessages(messages) {
  const result = await storage.uploadFromText(DATA_KEY, JSON.stringify(messages, null, 2));
  if (!result.ok) {
    throw new Error("App Storage write failed: " + String(result.error));
  }
}

function validSubmission(body) {
  const { firstName, lastName, email, reason, message } = body || {};
  return Boolean(
    typeof firstName === "string" && firstName.trim() &&
    typeof lastName === "string" && lastName.trim() &&
    typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    REASONS.includes(reason) &&
    typeof message === "string" && message.trim()
  );
}

// ---------- Public contact endpoint ----------
app.post("/api/contact", async (req, res) => {
  if (!validSubmission(req.body)) {
    return res.status(400).json({
      error: "Invalid submission. Complete every field and enter a valid email address."
    });
  }

  try {
    const record = await withStorageLock(async () => {
      const messages = await readMessages();
      const saved = {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
        firstName: req.body.firstName.trim(),
        lastName: req.body.lastName.trim(),
        email: req.body.email.trim(),
        reason: req.body.reason,
        message: req.body.message.trim(),
        submittedAt: new Date().toISOString(),
        replied: false,
        repliedAt: null
      };
      messages.push(saved);
      await writeMessages(messages);
      return saved;
    });
    return res.status(201).json(record);
  } catch (error) {
    console.error("Contact storage failure:", error);
    return res.status(500).json({ error: "Could not save your message. Please try again later." });
  }
});

// ---------- Admin endpoints (password is read only from Replit Secrets) ----------
app.post("/api/admin/login", (req, res) => {
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Incorrect password." });
  }
  req.session.admin = true;
  return res.json({ success: true });
});

function requireAdmin(req, res, next) {
  if (!req.session?.admin) return res.status(401).json({ error: "Unauthorized" });
  next();
}

app.get("/api/admin/messages", requireAdmin, async (req, res) => {
  try {
    const messages = await readMessages();
    messages.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    return res.json(messages);
  } catch (error) {
    console.error("Admin read failure:", error);
    return res.status(500).json({ error: "Could not read messages." });
  }
});

app.patch("/api/admin/messages/:id/replied", requireAdmin, async (req, res) => {
  try {
    const updated = await withStorageLock(async () => {
      const messages = await readMessages();
      const message = messages.find((item) => item.id === req.params.id);
      if (!message) return null;
      message.replied = true;
      message.repliedAt = new Date().toISOString();
      await writeMessages(messages);
      return message;
    });
    if (!updated) return res.status(404).json({ error: "Message not found." });
    return res.json(updated);
  } catch (error) {
    console.error("Admin update failure:", error);
    return res.status(500).json({ error: "Could not update message." });
  }
});

// ---------- Static site ----------
app.use(express.static(__dirname));
app.use((req, res) => res.status(404).send("404: Page not found"));

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
