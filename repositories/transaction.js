// repositories/transaction.js
const { db, admin } = require("../config/firebase");

const transactionsCollection = db.collection("transactions");

// CREATE
async function createTransaction(transactionData) {
  const dataToSave = {
    ...transactionData,
    status: "pending", // Default status
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  };

  const docRef = await transactionsCollection.add(dataToSave);
  return { id: docRef.id, ...dataToSave };
}

// READ ONE
async function getTransactionById(id) {
  const doc = await transactionsCollection.doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

// READ BY USER
async function getTransactionsByUserId(userId) {
  const snapshot = await transactionsCollection
    .where("user_id", "==", userId)
    .orderBy("created_at", "desc")
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// UPDATE STATUS
async function updateTransactionStatus(id, status, extraData = {}) {
  const updates = {
    ...extraData,
    status: status,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  };

  await transactionsCollection.doc(id).update(updates);
  return { id, status, ...extraData };
}



module.exports = {
  createTransaction,
  getTransactionById,
  getTransactionsByUserId,
  updateTransactionStatus,
};
