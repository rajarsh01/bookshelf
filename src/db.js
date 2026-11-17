// Database layer: a thin wrapper around a PostgreSQL connection pool.
const { Pool } = require("pg");

function createDb() {
  const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || "bookuser",
    password: process.env.DB_PASSWORD || "bookpass",
    database: process.env.DB_NAME || "bookdb",
  });

  return {
    // Create the table on first start (safe to run every time).
    async init() {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS books (
          id         SERIAL PRIMARY KEY,
          title      TEXT NOT NULL,
          author     TEXT NOT NULL,
          status     TEXT NOT NULL DEFAULT 'to-read',
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )`);
    },
    async list() {
      const { rows } = await pool.query(
        "SELECT id, title, author, status FROM books ORDER BY id"
      );
      return rows;
    },
    async add(title, author) {
      const { rows } = await pool.query(
        "INSERT INTO books (title, author) VALUES ($1, $2) RETURNING id, title, author, status",
        [title, author]
      );
      return rows[0];
    },
    async setStatus(id, status) {
      const { rows } = await pool.query(
        "UPDATE books SET status = $2 WHERE id = $1 RETURNING id, title, author, status",
        [id, status]
      );
      return rows[0];
    },
    async remove(id) {
      const { rowCount } = await pool.query("DELETE FROM books WHERE id = $1", [id]);
      return rowCount > 0;
    },
    async ping() {
      await pool.query("SELECT 1");
    },
  };
}

module.exports = { createDb };
