// repositories/user.js
const { db, admin } = require("../config/firebase");

const usersCollection = db.collection("users");

/**
 * Membuat profil pengguna baru di Firestore.
 * @param {string} uid - Firebase UID, digunakan sebagai ID dokumen.
 * @param {object} userData - Data profil pengguna.
 * @returns {object} - Data pengguna yang baru dibuat.
 */
async function createUser(uid, userData) {
  const userDocRef = usersCollection.doc(uid);

  // Cek apakah user sudah ada
  const docSnapshot = await userDocRef.get();
  if (docSnapshot.exists) {
    throw new Error("Pengguna sudah terdaftar");
  }

  const dataToSave = {
    ...userData,
    role: userData.role || "user",
    status: userData.status || "active",
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  };

  await userDocRef.set(dataToSave);
  return { id: uid, ...dataToSave };
}

/**
 * Mengambil data pengguna berdasarkan UID.
 * @param {string} uid - Firebase UID/ID dokumen.
 * @returns {object | null} - Data pengguna atau null jika tidak ditemukan.
 */
async function getUserByUid(uid) {
  const doc = await usersCollection.doc(uid).get();
  if (!doc.exists) {
    return null;
  }
  return { id: doc.id, ...doc.data() };
}

/**
 * Memperbarui data profil pengguna.
 * @param {string} uid - Firebase UID/ID dokumen.
 * @param {object} updates - Data yang akan diperbarui.
 */
async function updateUser(uid, updates) {
  // Hapus fields yang seharusnya tidak diperbarui
  delete updates.role;
  delete updates.status;
  delete updates.created_at;

  updates.updated_at = admin.firestore.FieldValue.serverTimestamp();
  await usersCollection.doc(uid).update(updates);
  return { id: uid, message: "Profile pengguna berhasil diperbarui" };
}

/**
 * Menghapus profil pengguna.
 * @param {string} uid - Firebase UID/ID dokumen.
 */
async function deleteUser(uid) {
  await usersCollection.doc(uid).delete();
  return { id: uid, message: "Profile pengguna berhasil dihapus" };
}

module.exports = {
  createUser,
  getUserByUid,
  updateUser,
  deleteUser,
};
