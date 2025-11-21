// repositories/organizer.js
const { db, admin } = require("../config/firebase");

const organizersCollection = db.collection("organizers");

/**
 * Membuat data organizer baru.
 * @param {object} organizerData - Data organizer yang akan disimpan.
 * @returns {object} - Data organizer yang baru dibuat dengan ID.
 */
async function createOrganizer(organizerData) {
  const dataToSave = {
    ...organizerData,
    status: organizerData.status || "pending", // Default
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Cek duplikasi menggunakan user_id (firebase_uid)
  const existing = await organizersCollection
    .where("user_id", "==", organizerData.user_id)
    .get();
  if (!existing.empty) {
    throw new Error("Pengguna ini sudah terdaftar sebagai Organizer.");
  }

  const docRef = await organizersCollection.add(dataToSave);
  return { id: docRef.id, ...dataToSave };
}

/**
 * Mengambil semua organizer.
 * @returns {Array<object>} - Daftar organizer.
 */
async function getAllOrganizers() {
  const snapshot = await organizersCollection.get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Mengambil data organizer berdasarkan ID dokumen.
 * @param {string} id - ID dokumen organizer.
 * @returns {object | null} - Data organizer atau null.
 */
async function getOrganizerById(id) {
  const doc = await organizersCollection.doc(id).get();
  if (!doc.exists) {
    return null;
  }
  return { id: doc.id, ...doc.data() };
}

/**
 * Memperbarui data organizer.
 * @param {string} id - ID dokumen organizer.
 * @param {object} updates - Data yang akan diperbarui.
 */
async function updateOrganizer(id, updates) {
  // Hapus fields yang tidak boleh diubah
  delete updates.user_id;
  delete updates.created_at;

  updates.updated_at = admin.firestore.FieldValue.serverTimestamp();
  await organizersCollection.doc(id).update(updates);
  return { id, message: "Data Organizer berhasil diperbarui" };
}

/**
 * Menghapus organizer.
 * @param {string} id - ID dokumen organizer.
 */
async function deleteOrganizer(id) {
  await organizersCollection.doc(id).delete();
  return { id, message: "Organizer berhasil dihapus" };
}

module.exports = {
  createOrganizer,
  getAllOrganizers,
  getOrganizerById,
  updateOrganizer,
  deleteOrganizer,
};
