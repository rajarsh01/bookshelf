// Web layer: an Express app. The database is passed in, so tests can use a fake one.
const express = require("express");
const os = require("os");
const path = require("path");

const STATUSES = ["to-read", "reading", "finished"];

function createApp(db) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, "..", "public")));

  // Is the web server alive? (does not touch the database)
  app.get("/health", (req, res) => res.json({ status: "ok" }));

  // Can the web server reach the database?
  app.get("/health/db", async (req, res) => {
    try {
      await db.ping();
      res.json({ status: "ok", database: "connected" });
    } catch (err) {
      res.status(503).json({ status: "error", database: "unreachable" });
    }
  });

  // Which container answered? Handy to show on screen that Docker is really running it.
  app.get("/api/info", async (req, res) => {
    let database = "connected";
    try { await db.ping(); } catch (err) { database = "unreachable"; }
    res.json({ container: os.hostname(), database });
  });

  // Turn database errors into a clean 500 instead of crashing the request.
  const wrap = (fn) => async (req, res) => {
    try {
      await fn(req, res);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "database error" });
    }
  };

  const clean = (v) => (typeof v === "string" ? v.trim().slice(0, 200) : "");

  app.get("/api/books", wrap(async (req, res) => res.json(await db.list())));

  app.post("/api/books", wrap(async (req, res) => {
    const title = clean(req.body.title);
    const author = clean(req.body.author);
    if (!title || !author) {
      return res.status(400).json({ error: "title and author are required" });
    }
    res.status(201).json(await db.add(title, author));
  }));

  app.patch("/api/books/:id", wrap(async (req, res) => {
    const { status } = req.body;
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${STATUSES.join(", ")}` });
    }
    const book = await db.setStatus(Number(req.params.id), status);
    if (!book) return res.status(404).json({ error: "book not found" });
    res.json(book);
  }));

  app.delete("/api/books/:id", wrap(async (req, res) => {
    const removed = await db.remove(Number(req.params.id));
    if (!removed) return res.status(404).json({ error: "book not found" });
    res.status(204).end();
  }));

  return app;
}

module.exports = { createApp, STATUSES };
