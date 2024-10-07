import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { Database } from "bun:sqlite";
import { WebSocketServer } from "ws";
import { serve } from "bun";

// Inisialisasi database dan tabel
const db = new Database("library.db");

db.run(`
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    published_year INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Inisialisasi WebSocket
const wss = new WebSocketServer({
  port: 3001,
});

wss.on("connection", (ws) => {
  ws.send("Welcome to the library notification system!");
});

// Fungsi untuk notifikasi ke semua klien WebSocket
function notifyClients(message: string) {
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  });
}

// Inisialisasi aplikasi Hono
const app = new Hono();

// Mengaktifkan CORS
app.use(cors());

// Menyajikan file statis
app.use("/*", serveStatic({ root: "./" }));

// Rute untuk halaman utama
app.get("/", async (c) => {
  return c.html(await Bun.file("./index.html").text());
});

// Mendapatkan daftar buku
app.get("/books", (c) => {
  const books = db.query("SELECT * FROM books ORDER BY created_at DESC").all();
  return c.json(books);
});

// Menambahkan buku baru
app.post("/books", async (c) => {
  const { title, author, published_year } = await c.req.json();
  db.run(
    "INSERT INTO books (title, author, published_year, created_at) VALUES (?, ?, ?, DATETIME('now'))",
    [title, author, published_year]
  );

  // Kirim notifikasi melalui WebSocket
  notifyClients(`New book added: ${title}`);

  return c.json({ message: "Book added successfully" });
});

// Mengupdate data buku berdasarkan ID
app.put("/books/:id", async (c) => {
  const { id } = c.req.param();
  const { title, author, published_year } = await c.req.json();
  db.run(
    "UPDATE books SET title = ?, author = ?, published_year = ? WHERE id = ?",
    [title, author, published_year, id]
  );

  // Kirim notifikasi melalui WebSocket
  notifyClients(`Book updated`);

  return c.json({ message: "Book updated successfully" });
});

// Menghapus buku berdasarkan ID
app.delete("/books/:id", (c) => {
  const { id } = c.req.param();

  db.run("DELETE FROM books WHERE id = ?", [id]);

  // Kirim notifikasi melalui WebSocket
  notifyClients(`Book deleted`);

  return c.json({ message: "Book deleted successfully" });
});

// Menjalankan server aplikasi
const port = 3000;
const server = serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === "/") {
      return new Response(Bun.file("index.html"));
    }

    if (path === "/app.js") {
      // Change this to serve app.js instead of app.ts
      return new Response(Bun.file("app.js"), {
        headers: {
          "Content-Type": "application/javascript",
        },
      });
    }

    return app.fetch(req);
  },
});

console.log(`Listening on http://localhost:${server.port}`);
