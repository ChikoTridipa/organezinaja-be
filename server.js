// Memuat variabel lingkungan dari file .env
require("dotenv").config();

const express = require("express");
const cors = require("cors");

// Import untuk validasi koneksi Firebase (opsional)
const { db } = require("./config/firebase");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Import semua route yang sudah dibuat
const userRoutes = require("./routes/user");
const organizerRoutes = require("./routes/organizer");
const eventRoutes = require("./routes/event");
const ticketRoutes = require("./routes/ticket");
// const transactionRoutes = require("./routes/transaction"); // ❌ Komen dulu karena belum dibuat

// --- HUBUNGKAN ROUTES ---
app.use("/api/users", userRoutes);
app.use("/api/organizers", organizerRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/tickets", ticketRoutes);
// app.use("/api/transactions", transactionRoutes); // ❌ Komen dulu

// Endpoint utama
app.get("/", (req, res) => {
  res.status(200).json({
    message:
      "Backend Event Manager siap digunakan! Semua route utama terhubung.",
    status: "OK",
  });
});

// --- MULAI SERVER ---
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
  console.log(`✅ Firebase terhubung: ${db ? "Ya" : "Tidak"}`);
});