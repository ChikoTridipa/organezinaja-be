// controllers/transaction.js
const transactionRepository = require("../repositories/transaction");
const ticketRepository = require("../repositories/ticket");

// 1. CREATE TRANSACTION (Checkout)
const createTransaction = async (req, res) => {
  try {
    const { ticket_id, quantity, payment_method } = req.body;
    const user_id = req.user.uid; // From auth middleware

    if (!ticket_id || !quantity) {
      return res
        .status(400)
        .json({ message: "Ticket ID and quantity are required." });
    }

    // A. Validate Ticket & Stock
    const ticket = await ticketRepository.getTicketById(ticket_id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    if (ticket.stock < quantity) {
      return res.status(400).json({ message: "Insufficient ticket stock." });
    }

    // B. Calculate Total Price
    const total_price = ticket.price * quantity;

    // C. Lock Stock (Decrement stock immediately)
    // Note: In production, use Firestore Transaction to ensure atomicity
    await ticketRepository.updateTicket(ticket_id, {
      stock: ticket.stock - quantity,
    });

    // D. Create Transaction Record
    const transactionData = {
      user_id,
      ticket_id,
      ticket_name: ticket.name,
      event_id: ticket.event_id,
      quantity: Number(quantity),
      total_price,
      payment_method: payment_method || "bank_transfer",
      payment_details: null, // Will be filled by Payment Gateway
    };

    const newTransaction = await transactionRepository.createTransaction(
      transactionData
    );

    // E. Mock Payment Gateway Interaction
    // In real implementation, call Payment Gateway API here (e.g., Snap API)
    const mockPaymentResponse = {
      payment_url: `https://mock-payment-gateway.com/pay/${newTransaction.id}`,
      va_number: "1234567890",
      expiry_time: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    };

    // Update transaction with payment details
    await transactionRepository.updateTransactionStatus(
      newTransaction.id,
      "pending",
      {
        payment_details: mockPaymentResponse,
      }
    );

    res.status(201).json({
      message: "Transaction created",
      data: { ...newTransaction, payment_details: mockPaymentResponse },
    });
  } catch (error) {
    console.error("Transaction Error:", error);
    res
      .status(500)
      .json({ message: "Transaction failed", error: error.message });
  }
};

// 2. WEBHOOK HANDLER (Simulation)
// This endpoint receives notifications from Payment Gateway
const handlePaymentWebhook = async (req, res) => {
  try {
    // In real app: Verify signature from Payment Gateway first!
    const { transaction_id, status } = req.body; // e.g., status: 'settlement', 'expire'

    const transaction = await transactionRepository.getTransactionById(
      transaction_id
    );
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    // Logic based on payment status
    if (status === "settlement" || status === "success") {
      // 1. Update status to paid
      await transactionRepository.updateTransactionStatus(
        transaction_id,
        "paid"
      );

      // 2. Generate Ticket (In User's 'My Tickets' collection or send Email)
      // await ticketService.generateUserTicket(...)

      console.log(`Transaction ${transaction_id} PAID. Ticket generated.`);
    } else if (
      status === "expire" ||
      status === "cancel" ||
      status === "deny"
    ) {
      // 1. Update status to failed
      await transactionRepository.updateTransactionStatus(
        transaction_id,
        "failed"
      );

      // 2. Return Stock
      const ticket = await ticketRepository.getTicketById(
        transaction.ticket_id
      );
      if (ticket) {
        await ticketRepository.updateTicket(transaction.ticket_id, {
          stock: ticket.stock + transaction.quantity,
        });
      }
      console.log(`Transaction ${transaction_id} FAILED. Stock returned.`);
    }

    res.status(200).json({ message: "Webhook processed" });
  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).json({ message: "Webhook processing failed" });
  }
};

// 3. GET USER TRANSACTIONS
const getUserTransactions = async (req, res) => {
  try {
    const user_id = req.user.uid;
    const transactions = await transactionRepository.getTransactionsByUserId(
      user_id
    );
    res.status(200).json(transactions);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch transactions", error: error.message });
  }
};

// 4. SCAN TICKET (Validation at Venue)
const scanTicket = async (req, res) => {
  try {
    // qr_code disumsikan berisi transaction_id
    const { qr_code } = req.body;

    if (!qr_code) {
      return res
        .status(400)
        .json({ message: "QR Code (Transaction ID) wajib discan." });
    }

    const transaction = await transactionRepository.getTransactionById(qr_code);

    if (!transaction) {
      return res
        .status(404)
        .json({ message: "Tiket tidak valid/tidak ditemukan." });
    }

    // Cek Status
    if (transaction.status === "used") {
      return res
        .status(400)
        .json({ message: "Tiket sudah digunakan sebelumnya!" });
    }

    if (transaction.status !== "paid") {
      return res
        .status(400)
        .json({ message: "Tiket belum lunas atau kadaluarsa." });
    }

    // TODO: (Opsional) Validasi apakah User Checker yang scan bertugas di Event ID yang sesuai dengan tiket.

    // Update status menjadi 'used' + catat waktu scan
    await transactionRepository.updateTransactionStatus(qr_code, "used", {
      scanned_at: new Date(),
      scanned_by: req.user.uid,
    });

    res.status(200).json({
      message: "Validasi Berhasil. Silakan masuk.",
      data: {
        ticket_name: transaction.ticket_name,
        visitor_name: req.user.email, // Atau ambil detail user jika perlu
      },
    });
  } catch (error) {
    console.error("Scan Error:", error);
    res
      .status(500)
      .json({ message: "Gagal memvalidasi tiket", error: error.message });
  }
};

module.exports = {
  createTransaction,
  handlePaymentWebhook,
  getUserTransactions,
  scanTicket,
};
