const { admin } = require("../config/firebase");
const userRepository = require("../repositories/user");

/**
 * Middleware untuk memverifikasi Token Firebase (Authentication)
 * dan mengambil data role pengguna dari database.
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "Akses ditolak. Token tidak ditemukan." });
    }

    const idToken = authHeader.split("Bearer ")[1];

    // 1. Verifikasi Token via Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // 2. Ambil data role pengguna dari Firestore (menggunakan repository user yang sudah ada)
    const userProfile = await userRepository.getUserByUid(decodedToken.uid);

    if (!userProfile) {
      return res
        .status(404)
        .json({ message: "Data pengguna tidak ditemukan di database." });
    }

    // 3. Simpan data user ke object request agar bisa dipakai di controller
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: userProfile.role, // role: 'user', 'organizer', 'admin', 'ticket_checker'
      ...userProfile,
    };

    next();
  } catch (error) {
    console.error("Error verifying token:", error);
    return res
      .status(403)
      .json({ message: "Token tidak valid atau kedaluwarsa." });
  }
};

/**
 * Middleware untuk membatasi akses berdasarkan Role (Authorization)
 * @param {Array<string>} allowedRoles - Daftar role yang diizinkan (contoh: ['admin', 'organizer'])
 */
const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res
        .status(403)
        .json({ message: "Akses dilarang. Role pengguna tidak diketahui." });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res
        .status(403)
        .json({
          message: `Akses dilarang. Halaman ini khusus untuk ${allowedRoles.join(
            " atau "
          )}.`,
        });
    }

    next();
  };
};

module.exports = { authenticateToken, authorizeRole };
