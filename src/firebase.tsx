import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
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

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
