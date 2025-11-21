// repositories/ticket.js
const { db, admin } = require("../config/firebase");

const ticketsCollection = db.collection("tickets");

/**
 * Membuat data tiket baru.
 * @param {object} ticketData - Data tiket yang akan disimpan.
 * @returns {object} - Data tiket yang baru dibuat dengan ID.
 */
async function createTicket(ticketData) {
  const dataToSave = {
    ...ticketData,
    stock: ticketData.quota, // Saat dibuat, stok = kuota
    status: "available", // Default TICKET_STATUS.available
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  };

  const docRef = await ticketsCollection.add(dataToSave);
  return { id: docRef.id, ...dataToSave };
}

/**
 * Mengambil semua tiket untuk suatu event.
 * @param {string} eventId - ID dokumen event.
 * @returns {Array<object>} - Daftar tiket.
 */
async function getTicketsByEventId(eventId) {
  const snapshot = await ticketsCollection
    .where("event_id", "==", eventId)
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Mengambil data tiket berdasarkan ID dokumen.
 * @param {string} id - ID dokumen tiket.
 * @returns {object | null} - Data tiket atau null.
 */
async function getTicketById(id) {
  const doc = await ticketsCollection.doc(id).get();
  if (!doc.exists) {
    return null;
  }
  return { id: doc.id, ...doc.data() };
}

/**
 * Memperbarui data tiket.
 * @param {string} id - ID dokumen tiket.
 * @param {object} updates - Data yang akan diperbarui.
 */
async function updateTicket(id, updates) {
  // Hapus fields yang tidak boleh diubah
  delete updates.event_id;
  delete updates.created_at;

  updates.updated_at = admin.firestore.FieldValue.serverTimestamp();
  await ticketsCollection.doc(id).update(updates);
  return { id, message: "Data tiket berhasil diperbarui" };
}

/**
 * Menghapus tiket.
 * @param {string} id - ID dokumen tiket.
 */
async function deleteTicket(id) {
  await ticketsCollection.doc(id).delete();
  return { id, message: "Tiket berhasil dihapus" };
}

module.exports = {
  createTicket,
  getTicketsByEventId,
  getTicketById,
  updateTicket,
  deleteTicket,
};
