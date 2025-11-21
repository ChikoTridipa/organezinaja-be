// config/firebase.js

const admin = require("firebase-admin");
const path = require("path");

try {
  const serviceAccountPath = process.env.FIREBASE_CREDENTIALS_PATH;

  if (!serviceAccountPath) {
    throw new Error("FIREBASE_CREDENTIALS_PATH tidak ditemukan di .env");
  }

  const absolutePath = path.resolve(process.cwd(), serviceAccountPath);

  const serviceAccount = require(absolutePath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  const db = admin.firestore();
  console.log("✅ Firebase Admin SDK berhasil diinisialisasi.");

  module.exports = { db, admin };
} catch (error) {
  console.error("ERROR: Gagal menginisialisasi Firebase Admin SDK.");
  console.error(error.message);
  process.exit(1);
}
