// controllers/ticket.js
const ticketRepository = require("../repositories/ticket");
const eventRepository = require("../repositories/event");
const admin = require("firebase-admin");

// 1. CREATE (Buat Ticket Baru)
const createTicket = async (req, res) => {
  try {
    const {
      event_id,
      ticket_type,
      name,
      description,
      price,
      quota,
      sales_start,
      sales_end,
    } = req.body;

    // Validasi
    if (!event_id || !name || !price || !quota) {
      return res.status(400).json({
        message: "Field wajib: event_id, name, price, quota",
      });
    }

    // Validasi event exist
    const event = await eventRepository.getEventById(event_id);
    if (!event) {
      return res.status(404).json({ message: "Event tidak ditemukan" });
    }

    const dataToCreate = {
      ...req.body,
      event_id,
    };

    const newTicket = await ticketRepository.createTicket(dataToCreate);

    res.status(201).json({
      message: "Tiket berhasil dibuat",
      data: newTicket,
    });
  } catch (error) {
    console.error("Error creating ticket: ", error);
    res
      .status(500)
      .json({ message: "Gagal membuat tiket", error: error.message });
  }
};

// 2. READ ALL (Get Tickets by Event ID atau semua)
const getTickets = async (req, res) => {
  try {
    const { event_id } = req.query;

    if (!event_id) {
      return res.status(400).json({
        message: "Parameter event_id wajib diisi",
      });
    }

    const tickets = await ticketRepository.getTicketsByEventId(event_id);
    res.status(200).json(tickets);
  } catch (error) {
    console.error("Error getting tickets: ", error);
    res
      .status(500)
      .json({ message: "Gagal mengambil tiket", error: error.message });
  }
};

// 3. READ ONE
const getTicketById = async (req, res) => {
  try {
    const ticketId = req.params.id;
    const ticket = await ticketRepository.getTicketById(ticketId);

    if (!ticket) {
      return res.status(404).json({ message: "Tiket tidak ditemukan" });
    }

    res.status(200).json(ticket);
  } catch (error) {
    console.error("Error getting ticket by ID: ", error);
    res
      .status(500)
      .json({ message: "Gagal mengambil tiket", error: error.message });
  }
};

// 4. UPDATE
const updateTicket = async (req, res) => {
  try {
    const ticketId = req.params.id;
    const updates = req.body;

    const result = await ticketRepository.updateTicket(ticketId, updates);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error updating ticket: ", error);
    res
      .status(500)
      .json({ message: "Gagal memperbarui tiket", error: error.message });
  }
};

// 5. DELETE
const deleteTicket = async (req, res) => {
  try {
    const ticketId = req.params.id;
    const result = await ticketRepository.deleteTicket(ticketId);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error deleting ticket: ", error);
    res
      .status(500)
      .json({ message: "Gagal menghapus tiket", error: error.message });
  }
};

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
};
