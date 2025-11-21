// controllers/user.js
const userRepository = require("../repositories/user");

// 1. CREATE
const createUser = async (req, res) => {
  try {
    const { firebase_uid, email, first_name, last_name, phone } = req.body;

    // Validasi Sederhana
    if (!firebase_uid || !email || !first_name || !phone) {
      return res
        .status(400)
        .json({ message: "UID, email, nama depan, dan telepon wajib diisi." });
    }

    const userData = {
      image_url: req.body.image_url || null,
      first_name,
      last_name,
      email,
      phone,
      date_of_birth: req.body.date_of_birth
        ? new Date(req.body.date_of_birth)
        : null,
    };

    const newUser = await userRepository.createUser(firebase_uid, userData);

    res.status(201).json({
      message: "Profile pengguna berhasil dibuat",
      data: newUser,
    });
  } catch (error) {
    console.error("Error creating user profile in controller: ", error);
    if (error.message === "Pengguna sudah terdaftar") {
      return res.status(409).json({ message: error.message });
    }
    res
      .status(500)
      .json({
        message: "Gagal membuat profile pengguna",
        error: error.message,
      });
  }
};

// 2. READ ONE
const getUserByUid = async (req, res) => {
  try {
    const uid = req.params.uid;
    const user = await userRepository.getUserByUid(uid);

    if (!user) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error getting user profile in controller: ", error);
    res
      .status(500)
      .json({
        message: "Gagal mengambil profile pengguna",
        error: error.message,
      });
  }
};

// 3. UPDATE
const updateUser = async (req, res) => {
  try {
    const uid = req.params.uid;
    const updates = req.body;

    await userRepository.updateUser(uid, updates);

    res
      .status(200)
      .json({ message: "Profile pengguna berhasil diperbarui", id: uid });
  } catch (error) {
    console.error("Error updating user profile in controller: ", error);
    if (error.code === 5 && error.details.includes("No document to update")) {
      return res
        .status(404)
        .json({ message: "Gagal memperbarui: Pengguna tidak ditemukan." });
    }
    res
      .status(500)
      .json({
        message: "Gagal memperbarui profile pengguna",
        error: error.message,
      });
  }
};

// 4. DELETE
const deleteUser = async (req, res) => {
  try {
    const uid = req.params.uid;
    await userRepository.deleteUser(uid);
    res
      .status(200)
      .json({ message: "Profile pengguna berhasil dihapus", id: uid });
  } catch (error) {
    console.error("Error deleting user profile in controller: ", error);
    res
      .status(500)
      .json({
        message: "Gagal menghapus profile pengguna",
        error: error.message,
      });
  }
};

module.exports = {
  createUser,
  getUserByUid,
  updateUser,
  deleteUser,
};
