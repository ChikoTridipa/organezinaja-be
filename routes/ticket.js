// routes/ticket.js
const express = require("express");
const router = express.Router();
const ticketController = require("../controllers/ticket");
// Import Middleware
const { authenticateToken, authorizeRole } = require("../middleware/auth");

// 1. Create Ticket (Hanya Organizer & Admin)
router.post(
  "/",
  authenticateToken,
  authorizeRole(["organizer", "admin"]),
  ticketController.createTicket
);

// 2. Get Tickets by Event (Public - User butuh lihat tiket sebelum beli)
// Jika ingin query ?event_id=XYZ
router.get("/", ticketController.getTicketsByEvent);

// 3. Get Specific Ticket Detail (Public)
router.get("/:id", ticketController.getTicketById);

// 4. Update Ticket (Hanya Organizer & Admin)
router.put(
  "/:id",
  authenticateToken,
  authorizeRole(["organizer", "admin"]),
  ticketController.updateTicket
);

// 5. Delete Ticket (Hanya Organizer & Admin)
router.delete(
  "/:id",
  authenticateToken,
  authorizeRole(["organizer", "admin"]),
  ticketController.deleteTicket
);

module.exports = router;
