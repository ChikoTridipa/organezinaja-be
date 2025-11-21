// controllers/event.js
const eventRepository = require("../repositories/event");
const organizerRepository = require("../repositories/organizer"); // Diperlukan untuk Denormalization
const admin = require("firebase-admin");

// 1. CREATE (Buat Event Baru)
const createEvent = async (req, res) => {
  try {
    const { organizer_id, title, description, location, dates, category } =
      req.body;

    // Validasi
    if (
      !organizer_id ||
      !title ||
      !description ||
      !location ||
      !category ||
      !dates ||
      dates.length === 0
    ) {
      return res
        .status(400)
        .json({ message: "Semua field event utama wajib diisi." });
    }
    if (!eventRepository.EVENT_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: `Kategori tidak valid.` });
    }

    // --- Langkah Orkestrasi & Denormalization ---
    const organizer = await organizerRepository.getOrganizerById(organizer_id);
    if (!organizer || organizer.status !== "active") {
      return res
        .status(404)
        .json({ message: "Organizer tidak ditemukan atau belum aktif." });
    }

    // Konversi dates (string) menjadi Firestore Timestamp
    const eventTimestamps = dates.map((dateStr) =>
      admin.firestore.Timestamp.fromDate(new Date(dateStr))
    );

    const dataToCreate = {
      ...req.body,
      organizer_id,
      // Denormalisasi data Organizer
      organizer_name: organizer.name,
      organizer_email: organizer.email,
      dates: eventTimestamps, // Array of Timestamp
    };

    const newEvent = await eventRepository.createEvent(dataToCreate);

    res.status(201).json({
      message: "Event berhasil dibuat",
      data: newEvent,
    });
  } catch (error) {
    console.error("Error creating event in controller: ", error);
    res
      .status(500)
      .json({ message: "Gagal membuat event", error: error.message });
  }
};

// 2. READ ALL (Dengan Filter Kategori)
const getAllEvents = async (req, res) => {
  try {
    const { category } = req.query;
    const events = await eventRepository.getAllEvents(category);
    res.status(200).json(events);
  } catch (error) {
    console.error("Error getting all events: ", error);
    res
      .status(500)
      .json({ message: "Gagal mengambil daftar event", error: error.message });
  }
};

// 3. READ ONE
const getEventById = async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await eventRepository.getEventById(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event tidak ditemukan" });
    }

    res.status(200).json(event);
  } catch (error) {
    console.error("Error getting event by ID: ", error);
    res
      .status(500)
      .json({ message: "Gagal mengambil detail event", error: error.message });
  }
};

// 4. UPDATE
const updateEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const updates = req.body;

    // Konversi dates jika di-update
    if (updates.dates && Array.isArray(updates.dates)) {
      updates.dates = updates.dates.map((dateStr) =>
        admin.firestore.Timestamp.fromDate(new Date(dateStr))
      );
    }

    const result = await eventRepository.updateEvent(eventId, updates);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error updating event: ", error);
    res
      .status(500)
      .json({ message: "Gagal memperbarui event", error: error.message });
  }
};

// 5. DELETE
const deleteEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const result = await eventRepository.deleteEvent(eventId);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error deleting event: ", error);
    res
      .status(500)
      .json({ message: "Gagal menghapus event", error: error.message });
  }
};

module.exports = {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
};
