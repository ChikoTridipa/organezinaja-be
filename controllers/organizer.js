// controllers/organizer.js
const organizerRepository = require("../repositories/organizer");
const userRepository = require("../repositories/user"); // Diperlukan untuk Denormalization

// 1. CREATE (Pendaftaran Organizer)
const createOrganizer = async (req, res) => {
  try {
    const {
      user_id,
      name,
      description,
      address,
      country,
      state,
      city,
      zip_code,
    } = req.body;

    // Validasi
    if (!user_id || !name || !description || !address) {
      return res
        .status(400)
        .json({ message: "Data Organizer utama wajib diisi." });
    }

    // --- Langkah Orkestrasi & Denormalization ---
    const userData = await userRepository.getUserByUid(user_id);
    if (!userData) {
      return res
        .status(404)
        .json({ message: "Pengguna dengan ID tersebut tidak ditemukan." });
    }

    const dataToCreate = {
      ...req.body, // Ambil semua data dari body
      // Denormalisasi data User
      user_email: userData.email,
      user_phone: userData.phone,
      status: "pending",
    };

    const newOrganizer = await organizerRepository.createOrganizer(
      dataToCreate
    );

    // Update role pengguna menjadi 'organizer'
    await userRepository.updateUser(user_id, { role: "organizer" });

    res.status(201).json({
      message: "Permintaan Organizer berhasil dibuat (Status: Pending)",
      data: newOrganizer,
    });
  } catch (error) {
    console.error("Error creating organizer in controller: ", error);
    if (error.message.includes("sudah terdaftar")) {
      return res.status(409).json({ message: error.message });
    }
    res
      .status(500)
      .json({ message: "Gagal membuat Organizer", error: error.message });
  }
};

// 2. READ ALL
const getAllOrganizers = async (req, res) => {
  try {
    const organizers = await organizerRepository.getAllOrganizers();
    res.status(200).json(organizers);
  } catch (error) {
    console.error("Error getting all organizers: ", error);
    res.status(500).json({
      message: "Gagal mengambil daftar organizer",
      error: error.message,
    });
  }
};

// 3. READ ONE
const getOrganizerById = async (req, res) => {
  try {
    const organizerId = req.params.id;
    const organizer = await organizerRepository.getOrganizerById(organizerId);

    if (!organizer) {
      return res.status(404).json({ message: "Organizer tidak ditemukan" });
    }

    res.status(200).json(organizer);
  } catch (error) {
    console.error("Error getting organizer by ID: ", error);
    res.status(500).json({
      message: "Gagal mengambil detail organizer",
      error: error.message,
    });
  }
};

// 4. UPDATE
const updateOrganizer = async (req, res) => {
  try {
    const organizerId = req.params.id;
    const updates = req.body;

    const result = await organizerRepository.updateOrganizer(
      organizerId,
      updates
    );

    res.status(200).json(result);
  } catch (error) {
    console.error("Error updating organizer: ", error);
    res
      .status(500)
      .json({ message: "Gagal memperbarui Organizer", error: error.message });
  }
};

// 5. DELETE
const deleteOrganizer = async (req, res) => {
  try {
    const organizerId = req.params.id;
    const result = await organizerRepository.deleteOrganizer(organizerId);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error deleting organizer: ", error);
    res
      .status(500)
      .json({ message: "Gagal menghapus Organizer", error: error.message });
  }
};

const verifyOrganizer = async (req, res) => {
  try {
    const organizerId = req.params.id;
    const { status } = req.body; // 'active' atau 'rejected'

    if (!["active", "rejected"].includes(status)) {
      return res
        .status(400)
        .json({ message: "Status harus 'active' atau 'rejected'." });
    }

    // Cek organizer ada atau tidak
    const organizer = await organizerRepository.getOrganizerById(organizerId);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer tidak ditemukan." });
    }

    // Update status
    await organizerRepository.updateOrganizer(organizerId, { status });

    res
      .status(200)
      .json({
        message: `Organizer berhasil diubah statusnya menjadi ${status}.`,
      });
  } catch (error) {
    console.error("Verify Organizer Error:", error);
    res
      .status(500)
      .json({ message: "Gagal memverifikasi organizer", error: error.message });
  }
};

module.exports = {
  createOrganizer,
  getAllOrganizers,
  getOrganizerById,
  updateOrganizer,
  deleteOrganizer,
  verifyOrganizer,
};
