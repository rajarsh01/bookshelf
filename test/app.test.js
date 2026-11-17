const test = require("node:test");
const assert = require("node:assert");
const { createApp } = require("../src/app");

// A fake in-memory database, so the tests need no PostgreSQL.
function fakeDb() {
  let books = [];
  let nextId = 1;
  return {
    async list() { return books; },
    async add(title, author) {
      const b = { id: nextId++, title, author, status: "to-read" };
      books.push(b);
      return b;
    },
    async setStatus(id, status) {
      const b = books.find((x) => x.id === id);
      if (b) b.status = status;
      return b;
    },
    async remove(id) {
      const before = books.length;
      books = books.filter((x) => x.id !== id);
      return books.length < before;
    },
    async ping() {},
  };
}

// Start the app on a random port, run the test, always shut the server down.
async function withServer(db, fn) {
  const server = createApp(db).listen(0);
  const base = `http://localhost:${server.address().port}`;
  try { await fn(base); } finally { server.close(); }
}

const send = (method, body) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

test("GET /health returns ok", () =>
  withServer(fakeDb(), async (base) => {
    const res = await fetch(`${base}/health`);
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(await res.json(), { status: "ok" });
  }));

test("GET /health/db returns 503 when the database is down", () => {
  const db = fakeDb();
  db.ping = async () => { throw new Error("down"); };
  return withServer(db, async (base) => {
    const res = await fetch(`${base}/health/db`);
    assert.strictEqual(res.status, 503);
  });
});

test("add, list, update status and delete a book", () =>
  withServer(fakeDb(), async (base) => {
    let res = await fetch(`${base}/api/books`, send("POST", { title: "  Dune ", author: "Frank Herbert" }));
    assert.strictEqual(res.status, 201);
    const book = await res.json();
    assert.strictEqual(book.title, "Dune");
    assert.strictEqual(book.status, "to-read");

    res = await fetch(`${base}/api/books`);
    assert.strictEqual((await res.json()).length, 1);

    res = await fetch(`${base}/api/books/${book.id}`, send("PATCH", { status: "finished" }));
    assert.strictEqual((await res.json()).status, "finished");

    res = await fetch(`${base}/api/books/${book.id}`, { method: "DELETE" });
    assert.strictEqual(res.status, 204);

    res = await fetch(`${base}/api/books/${book.id}`, { method: "DELETE" });
    assert.strictEqual(res.status, 404);
  }));

test("POST /api/books rejects a missing author", () =>
  withServer(fakeDb(), async (base) => {
    const res = await fetch(`${base}/api/books`, send("POST", { title: "Dune", author: "  " }));
    assert.strictEqual(res.status, 400);
  }));

test("PATCH /api/books/:id rejects an unknown status", () =>
  withServer(fakeDb(), async (base) => {
    const res = await fetch(`${base}/api/books/1`, send("PATCH", { status: "abandoned" }));
    assert.strictEqual(res.status, 400);
  }));
