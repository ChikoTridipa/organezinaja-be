// controllers/auth.controller.js
const authRepository = require("../repositories/auth.repository");
const userRepository = require("../repositories/user.repository");
const otpRepository = require("../repositories/otp.repository");
const otpService = require("../services/otp.service");
const emailService = require("../services/email.service");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

/**
 * REGISTER - Registrasi user baru dengan OTP verification
 */
const register = async (req, res) => {
  try {
    const { email, password, first_name, last_name, phone } = req.body;

    // Validasi input
    if (!email || !password || !first_name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Email, password, first name, dan phone wajib diisi",
      });
    }

    // Cek apakah email sudah terdaftar
    const existingUser = await userRepository.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email sudah terdaftar",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate OTP
    const otpCode = otpService.generateOTP();

    // Simpan OTP session
    await otpRepository.createOTPSession({
      email,
      phone,
      otp_code: await bcrypt.hash(otpCode, 10),
      otp_type: "registration",
      expires_at: new Date(Date.now() + 10 * 60 * 1000), // 10 menit
    });

    // Kirim OTP via email
    await emailService.sendOTPEmail(email, otpCode, first_name);

    // Simpan data registrasi temporary (belum final)
    await authRepository.createPendingUser({
      email,
      password: hashedPassword,
      first_name,
      last_name,
      phone,
    });

    res.status(200).json({
      success: true,
      message: "OTP telah dikirim ke email Anda. Silakan verifikasi.",
      data: {
        email,
        otp_expires_in: "10 minutes",
      },
    });
  } catch (error) {
    console.error("Error in register:", error);
    res.status(500).json({
      success: false,
      message: "Gagal melakukan registrasi",
      error: error.message,
    });
  }
};

/**
 * VERIFY OTP - Verifikasi OTP untuk registrasi
 */
const verifyOTP = async (req, res) => {
  try {
    const { email, otp_code } = req.body;

    if (!email || !otp_code) {
      return res.status(400).json({
        success: false,
        message: "Email dan OTP code wajib diisi",
      });
    }

    // Cari OTP session
    const otpSession = await otpRepository.getOTPSession(email, "registration");

    if (!otpSession) {
      return res.status(404).json({
        success: false,
        message: "OTP tidak ditemukan atau sudah expired",
      });
    }

    // Cek apakah OTP sudah expired
    if (new Date() > otpSession.expires_at.toDate()) {
      return res.status(400).json({
        success: false,
        message: "OTP sudah expired. Silakan request OTP baru.",
      });
    }

    // Cek attempts
    if (otpSession.attempts >= otpSession.max_attempts) {
      return res.status(429).json({
        success: false,
        message: "Terlalu banyak percobaan. Silakan request OTP baru.",
      });
    }

    // Verify OTP
    const isValidOTP = await bcrypt.compare(otp_code, otpSession.otp_code);

    if (!isValidOTP) {
      // Increment attempts
      await otpRepository.incrementOTPAttempts(otpSession.id);

      return res.status(400).json({
        success: false,
        message: "OTP tidak valid",
        remaining_attempts: otpSession.max_attempts - otpSession.attempts - 1,
      });
    }

    // OTP Valid - Create user account
    const pendingUser = await authRepository.getPendingUser(email);

    if (!pendingUser) {
      return res.status(404).json({
        success: false,
        message: "Data registrasi tidak ditemukan",
      });
    }

    // Create Firebase Auth user
    const firebaseUser = await authRepository.createFirebaseUser({
      email: pendingUser.email,
      password: pendingUser.password,
    });

    // Create user in Firestore
    const newUser = await userRepository.createUser(firebaseUser.uid, {
      email: pendingUser.email,
      first_name: pendingUser.first_name,
      last_name: pendingUser.last_name,
      phone: pendingUser.phone,
      email_verified: true,
      phone_verified: false,
    });

    // Mark OTP as verified
    await otpRepository.markOTPAsVerified(otpSession.id);

    // Delete pending user
    await authRepository.deletePendingUser(email);

    // Generate JWT token
    const token = jwt.sign(
      {
        user_id: newUser.id,
        email: newUser.email,
        role: newUser.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    // Send welcome email
    await emailService.sendWelcomeEmail(newUser.email, newUser.first_name);

    res.status(201).json({
      success: true,
      message: "Registrasi berhasil",
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          role: newUser.role,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Error in verifyOTP:", error);
    res.status(500).json({
      success: false,
      message: "Gagal verifikasi OTP",
      error: error.message,
    });
  }
};

/**
 * RESEND OTP - Kirim ulang OTP
 */
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email wajib diisi",
      });
    }

    // Cek pending user
    const pendingUser = await authRepository.getPendingUser(email);

    if (!pendingUser) {
      return res.status(404).json({
        success: false,
        message: "Data registrasi tidak ditemukan",
      });
    }

    // Delete old OTP
    await otpRepository.deleteOTPSession(email);

    // Generate new OTP
    const otpCode = otpService.generateOTP();

    // Create new OTP session
    await otpRepository.createOTPSession({
      email,
      phone: pendingUser.phone,
      otp_code: await bcrypt.hash(otpCode, 10),
      otp_type: "registration",
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
    });

    // Send OTP
    await emailService.sendOTPEmail(email, otpCode, pendingUser.first_name);

    res.status(200).json({
      success: true,
      message: "OTP baru telah dikirim ke email Anda",
    });
  } catch (error) {
    console.error("Error in resendOTP:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengirim ulang OTP",
      error: error.message,
    });
  }
};

/**
 * LOGIN - Login dengan email dan password
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email dan password wajib diisi",
      });
    }

    // Authenticate with Firebase Auth
    const firebaseUser = await authRepository.signInWithEmailPassword(
      email,
      password
    );

    if (!firebaseUser) {
      return res.status(401).json({
        success: false,
        message: "Email atau password salah",
      });
    }

    // Get user data from Firestore
    const user = await userRepository.getUserByUid(firebaseUser.uid);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    // Check user status
    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Akun Anda telah dinonaktifkan",
      });
    }

    // Update last login
    await userRepository.updateLastLogin(user.id);

    // Generate JWT token
    const token = jwt.sign(
      {
        user_id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.status(200).json({
      success: true,
      message: "Login berhasil",
      data: {
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          phone: user.phone,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Error in login:", error);
    res.status(500).json({
      success: false,
      message: "Gagal melakukan login",
      error: error.message,
    });
  }
};

/**
 * FORGOT PASSWORD - Request password reset
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email wajib diisi",
      });
    }

    // Check if user exists
    const user = await userRepository.getUserByEmail(email);

    if (!user) {
      // Don't reveal if email exists or not (security)
      return res.status(200).json({
        success: true,
        message:
          "Jika email terdaftar, link reset password akan dikirim ke email Anda",
      });
    }

    // Generate OTP
    const otpCode = otpService.generateOTP();

    // Create OTP session
    await otpRepository.createOTPSession({
      user_id: user.id,
      email,
      phone: user.phone,
      otp_code: await bcrypt.hash(otpCode, 10),
      otp_type: "password_reset",
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
    });

    // Send reset password email with OTP
    await emailService.sendPasswordResetEmail(email, otpCode, user.first_name);

    res.status(200).json({
      success: true,
      message: "OTP untuk reset password telah dikirim ke email Anda",
    });
  } catch (error) {
    console.error("Error in forgotPassword:", error);
    res.status(500).json({
      success: false,
      message: "Gagal memproses forgot password",
      error: error.message,
    });
  }
};

/**
 * RESET PASSWORD - Reset password dengan OTP
 */
const resetPassword = async (req, res) => {
  try {
    const { email, otp_code, new_password } = req.body;

    if (!email || !otp_code || !new_password) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP, dan password baru wajib diisi",
      });
    }

    // Validate new password length
    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password minimal 6 karakter",
      });
    }

    // Get OTP session
    const otpSession = await otpRepository.getOTPSession(
      email,
      "password_reset"
    );

    if (!otpSession) {
      return res.status(404).json({
        success: false,
        message: "OTP tidak ditemukan atau sudah expired",
      });
    }

    // Check expiry
    if (new Date() > otpSession.expires_at.toDate()) {
      return res.status(400).json({
        success: false,
        message: "OTP sudah expired",
      });
    }

    // Verify OTP
    const isValidOTP = await bcrypt.compare(otp_code, otpSession.otp_code);

    if (!isValidOTP) {
      await otpRepository.incrementOTPAttempts(otpSession.id);
      return res.status(400).json({
        success: false,
        message: "OTP tidak valid",
      });
    }

    // Get user
    const user = await userRepository.getUserByEmail(email);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    // Update password in Firebase Auth
    await authRepository.updatePassword(user.id, new_password);

    // Mark OTP as verified
    await otpRepository.markOTPAsVerified(otpSession.id);

    // Send confirmation email
    await emailService.sendPasswordChangedEmail(email, user.first_name);

    res.status(200).json({
      success: true,
      message: "Password berhasil direset",
    });
  } catch (error) {
    console.error("Error in resetPassword:", error);
    res.status(500).json({
      success: false,
      message: "Gagal reset password",
      error: error.message,
    });
  }
};

/**
 * CHANGE PASSWORD - Ganti password (untuk user yang sudah login)
 */
const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user.user_id; // From auth middleware

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: "Password lama dan baru wajib diisi",
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password baru minimal 6 karakter",
      });
    }

    // Get user
    const user = await userRepository.getUserByUid(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    // Verify current password
    const isValidPassword = await authRepository.verifyPassword(
      user.email,
      current_password
    );

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Password lama tidak sesuai",
      });
    }

    // Update password
    await authRepository.updatePassword(userId, new_password);

    // Send notification email
    await emailService.sendPasswordChangedEmail(user.email, user.first_name);

    res.status(200).json({
      success: true,
      message: "Password berhasil diubah",
    });
  } catch (error) {
    console.error("Error in changePassword:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengubah password",
      error: error.message,
    });
  }
};

/**
 * GET PROFILE - Ambil data user yang sedang login
 */
const getProfile = async (req, res) => {
  try {
    const userId = req.user.user_id; // From auth middleware

    const user = await userRepository.getUserByUid(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    // Remove sensitive data
    delete user.password;

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Error in getProfile:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil profil",
      error: error.message,
    });
  }
};

/**
 * LOGOUT - Logout user (optional: bisa hanya client-side delete token)
 */
const logout = async (req, res) => {
  try {
    // Untuk logout, biasanya cukup client menghapus token
    // Tapi bisa juga tambahkan blacklist token di server

    res.status(200).json({
      success: true,
      message: "Logout berhasil",
    });
  } catch (error) {
    console.error("Error in logout:", error);
    res.status(500).json({
      success: false,
      message: "Gagal logout",
      error: error.message,
    });
  }
};

module.exports = {
  register,
  verifyOTP,
  resendOTP,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  getProfile,
  logout,
};
