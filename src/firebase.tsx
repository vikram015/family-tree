// Firebase configuration - DEPRECATED
// Authentication and database have been migrated to Supabase
// This file is kept for reference only

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAlac0qwYU7LzY1FOec5Ye65aobJO-9kz0",
  authDomain: "hotelmanager-c833b.firebaseapp.com",
  projectId: "hotelmanager-c833b",
  storageBucket: "hotelmanager-c833b.firebasestorage.app",
  messagingSenderId: "861889299234",
  appId: "1:861889299234:web:cc48ae401f5070b0bfdb7b",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Cloud Firestore reference (kept for potential data migration queries)
export const db = getFirestore(app);

export default app;
