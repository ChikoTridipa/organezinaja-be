// repositories/event.js
const { db, admin } = require("../config/firebase");

const eventsCollection = db.collection("events");
const EVENT_CATEGORIES = [
  "music",
  "sport",
  "workshop",
  "conference",
  "festival",
  "exhibition",
  "seminar",
  "competition",
  "gathering",
  "webinar",
];

/**
 * Membuat data event baru.
 * @param {object} eventData - Data event yang akan disimpan.
 * @returns {object} - Data event yang baru dibuat dengan ID.
 */
async function createEvent(eventData) {
  const dataToSave = {
    ...eventData,
    status: eventData.status || "active",
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  };

  const docRef = await eventsCollection.add(dataToSave);
  return { id: docRef.id, ...dataToSave };
}

/**
 * Mengambil semua event, opsional dengan filter kategori.
 * @param {string} [category] - Kategori untuk filter.
 * @returns {Array<object>} - Daftar event.
 */
async function getAllEvents(category) {
  let query = eventsCollection;

  if (category && EVENT_CATEGORIES.includes(category)) {
    query = query.where("category", "==", category);
  }

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Mengambil data event berdasarkan ID dokumen.
 * @param {string} id - ID dokumen event.
 * @returns {object | null} - Data event atau null.
 */
async function getEventById(id) {
  const doc = await eventsCollection.doc(id).get();
  if (!doc.exists) {
    return null;
  }
  return { id: doc.id, ...doc.data() };
}

/**
 * Memperbarui data event.
 * @param {string} id - ID dokumen event.
 * @param {object} updates - Data yang akan diperbarui.
 */
async function updateEvent(id, updates) {
  // Hapus fields yang tidak boleh diubah
  delete updates.organizer_id;
  delete updates.organizer_name;
  delete updates.created_at;

  updates.updated_at = admin.firestore.FieldValue.serverTimestamp();
  await eventsCollection.doc(id).update(updates);
  return { id, message: "Event berhasil diperbarui" };
}

/**
 * Menghapus event.
 * @param {string} id - ID dokumen event.
 */
async function deleteEvent(id) {
  await eventsCollection.doc(id).delete();
  return { id, message: "Event berhasil dihapus" };
}

module.exports = {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  EVENT_CATEGORIES,
};
