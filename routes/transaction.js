// routes/transaction.js
const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/transaction");
const { authenticateToken } = require("../middleware/auth");

// Protected Routes (Require Login)
router.post("/", authenticateToken, transactionController.createTransaction);
router.get("/", authenticateToken, transactionController.getUserTransactions);

// Public Route (Webhook for Payment Gateway)
// Note: Payment Gateway accesses this without User Token, but usually sends a Signature/Key
router.post("/notification", transactionController.handlePaymentWebhook);

router.post(
  "/scan",
  authenticateToken,
  authorizeRole(["ticket_checker", "organizer", "admin"]),
  transactionController.scanTicket
);

module.exports = router;
