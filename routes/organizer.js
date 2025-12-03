// routes/organizer.js
const express = require("express");
const router = express.Router();
const organizerController = require("../controllers/organizer");
// Import Middleware
const { authenticateToken, authorizeRole } = require("../middleware/auth");

// Public (Daftar jadi organizer)
router.post("/", organizerController.createOrganizer);

// Protected Routes
// Get All (Mungkin hanya Admin yang boleh lihat semua, atau publik boleh lihat list organizer aktif?)
// Asumsi: Admin lihat semua (termasuk pending), User lihat yang active saja (perlu penyesuaian di repo nanti)
router.get("/", authenticateToken, organizerController.getAllOrganizers);

router.get("/:id", organizerController.getOrganizerById);

// Update (Hanya pemilik/Admin) - Perlu logic cek kepemilikan di controller (serupa dengan ticket)
router.put("/:id", authenticateToken, organizerController.updateOrganizer);

// Delete (Admin only)
router.delete(
  "/:id",
  authenticateToken,
  authorizeRole(["admin"]),
  organizerController.deleteOrganizer
);

// NEW: Verify Organizer (Hanya Admin)
router.patch(
  "/:id/verify",
  authenticateToken,
  authorizeRole(["admin"]),
  organizerController.verifyOrganizer
);

module.exports = router;
